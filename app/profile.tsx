import {useCallback,useState} from 'react';
import {useRouter} from 'expo-router';
import {Owner,OwnerRepository} from '@/repositories/OwnerRepository';
import {BackLink,Btn,Field,ScreenScroll,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTranslation} from '@/i18n';

export default function Profile(){
 const router=useRouter();
 const {t}=useTranslation();
 const [owner,setOwner]=useState<Owner|null>(null);
 const [form,setForm]=useState({first:'',last:'',role:'',company:'',email:'',phone:''});
 const [saving,setSaving]=useState(false);
 const set=(key:keyof typeof form)=>(value:string)=>setForm(current=>({...current,[key]:value}));

 useFocusRefresh(useCallback(async()=>{
  const current=await OwnerRepository.get();
  if(!current)return;
  setOwner(current);
  setForm({first:current.first_name,last:current.last_name??'',role:current.job_title??'',company:current.company??'',email:current.email??'',phone:current.phone??''});
 },[]));

 const save=async()=>{
  setSaving(true);
  try{
   await OwnerRepository.save({id:owner?.id,first_name:form.first.trim(),last_name:form.last.trim(),job_title:form.role.trim(),company:form.company.trim(),email:form.email.trim(),phone:form.phone.trim()});
   router.back();
  }finally{setSaving(false)}
 };

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('profileTitle')}</Title>
  <Subtitle>{t('profileSubtitle')}</Subtitle>
  <Field label={t('firstNameLabel')} value={form.first} onChangeText={set('first')} autoCapitalize="words"/>
  <Field label={t('lastNameLabel')} value={form.last} onChangeText={set('last')} autoCapitalize="words"/>
  <Field label={t('jobTitleLabel')} value={form.role} onChangeText={set('role')}/>
  <Field label={t('companyLabel')} value={form.company} onChangeText={set('company')}/>
  <Field label={t('emailLabel')} value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address"/>
  <Field label={t('phoneLabel')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad"/>
  <Btn label={t('saveProfile')} busy={saving} disabled={!form.first.trim()} onPress={()=>void save()} style={{marginTop:8}}/>
 </ScreenScroll>;
}
