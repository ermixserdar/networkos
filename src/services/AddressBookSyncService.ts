import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getDatabase} from '@/database/database';
import {ContactRepository} from '@/repositories/ContactRepository';
import {ContactsImportService,DeviceContact,deviceFields} from '@/services/ContactsImportService';
import {PhotoService} from '@/services/PhotoService';
import {ReminderPlanner} from '@/services/ReminderPlanner';
import {Contact} from '@/types';
import {normalizePhone} from '@/utils/format';

/**
 * Keeps contacts that came from the phone book up to date, one way only: the phone book is read,
 * never written. The app always wins — only a field the user left empty is filled from the device,
 * so nothing typed here is ever overwritten. New phone-book entries are not added silently; they
 * stay for the import screen to offer.
 *
 * Off by default, and it never asks for the contacts permission: only the settings toggle does.
 */
export const THROTTLE_MS=15*60_000;
const ENABLED='networkos.addressbook.enabled';
const LAST_RUN_AT='networkos.addressbook.lastRunAt';
const LAST_RUN_UPDATED='networkos.addressbook.lastRunUpdated';

/** No `Image` here: photos are fetched per contact, only for the few rows that still have none. */
const FIELDS=[
 Contacts.Fields.ID,Contacts.Fields.Emails,Contacts.Fields.PhoneNumbers,Contacts.Fields.JobTitle,
 Contacts.Fields.Addresses,Contacts.Fields.UrlAddresses,Contacts.Fields.SocialProfiles,
 Contacts.Fields.Birthday,Contacts.Fields.Dates,
] as Contacts.FieldType[];

/** The columns an automatic run may fill. Names, notes and the CRM's own signals are never touched. */
export type FillableContact=Pick<Contact,'email'|'phone'|'job_title'|'city'|'country'|'linkedin_url'|'website'|'birthday'|'photo'>;
type SyncRow=FillableContact&{id:string;device_contact_id:string|null;phone_norm:string|null};

/** Pure: proposes a value only where the app has none, so an edit here always beats the phone book. */
export function fillableFields(existing:FillableContact,device:DeviceContact):Partial<Contact>{
 const fields=deviceFields(device);
 const patch:Partial<Contact>={};
 for(const key of ['email','phone','job_title','city','country','linkedin_url','website','birthday'] as const){
  if(existing[key]||fields[key]===undefined)continue;
  (patch as Record<string,unknown>)[key]=fields[key];
 }
 // `phone_norm` is what search and duplicate detection read, so it is written with the number.
 if(patch.phone)patch.phone_norm=normalizePhone(patch.phone)??null;
 return patch;
}

/**
 * Private contacts are excluded with a literal `private=0` rather than `VaultService.clause()`:
 * the vault may happen to be open when a background run fires, and that is a coincidence, not
 * permission to feed vault contacts to an automatic job.
 */
async function syncableRows():Promise<SyncRow[]>{
 const d=await getDatabase();
 return d.getAllAsync<SyncRow>(
  `SELECT id,device_contact_id,phone_norm,email,phone,job_title,city,country,linkedin_url,website,birthday,photo
   FROM contacts WHERE deleted_at IS NULL AND private=0
   AND (device_contact_id IS NOT NULL OR phone_norm IS NOT NULL OR email IS NOT NULL)`);
}

/**
 * Every entry already spoken for, private contacts included. The unique index does not exempt
 * them, so a set built only from the syncable rows would let a run try to claim an entry a vault
 * contact still holds — and the constraint error would end the whole pass.
 */
async function claimedDeviceIds():Promise<Set<string>>{
 const d=await getDatabase();
 const rows=await d.getAllAsync<{device_contact_id:string}>('SELECT device_contact_id FROM contacts WHERE device_contact_id IS NOT NULL AND deleted_at IS NULL');
 return new Set(rows.map(row=>row.device_contact_id));
}

type DeviceIndex={byId:Map<string,DeviceContact>;byPhone:Map<string,string>;byEmail:Map<string,string>};
function indexDevice(contacts:DeviceContact[]):DeviceIndex{
 const byId=new Map<string,DeviceContact>(),byPhone=new Map<string,string>(),byEmail=new Map<string,string>();
 for(const contact of contacts){
  if(!contact.id||contact.contactType==='company')continue;
  byId.set(contact.id,contact);
  // First entry wins, so a shared office number cannot steal the link from whoever claimed it first.
  for(const phone of contact.phoneNumbers??[]){const norm=normalizePhone(phone.number);if(norm&&!byPhone.has(norm))byPhone.set(norm,contact.id)}
  for(const email of contact.emails??[]){const value=email.email?.trim().toLowerCase();if(value&&!byEmail.has(value))byEmail.set(value,contact.id)}
 }
 return {byId,byPhone,byEmail};
}

/** One phone-book read per run, matched in memory — never a lookup per contact. */
async function run():Promise<{linked:number;updated:number}>{
 const rows=await syncableRows();
 if(!rows.length)return {linked:0,updated:0};
 const result=await Contacts.getContactsAsync({fields:FIELDS});
 const index=indexDevice(result.data);
 const claimed=await claimedDeviceIds();
 let linked=0,updated=0,birthdayFilled=false;

 for(const row of rows){
  let deviceId=row.device_contact_id;
  if(!deviceId){
   const match=(row.phone_norm&&index.byPhone.get(row.phone_norm))||(row.email&&index.byEmail.get(row.email.trim().toLowerCase()))||null;
   // One app contact per phone-book entry: the unique index would reject a second claim anyway.
   if(!match||claimed.has(match))continue;
   // Losing the claim to someone else is not a reason to abandon everyone further down the list.
   const claimedIt=await ContactRepository.linkDevice(row.id,match).then(()=>true).catch(()=>false);
   if(!claimedIt)continue;
   claimed.add(match);
   deviceId=match;
   linked++;
  }
  const device=index.byId.get(deviceId);
  // Gone from the phone book, or outside a limited-access selection: leave the contact alone.
  if(!device)continue;
  const patch=fillableFields(row,device);
  if(!row.photo){
   const full=await Contacts.getContactByIdAsync(deviceId,[Contacts.Fields.Image]).catch(()=>null);
   const uri=full?.image?.uri;
   if(uri){const thumbnail=await PhotoService.thumbnail(uri).catch(()=>null);if(thumbnail)patch.photo=thumbnail}
  }
  if(!Object.keys(patch).length)continue;
  if(patch.birthday)birthdayFilled=true;
  await ContactRepository.patch(row.id,patch);
  updated++;
 }
 // A filled birthday is a reminder nobody scheduled yet.
 if(birthdayFilled)await ReminderPlanner.reconcile();
 return {linked,updated};
}

let running=false;

export const AddressBookSyncService={
 fillableFields,
 isEnabled:async()=>(await AsyncStorage.getItem(ENABLED))==='1',
 /** The one place this feature may prompt for contacts access — and only to turn it on. */
 setEnabled:async(enabled:boolean)=>{
  if(!enabled){await AsyncStorage.setItem(ENABLED,'0');return true}
  if(!(await ContactsImportService.requestPermission()))return false;
  await AsyncStorage.setItem(ENABLED,'1');
  await AddressBookSyncService.reconcile({force:true});
  return true;
 },
 lastRun:async()=>{
  const [at,updated]=await Promise.all([AsyncStorage.getItem(LAST_RUN_AT),AsyncStorage.getItem(LAST_RUN_UPDATED)]);
  return {at:Number(at)||null,updated:Number(updated)||0};
 },
 /** Lets the user widen an iOS limited-access selection, then picks up whatever was added. */
 presentAccessPicker:async()=>{
  await Contacts.presentAccessPickerAsync().catch(()=>{});
  return AddressBookSyncService.reconcile({force:true});
 },
 /** Fires on every phone-book edit; `reconcile` decides whether that means any work. */
 attach:()=>Contacts.addContactsChangeListener(()=>{void AddressBookSyncService.reconcile()}),
 /**
  * The single entry point for every trigger. Returns null when it decided to do nothing, which is
  * the common case: disabled, inside the throttle window, without permission, or already running.
  */
 reconcile:async({force=false}:{force?:boolean}={})=>{
  if(running)return null;
  running=true;
  try{
   if(!(await AddressBookSyncService.isEnabled()))return null;
   const now=Date.now();
   const last=Number(await AsyncStorage.getItem(LAST_RUN_AT))||0;
   if(!force&&now-last<THROTTLE_MS)return null;
   const permission=await Contacts.getPermissionsAsync().catch(()=>null);
   // Never `requestPermissionsAsync` here: a background run must not raise a system prompt.
   if(!permission||!(permission.granted||permission.accessPrivileges==='limited'))return null;
   // Stamped before the work so a slow run cannot be entered twice by two triggers.
   await AsyncStorage.setItem(LAST_RUN_AT,String(now));
   // Nothing here is worth crashing a foreground for: the run is silent, and the settings screen
   // shows a count that simply stops moving if something is wrong.
   const outcome=await run().catch(()=>null);
   if(outcome)await AsyncStorage.setItem(LAST_RUN_UPDATED,String(outcome.updated));
   return outcome;
  }finally{running=false}
 },
};
