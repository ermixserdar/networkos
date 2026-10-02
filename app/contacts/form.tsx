import {useCallback,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {Company} from '@/types';
import {ContactRepository} from '@/repositories/ContactRepository';
import {CompanyRepository} from '@/repositories/CompanyRepository';
import {EventRepository} from '@/repositories/EventRepository';
import {FollowUpService} from '@/services/FollowUpService';
import {ReminderPlanner} from '@/services/ReminderPlanner';
import {PhotoService} from '@/services/PhotoService';
import {PHONE_CONTACTS_SOURCE,howWeMetText} from '@/services/ContactsImportService';
import {cityForPhone,companyIdForEmail,companyNameFromWebsite,countryForPhone,emailDomain,nameFromEmail,nameFromSlug,normalizeEmail,parseContactBlock} from '@/utils/autofill';
import {useAppStore} from '@/stores/useAppStore';
import {Avatar} from '@/components/Avatar';
import {BackLink,Btn,Chip,Field,Rating,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {parseDateInput,toDateInput} from '@/utils/format';
import {useTranslation} from '@/i18n';

type FormState={
 first:string;last:string;role:string;companyId?:string;email:string;phone:string;city:string;country:string;
 linkedin:string;birthday:string;metAt:string;metDate:string;howWeMet:string;notes:string;
 strength:number;importance:number;favorite:boolean;cadence:number|null;photo:string|null;isPrivate:boolean;
};
const BLANK:FormState={first:'',last:'',role:'',email:'',phone:'',city:'',country:'',linkedin:'',birthday:'',metAt:'',metDate:'',howWeMet:'',notes:'',strength:3,importance:3,favorite:false,cadence:null,photo:null,isPrivate:false};
const CADENCES=[30,90,180] as const;

/** One screen for both creating and editing — the app previously had no way to edit at all. */
export default function ContactForm(){
 const {id,eventId}=useLocalSearchParams<{id?:string;eventId?:string}>();
 const router=useRouter();
  const {t,language}=useTranslation();
  const {c}=useTheme();
  const [form,setForm]=useState<FormState>(BLANK);
  const [companies,setCompanies]=useState<Company[]>([]);
  const [saving,setSaving]=useState(false);
  // Auto-guesses stop the moment the user chooses by hand — they assist, never override.
  const companyTouched=useRef(false);
  const autoCompanyId=useRef<string|null>(null);
  const countryTouched=useRef(false);
  const cityTouched=useRef(false);
  const eventPrefilled=useRef(false);
  const showToast=useAppStore(s=>s.showToast);
  const set=<K extends keyof FormState>(key:K)=>(value:FormState[K])=>setForm(current=>({...current,[key]:value}));

  /** A work email usually names both the employer and the person behind it. */
  const onEmail=(value:string)=>{
   set('email')(value);
   if(!form.first.trim()&&!form.last.trim()){
    const guessed=nameFromEmail(value);
    if(guessed){set('first')(guessed.first);set('last')(guessed.last)}
   }
   if(companyTouched.current)return;
   const match=companyIdForEmail(value,companies);
   if(match){autoCompanyId.current=match;set('companyId')(match)}
   else if(autoCompanyId.current){autoCompanyId.current=null;set('companyId')(undefined)}
  };
  /** A LinkedIn slug is usually `name-surname`: worth a name guess while empty. */
  const onLinkedin=(value:string)=>{
   set('linkedin')(value);
   if(form.first.trim()||form.last.trim())return;
   const slug=value.match(/linkedin\.com\/in\/([\w-]+)/i)?.[1];
   if(!slug)return;
   const guessed=nameFromSlug(slug);
   if(guessed){set('first')(guessed.first);set('last')(guessed.last)}
  };
  const pickCompany=(companyId?:string)=>{
   companyTouched.current=true;set('companyId')(companyId);
   // The employer's city and country are usually the person's too.
   const company=companies.find(item=>item.id===companyId);
   if(company){
    if(!form.city.trim()&&company.city)set('city')(company.city);
    if(!form.country.trim()&&company.country)set('country')(company.country);
   }
  };
  /** One tap turns an unknown email domain into a company instead of a dead end. */
  const createCompanyFromDomain=async(domain:string)=>{
   companyTouched.current=true;
   const companyId=await CompanyRepository.save({name:companyNameFromWebsite(domain)??domain,website:`https://${domain}`});
   setCompanies(await CompanyRepository.list());
   autoCompanyId.current=null;
   set('companyId')(companyId);
  };

  /** A pasted signature block fills every field that is still empty, nothing more. */
  const fillFromClipboard=async()=>{
   let text='';
   try{text=await Clipboard.getStringAsync()}catch{/* unreachable clipboard reads as empty */}
   const guess=parseContactBlock(text);
   if(!guess.first&&!guess.email&&!guess.phone&&!guess.linkedin){showToast({message:t('pasteNothing')});return}
   const filled:string[]=[];
   setForm(current=>{
    const next={...current};
    const take=(key:'first'|'last'|'role'|'email'|'phone'|'linkedin',value?:string,label?:string)=>{
     if(value&&!next[key].trim()){next[key]=value;filled.push(label??key)}
    };
    take('first',guess.first,t('firstNameLabel'));take('last',guess.last,t('lastNameLabel'));
    take('role',guess.jobTitle,t('jobTitleLabel'));
    take('email',guess.email,t('emailLabel'));take('phone',guess.phone,t('phoneLabel'));
    take('linkedin',guess.linkedin,t('linkedinLabel'));
    return next;
   });
   if(!companyTouched.current){
    const byName=guess.companyName?companies.find(item=>item.name.trim().toLocaleLowerCase()===guess.companyName!.trim().toLocaleLowerCase())?.id??null:null;
    const match=byName??companyIdForEmail(guess.email??'',companies);
    if(match){autoCompanyId.current=match;set('companyId')(match);filled.push(t('companyLabel'))}
   }
   if(!countryTouched.current&&guess.phone){
    const country=countryForPhone(guess.phone,language);
    if(country){setForm(current=>current.country.trim()?current:{...current,country});filled.push(t('countryLabel'))}
   }
   showToast({message:t('pasteFilled',[...new Set(filled)].join(', '))});
  };

  /** An international dial code names the country, a landline the city — both only when empty. */
  const onPhone=(value:string)=>{
   set('phone')(value);
   if(!countryTouched.current&&!form.country.trim()){
    const guess=countryForPhone(value,language);
    if(guess)set('country')(guess);
   }
   if(!cityTouched.current&&!form.city.trim()){
    const city=cityForPhone(value);
    if(city)set('city')(city);
   }
  };

  useFocusRefresh(useCallback(async()=>{
   setCompanies(await CompanyRepository.list());
   if(!id){
    // A new person was usually met today; starting there beats typing the date.
    setForm(current=>current.metDate?current:{...current,metDate:toDateInput(Date.now())});
    // Arriving from an event means the where and when are already known.
    if(eventId&&!eventPrefilled.current){
     eventPrefilled.current=true;
     const event=await EventRepository.get(eventId);
     if(event)setForm(current=>({
      ...current,
      metAt:current.metAt||event.location||'',
      metDate:toDateInput(event.event_at),
      howWeMet:current.howWeMet||event.name,
     }));
    }
    return;
   }
  const contact=await ContactRepository.get(id);
  if(!contact)return;
  setForm({
   first:contact.first_name,last:contact.last_name??'',role:contact.job_title??'',companyId:contact.company_id??undefined,
   email:contact.email??'',phone:contact.phone??'',city:contact.city??'',country:contact.country??'',
   linkedin:contact.linkedin_url??'',birthday:toDateInput(contact.birthday),metAt:contact.met_at??'',
   metDate:toDateInput(contact.met_date),howWeMet:howWeMetText(contact.how_we_met,t),notes:contact.notes??'',
    strength:contact.relationship_strength,importance:contact.importance,favorite:Boolean(contact.favorite),cadence:contact.cadence_days??null,
    photo:contact.photo??null,isPrivate:Boolean(contact.private),
   });
  },[id,eventId,t]));

 const choosePhoto=()=>Alert.alert(t('photoLabel'),undefined,[
  {text:t('photoLibrary'),onPress:()=>void applyPhoto(PhotoService.pick())},
  {text:t('photoCamera'),onPress:()=>void applyPhoto(PhotoService.capture())},
  {text:t('cancel'),style:'cancel'},
 ]);
 const applyPhoto=async(source:Promise<string|null>)=>{
  try{
   const photo=await source;
   if(photo)set('photo')(photo);
   else Alert.alert(t('photoTooLarge'));
  }catch{Alert.alert(t('photoPermission'))}
 };

  const save=async()=>{
   if(!form.first.trim()){Alert.alert(t('firstNameRequired'));return}
   const birthday=form.birthday.trim()?parseDateInput(form.birthday):null;
   const metDate=form.metDate.trim()?parseDateInput(form.metDate):null;
   if((form.birthday.trim()&&birthday===null)||(form.metDate.trim()&&metDate===null)){Alert.alert(t('invalidDate'));return}
   // Contact channels hiding in the notes join their empty fields instead of staying buried.
   const noteGuess=form.notes.trim()?parseContactBlock(form.notes):{};
   const email=normalizeEmail(form.email)||normalizeEmail(noteGuess.email);
   const phone=form.phone.trim()||noteGuess.phone?.trim()||null;
   const linkedin=form.linkedin.trim()||noteGuess.linkedin?.trim()||null;
   if(email!==normalizeEmail(form.email)||phone!==(form.phone.trim()||null)||linkedin!==(form.linkedin.trim()||null))
    setForm(current=>({...current,email:email??'',phone:phone??'',linkedin:linkedin??''}));
   // Same email or phone usually means a re-typed person, not a new one: offer the
   // existing profile before a duplicate is born.
   if(email||phone){
    const existing=await ContactRepository.findByPhoneOrEmail(phone,email);
    if(existing&&existing.id!==id){
     const name=existing.display_name||`${existing.first_name} ${existing.last_name??''}`.trim();
     Alert.alert(t('duplicateTitle'),t('duplicateBody',name),[
      {text:t('cancel'),style:'cancel'},
      {text:t('openPerson'),onPress:()=>router.replace(`/contacts/${existing.id}` as never)},
      {text:t('saveAnyway'),onPress:()=>void persist(email,phone,linkedin,birthday,metDate)},
     ]);
     return;
    }
   }
   await persist(email,phone,linkedin,birthday,metDate);
  };

  const persist=async(email:string|null,phone:string|null,linkedin:string|null,birthday:number|null,metDate:number|null)=>{
   setSaving(true);
   try{
    const display=[form.first.trim(),form.last.trim()].filter(Boolean).join(' ');
    const contactId=await ContactRepository.save({
     id,first_name:form.first.trim(),last_name:form.last.trim()||null,display_name:display,job_title:form.role.trim()||null,
     company_id:form.companyId??null,email,phone,
     city:form.city.trim()||null,country:form.country.trim()||null,linkedin_url:linkedin,
    birthday,met_at:form.metAt.trim()||null,met_date:metDate,how_we_met:form.howWeMet.trim()===t('importedFromPhone')?PHONE_CONTACTS_SOURCE:form.howWeMet.trim()||null,
     notes:form.notes.trim()||null,relationship_strength:form.strength,importance:form.importance,
     favorite:form.favorite?1:0,cadence_days:form.cadence,photo:form.photo,private:form.isPrivate?1:0,
    });
    // A rhythm without a first date never starts ticking: book it from today.
    if(!id&&form.cadence)await FollowUpService.set(contactId,Date.now()+form.cadence*86400000);
    // Met at an event, filed at an event: join the attendee list without a second trip.
    if(!id&&eventId){
     const people=await EventRepository.attendees(eventId);
     await EventRepository.setAttendees(eventId,[...people.map(person=>person.id),contactId]);
    }
    await ReminderPlanner.reconcile();
    router.back();
  }finally{setSaving(false)}
 };

  // A pasted signature block usually beats typing; the button only fills empty fields.
  const emailDom=emailDomain(form.email);
  const domainSuggestion=!form.companyId&&emailDom&&!companyIdForEmail(form.email,companies)?emailDom:null;

  return <ScreenScroll>
   <BackLink label={t('back')} onPress={()=>router.back()}/>
   <Title>{id?t('editPerson'):t('addPerson')}</Title>
   <Subtitle>{id?t('editPersonSubtitle'):t('addPersonSubtitle')}</Subtitle>
   {!id?<Btn label={t('pasteFill')} variant="ghost" icon="clipboard-outline" onPress={()=>void fillFromClipboard()} style={{marginBottom:16}}/>:null}

  <View style={{flexDirection:'row',alignItems:'center',gap:16,marginBottom:20}}>
   <Pressable accessibilityRole="button" accessibilityLabel={form.photo?t('changePhoto'):t('addPhoto')} onPress={choosePhoto}>
    <Avatar name={[form.first,form.last].filter(Boolean).join(' ')||'?'} size={72} photo={form.photo}/>
   </Pressable>
   <View style={{flex:1,gap:8}}>
    <Btn label={form.photo?t('changePhoto'):t('addPhoto')} variant="ghost" icon="camera-outline" onPress={choosePhoto}/>
    {form.photo?<Btn label={t('removePhoto')} variant="outline" onPress={()=>set('photo')(null)}/>:null}
   </View>
  </View>

  <SectionLabel>{t('basicsSection').toUpperCase()}</SectionLabel>
  <Field label={t('firstNameLabel')} value={form.first} onChangeText={set('first')} autoCapitalize="words"/>
  <Field label={t('lastNameLabel')} value={form.last} onChangeText={set('last')} autoCapitalize="words"/>
  <Field label={t('jobTitleLabel')} value={form.role} onChangeText={set('role')}/>

  <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginBottom:8}}>{t('companyLabel')}</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:4}} style={{marginBottom:14}}>
   <Chip label={t('noCompany')} selected={!form.companyId} onPress={()=>pickCompany(undefined)}/>
   {companies.map(company=><Chip key={company.id} label={company.name} selected={form.companyId===company.id} onPress={()=>pickCompany(company.id)}/>)}
   {domainSuggestion?<Chip label={t('createCompany',domainSuggestion)} onPress={()=>void createCompanyFromDomain(domainSuggestion)}/>:null}
   <Chip label={t('addCompany')} onPress={()=>router.push('/companies/new' as never)}/>
  </ScrollView>

  <SectionLabel>{t('reachSection').toUpperCase()}</SectionLabel>
  <Field label={t('emailLabel')} value={form.email} onChangeText={onEmail} autoCapitalize="none" keyboardType="email-address"/>
  <Field label={t('phoneLabel')} value={form.phone} onChangeText={onPhone} keyboardType="phone-pad"/>
  <Field label={t('linkedinLabel')} value={form.linkedin} onChangeText={onLinkedin} autoCapitalize="none" keyboardType="url"/>
  <Field label={t('cityLabel')} value={form.city} onChangeText={value=>{cityTouched.current=true;set('city')(value)}}/>
  <Field label={t('countryLabel')} value={form.country} onChangeText={value=>{countryTouched.current=true;set('country')(value)}}/>

  <SectionLabel>{t('contextFormSection').toUpperCase()}</SectionLabel>
  <Field label={t('birthdayLabel')} hint={t('dateHint')} value={form.birthday} onChangeText={set('birthday')} keyboardType="numbers-and-punctuation" autoCapitalize="none"/>
  <Field label={t('howWeMetLabel')} value={form.howWeMet} onChangeText={set('howWeMet')}/>
  <Field label={t('metAtLabel')} value={form.metAt} onChangeText={set('metAt')}/>
  <Field label={t('metDateLabel')} hint={t('dateHint')} value={form.metDate} onChangeText={set('metDate')} keyboardType="numbers-and-punctuation" autoCapitalize="none"/>
  <Field label={t('notesLabel')} value={form.notes} onChangeText={set('notes')} multiline style={{minHeight:110,textAlignVertical:'top'}}/>

  <SectionLabel>{t('ratingSection').toUpperCase()}</SectionLabel>
  <Rating label={t('strengthLabel')} value={form.strength} onChange={set('strength')}/>
  <Rating label={t('importanceLabel')} value={form.importance} onChange={set('importance')}/>
  <View style={{flexDirection:'row',gap:8,marginBottom:14,flexWrap:'wrap'}}>
   <Chip label={t('favoriteLabel')} selected={form.favorite} onPress={()=>set('favorite')(!form.favorite)}/>
   <Chip label={t('privateLabel')} selected={form.isPrivate} onPress={()=>set('isPrivate')(!form.isPrivate)}/>
   {CADENCES.map(days=><Chip key={days} label={t('cadenceEvery',days)} selected={form.cadence===days} onPress={()=>set('cadence')(form.cadence===days?null:days)}/>)}
  </View>

  {form.isPrivate?<Text style={{color:c.muted,lineHeight:20,marginBottom:14}}>{t('privateHint')}</Text>:null}

  <Btn label={t('savePerson')} busy={saving} onPress={()=>void save()} style={{marginTop:6}}/>
 </ScreenScroll>;
}
