import {useCallback,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Company,Contact} from '@/types';
import {CompanyRepository} from '@/repositories/CompanyRepository';
import {ContactRow} from '@/components/ContactRow';
import {BackLink,Btn,Card,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh,useGoBack} from '@/components/ui';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function CompanyProfile(){
 const {id}=useLocalSearchParams<{id:string}>();
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const goBack=useGoBack('/companies');
 const [company,setCompany]=useState<Company|null>(null);
 const [contacts,setContacts]=useState<Contact[]>([]);

 useFocusRefresh(useCallback(async()=>{
  const [current,people]=await Promise.all([CompanyRepository.get(id),CompanyRepository.contacts(id)]);
  setCompany(current);setContacts(people as Contact[]);
 },[id]));

 if(!company)return <View style={{flex:1,backgroundColor:c.paper}}/>;

 const confirmDelete=()=>Alert.alert(t('deleteCompanyConfirm'),t('deleteCompanyBody'),[
  {text:t('cancel'),style:'cancel'},
  {text:t('delete'),style:'destructive',onPress:async()=>{await CompanyRepository.remove(id);goBack()}},
 ]);

 return <ScreenScroll>
  <BackLink label={t('backCompanies')} onPress={goBack}/>
  <Title>{company.name}</Title>
  <Subtitle>{[company.industry,company.city,company.country].filter(Boolean).join(' · ')||t('noCompanyContext')}</Subtitle>
  <Card>
   <Text style={{color:company.description?c.ink:c.muted,fontSize:16,lineHeight:24}}>{company.description||t('companyDescriptionEmpty')}</Text>
  </Card>
  <View style={{flexDirection:'row',gap:9,marginTop:14}}>
   <Btn label={t('edit')} variant="outline" style={{flex:1}} onPress={()=>router.push(`/companies/new?id=${company.id}` as never)}/>
   <Btn label={t('delete')} variant="danger" style={{flex:1}} onPress={confirmDelete}/>
  </View>
  <SectionLabel style={{marginTop:26}}>{t('peopleHere').toUpperCase()}</SectionLabel>
  {contacts.length?contacts.map(contact=><ContactRow key={contact.id} contact={contact} onPress={()=>router.push(`/contacts/${contact.id}` as never)}/>)
   :<Text style={{color:c.muted}}>{t('noPeopleHere')}</Text>}
 </ScreenScroll>;
}
