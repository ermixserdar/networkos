import {useState} from 'react';
import {ScrollView,Text} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {InteractionRepository} from '@/repositories/InteractionRepository';
import {FollowUpService} from '@/services/FollowUpService';
import {BackLink,Btn,Chip,Field,ScreenScroll,SectionLabel,Subtitle,Title} from '@/components/ui';
import {parseDateInput,toDateInput} from '@/utils/format';
import {useTranslation} from '@/i18n';
import {useTheme} from '@/theme';

const TYPES=['meeting','phone','email','message','coffee','event','intro','other'] as const;

export default function NewInteraction(){
 const {contactId}=useLocalSearchParams<{contactId:string}>();
 const [type,setType]=useState<string>('meeting');
 const [title,setTitle]=useState('');
 const [description,setDescription]=useState('');
 const [when,setWhen]=useState(toDateInput(Date.now()));
 const [saving,setSaving]=useState(false);
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();

 const save=async()=>{
  if(!contactId)return;
  const at=parseDateInput(when)??Date.now();
  setSaving(true);
  try{
   await InteractionRepository.create({contact_id:contactId,type,interaction_at:at,title:title.trim()||undefined,description:description.trim()||undefined});
   // Logging contact is what advances a cadence, so the next follow-up books itself.
   await FollowUpService.applyCadence(contactId,at);
   router.back();
  }finally{setSaving(false)}
 };

 return <ScreenScroll>
  <BackLink label={t('backContact')} onPress={()=>router.back()}/>
  <Title>{t('addInteraction')}</Title>
  <Subtitle>{t('interactionSubtitle')}</Subtitle>
  <SectionLabel>{t('typeLabel')}</SectionLabel>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:4}} style={{marginBottom:18}}>
   {TYPES.map(x=><Chip key={x} label={t(`type_${x}` as never)} selected={type===x} onPress={()=>setType(x)}/>)}
  </ScrollView>
  <Field label={t('titleLabel')} value={title} onChangeText={setTitle}/>
  <Field label={t('whenLabel')} hint={t('dateHint')} value={when} onChangeText={setWhen} keyboardType="numbers-and-punctuation" autoCapitalize="none"/>
  <Field label={t('whatRemember')} value={description} onChangeText={setDescription} multiline style={{minHeight:120,textAlignVertical:'top'}}/>
  <Text style={{color:c.muted,fontSize:12,marginBottom:12}}>{t('cadenceHint')}</Text>
  <Btn label={t('saveInteraction')} busy={saving} disabled={!contactId} onPress={()=>void save()}/>
 </ScreenScroll>;
}
