import {useCallback,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Company} from '@/types';
import {ContactRepository} from '@/repositories/ContactRepository';
import {CompanyRepository} from '@/repositories/CompanyRepository';
import {ReminderPlanner} from '@/services/ReminderPlanner';
import {PhotoService} from '@/services/PhotoService';
import {PHONE_CONTACTS_SOURCE,howWeMetText} from '@/services/ContactsImportService';
import {companyIdForEmail,countryForPhone,normalizeEmail} from '@/utils/autofill';
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
 const {id}=useLocalSearchParams<{id?:string}>();
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
  const set=<K extends keyof FormState>(key:K)=>(value:FormState[K])=>setForm(current=>({...current,[key]:value}));

  /** A work email usually names the employer: pre-select the matching company chip. */
  const onEmail=(value:string)=>{
   set('email')(value);
   if(companyTouched.current)return;
   const match=companyIdForEmail(value,companies);
   if(match){autoCompanyId.current=match;set('companyId')(match)}
   else if(autoCompanyId.current){autoCompanyId.current=null;set('companyId')(undefined)}
  };
  const pickCompany=(companyId?:string)=>{companyTouched.current=true;set('companyId')(companyId)};

  /** An international dial code names the country; only fills an empty field. */
  const onPhone=(value:string)=>{
   set('phone')(value);
   if(countryTouched.current||form.country.trim())return;
   const guess=countryForPhone(value,language);
   if(guess)set('country')(guess);
  };

  useFocusRefresh(useCallback(async()=>{
   setCompanies(await CompanyRepository.list());
   if(!id){
    // A new person was usually met today; starting there beats typing the date.
    setForm(current=>current.metDate?current:{...current,metDate:toDateInput(Date.now())});
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
 },[id,t]));

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
   const email=normalizeEmail(form.email);
   const phone=form.phone.trim()||null;
   // Same email or phone usually means a re-typed person, not a new one: offer the
   // existing profile before a duplicate is born.
   if(email||phone){
    const existing=await ContactRepository.findByPhoneOrEmail(phone,email);
    if(existing&&existing.id!==id){
     const name=existing.display_name||`${existing.first_name} ${existing.last_name??''}`.trim();
     Alert.alert(t('duplicateTitle'),t('duplicateBody',name),[
      {text:t('cancel'),style:'cancel'},
      {text:t('openPerson'),onPress:()=>router.replace(`/contacts/${existing.id}` as never)},
      {text:t('saveAnyway'),onPress:()=>void persist(email,phone,birthday,metDate)},
     ]);
     return;
    }
   }
   await persist(email,phone,birthday,metDate);
  };

  const persist=async(email:string|null,phone:string|null,birthday:number|null,metDate:number|null)=>{
   setSaving(true);
   try{
    const display=[form.first.trim(),form.last.trim()].filter(Boolean).join(' ');
    await ContactRepository.save({
     id,first_name:form.first.trim(),last_name:form.last.trim()||null,display_name:display,job_title:form.role.trim()||null,
     company_id:form.companyId??null,email,phone,
     city:form.city.trim()||null,country:form.country.trim()||null,linkedin_url:form.linkedin.trim()||null,
    birthday,met_at:form.metAt.trim()||null,met_date:metDate,how_we_met:form.howWeMet.trim()===t('importedFromPhone')?PHONE_CONTACTS_SOURCE:form.howWeMet.trim()||null,
    notes:form.notes.trim()||null,relationship_strength:form.strength,importance:form.importance,
    favorite:form.favorite?1:0,cadence_days:form.cadence,photo:form.photo,private:form.isPrivate?1:0,
   });
   await ReminderPlanner.reconcile();
   router.back();
  }finally{setSaving(false)}
 };

 return <ScreenScroll>
  <BackLink label={t('back')} onPress={()=>router.back()}/>
  <Title>{id?t('editPerson'):t('addPerson')}</Title>
  <Subtitle>{id?t('editPersonSubtitle'):t('addPersonSubtitle')}</Subtitle>

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
   <Chip label={t('addCompany')} onPress={()=>router.push('/companies/new' as never)}/>
  </ScrollView>

  <SectionLabel>{t('reachSection').toUpperCase()}</SectionLabel>
  <Field label={t('emailLabel')} value={form.email} onChangeText={onEmail} autoCapitalize="none" keyboardType="email-address"/>
  <Field label={t('phoneLabel')} value={form.phone} onChangeText={onPhone} keyboardType="phone-pad"/>
  <Field label={t('linkedinLabel')} value={form.linkedin} onChangeText={set('linkedin')} autoCapitalize="none" keyboardType="url"/>
  <Field label={t('cityLabel')} value={form.city} onChangeText={set('city')}/>
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
