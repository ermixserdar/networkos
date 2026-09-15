import {Platform} from 'react-native';
import * as Contacts from 'expo-contacts';
import {getDatabase} from '@/database/database';
import {ContactRepository} from '@/repositories/ContactRepository';
import {CompanyRepository} from '@/repositories/CompanyRepository';
import {ReminderPlanner} from '@/services/ReminderPlanner';
import {PhotoService} from '@/services/PhotoService';
import {TranslationKey,translate} from '@/i18n';
import {useAppStore} from '@/stores/useAppStore';

export type DeviceContact=Contacts.ExistingContact;
/**
 * `Fields.Note` is Android-only: on iOS 13+ asking for the note key without Apple's
 * `com.apple.developer.contacts.notes` entitlement fails the whole fetch with "Unauthorized Keys",
 * so not a single contact could be listed.
 */
const fields=[...(Platform.OS==='android'?[Contacts.Fields.Note]:[]),Contacts.Fields.ID,Contacts.Fields.Name,Contacts.Fields.FirstName,Contacts.Fields.MiddleName,Contacts.Fields.LastName,Contacts.Fields.MaidenName,Contacts.Fields.NamePrefix,Contacts.Fields.NameSuffix,Contacts.Fields.Nickname,Contacts.Fields.Company,Contacts.Fields.JobTitle,Contacts.Fields.Department,Contacts.Fields.Birthday,Contacts.Fields.Dates,Contacts.Fields.Relationships,Contacts.Fields.Emails,Contacts.Fields.PhoneNumbers,Contacts.Fields.Addresses,Contacts.Fields.InstantMessageAddresses,Contacts.Fields.UrlAddresses,Contacts.Fields.SocialProfiles,Contacts.Fields.IsFavorite,Contacts.Fields.Image] as Contacts.FieldType[];

export const clean=(value?:string|null)=>value?.trim()||undefined;
export const primary=<T extends {isPrimary?:boolean}>(items?:T[])=>items?.find(x=>x.isPrimary)||items?.[0];

/** iOS birthdays often omit the year; anchor those to 1904 so the day/month still work. */
export function birthdayOf(c:DeviceContact){
 const source=c.birthday??c.dates?.find(d=>d.label?.toLowerCase().includes('birth'));
 if(!source||source.month===undefined||source.day===undefined)return undefined;
 return new Date(source.year??1904,source.month,source.day,12,0,0,0).getTime();
}
export function linkedinOf(c:DeviceContact){
 const social=c.socialProfiles?.find(p=>p.service?.toLowerCase().includes('linkedin'));
 if(social?.url)return social.url;
 if(social?.username)return `https://www.linkedin.com/in/${social.username}`;
 return c.urlAddresses?.find(u=>u.url?.toLowerCase().includes('linkedin.com'))?.url;
}
export const websiteOf=(c:DeviceContact)=>c.urlAddresses?.find(u=>u.url&&!u.url.toLowerCase().includes('linkedin.com'))?.url;

/**
 * The one place a phone-book entry becomes app-shaped fields. Both the manual import and the
 * automatic refresh read it, so a field added here cannot be forgotten by one of them.
 */
export function deviceFields(c:DeviceContact){
 const address=c.addresses?.[0];
 return {
  email:clean(primary(c.emails)?.email),
  phone:clean(primary(c.phoneNumbers)?.number),
  job_title:clean(c.jobTitle),
  city:clean(address?.city),
  country:clean(address?.country),
  linkedin_url:linkedinOf(c),
  website:websiteOf(c),
  birthday:birthdayOf(c),
 };
}

/** Stored as-is so it stays stable across language switches; screens translate it on display. */
export const PHONE_CONTACTS_SOURCE='Phone contacts';
const t=()=>translate(useAppStore.getState().language);
/** The import marker in whatever language the app is showing right now. */
export const howWeMetText=(value:string|null|undefined,label:(key:TranslationKey)=>string)=>value===PHONE_CONTACTS_SOURCE?label('importedFromPhone'):value??'';

/** Anything without a column of its own is appended as readable lines, not a JSON blob. */
function extraNotes(c:DeviceContact){
 const label=t();
 const lines:string[]=[];
 if(clean(c.note))lines.push(c.note!.trim());
 if(clean(c.nickname))lines.push(`${label('importNickname')}: ${c.nickname!.trim()}`);
 if(clean(c.department))lines.push(`${label('importDepartment')}: ${c.department!.trim()}`);
 for(const email of c.emails?.slice(1)??[])if(email.email)lines.push(`${label('emailLabel')}: ${email.email}`);
 for(const phone of c.phoneNumbers?.slice(1)??[])if(phone.number)lines.push(`${label('phoneLabel')}: ${phone.number}`);
 for(const relation of c.relationships??[])if(relation.name)lines.push(`${relation.label??label('importRelated')}: ${relation.name}`);
 return lines.length?lines.join('\n'):undefined;
}

export const ContactsImportService={
 /** Which phone-book entries are already represented here — drives the import screen's pre-selection. */
 linkedDeviceIds:async()=>{
  const d=await getDatabase();
  const rows=await d.getAllAsync<{device_contact_id:string}>('SELECT device_contact_id FROM contacts WHERE device_contact_id IS NOT NULL AND deleted_at IS NULL');
  return new Set(rows.map(row=>row.device_contact_id));
 },
 requestPermission:async()=>{const result=await Contacts.requestPermissionsAsync();return result.granted||result.accessPrivileges==='limited'},
 list:async()=>{const result=await Contacts.getContactsAsync({fields});return result.data.filter(c=>c.contactType!=='company'&&(clean(c.firstName)||clean(c.lastName)||clean(c.name)))},
 import:async(contacts:DeviceContact[])=>{
  let imported=0,skipped=0;
  for(const c of contacts){
   const fields=deviceFields(c);
   const existing=await ContactRepository.findByPhoneOrEmail(fields.phone,fields.email);
   if(existing){
    // Already here under another route: claim the phone-book entry anyway, so later refreshes find it.
    if(c.id&&!existing.device_contact_id)await ContactRepository.linkDevice(existing.id,c.id).catch(()=>{});
    skipped++;continue;
   }
   const first=clean(c.firstName)||clean(c.name)||t()('importUnknownName');
   const last=clean(c.lastName);
   let company_id:string|undefined;
   if(clean(c.company)){const company=await CompanyRepository.findByName(c.company!);company_id=company?.id??await CompanyRepository.save({name:c.company!.trim()})}
   const display_name=clean(c.name)||[first,last].filter(Boolean).join(' ');
   // The phone already has a face for this person; not carrying it over was pure loss.
   const photo=c.image?.uri?await PhotoService.thumbnail(c.image.uri).catch(()=>null):null;
   const id=await ContactRepository.save({
    ...fields,first_name:first,last_name:last,display_name,company_id,
    photo,notes:extraNotes(c),how_we_met:PHONE_CONTACTS_SOURCE,favorite:c.isFavorite?1:0,
   });
   if(c.id)await ContactRepository.linkDevice(id,c.id).catch(()=>{});
   imported++;
  }
  // One pass at the end: scheduling per contact would blow past the platform budget on a big import.
  await ReminderPlanner.reconcile();
  return {imported,skipped};
 },
};
