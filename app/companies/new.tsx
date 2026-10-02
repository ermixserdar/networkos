import {useCallback,useState} from 'react';
import {useLocalSearchParams} from 'expo-router';
import {CompanyRepository} from '@/repositories/CompanyRepository';
import {BackLink,Btn,Field,ScreenScroll,Subtitle,Title,useFocusRefresh,useGoBack} from '@/components/ui';
import {companyNameFromWebsite} from '@/utils/autofill';
import {useTranslation} from '@/i18n';

/** Doubles as the edit form when an `id` is supplied. */
export default function CompanyForm(){
 const {id}=useLocalSearchParams<{id?:string}>();
 const goBack=useGoBack('/companies');
 const {t}=useTranslation();
  const [form,setForm]=useState({name:'',industry:'',city:'',country:'',website:'',description:''});
  const [saving,setSaving]=useState(false);
  const set=(key:keyof typeof form)=>(value:string)=>setForm(current=>({...current,[key]:value}));
  /** The domain usually is the name: prefill it while the name is still empty. */
  const onWebsite=(value:string)=>{
   setForm(current=>{
    if(current.name.trim())return {...current,website:value};
    return {...current,website:value,name:companyNameFromWebsite(value)??''};
   });
  };

 useFocusRefresh(useCallback(async()=>{
  if(!id)return;
  const company=await CompanyRepository.get(id);
  if(company)setForm({name:company.name,industry:company.industry??'',city:company.city??'',country:company.country??'',website:company.website??'',description:company.description??''});
 },[id]));

 const save=async()=>{
  if(!form.name.trim())return;
  setSaving(true);
  try{await CompanyRepository.save({id,...form});goBack()}
  finally{setSaving(false)}
 };

 return <ScreenScroll>
  <BackLink label={t('backCompanies')} onPress={goBack}/>
  <Title>{id?t('editCompany'):t('addCompany')}</Title>
  <Subtitle>{t('companySubtitle')}</Subtitle>
  <Field label={t('companyName')} value={form.name} onChangeText={set('name')} autoCapitalize="words"/>
  <Field label={t('industryLabel')} value={form.industry} onChangeText={set('industry')}/>
  <Field label={t('cityLabel')} value={form.city} onChangeText={set('city')}/>
  <Field label={t('countryLabel')} value={form.country} onChangeText={set('country')}/>
  <Field label={t('websiteLabel')} value={form.website} onChangeText={onWebsite} autoCapitalize="none" keyboardType="url"/>
  <Field label={t('descriptionLabel')} value={form.description} onChangeText={set('description')} multiline style={{minHeight:100,textAlignVertical:'top'}}/>
  <Btn label={t('saveCompany')} busy={saving} disabled={!form.name.trim()} onPress={()=>void save()}/>
 </ScreenScroll>;
}
