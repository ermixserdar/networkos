import {useCallback,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Contact} from '@/types';
import {ContactRepository} from '@/repositories/ContactRepository';
import {ReminderPlanner} from '@/services/ReminderPlanner';
import {contactName} from '@/components/ContactRow';
import {Avatar} from '@/components/Avatar';
import {BackLink,Btn,Card,Empty,ScreenScroll,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {formatDate} from '@/utils/format';
import {useTranslation} from '@/i18n';

/** Soft deletes were already recoverable in the data; this is the door to them. */
export default function Trash(){
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [people,setPeople]=useState<Contact[]>([]);

 const load=useCallback(async()=>{setPeople(await ContactRepository.list({deleted:true,limit:200}))},[]);
 useFocusRefresh(load);

 const restore=async(contact:Contact)=>{await ContactRepository.restore(contact.id);await ReminderPlanner.reconcile();await load();Alert.alert(t('restored'))};
 const purge=(contact:Contact)=>Alert.alert(t('deleteForeverConfirm'),t('deleteForeverBody'),[
  {text:t('cancel'),style:'cancel'},
  {text:t('deleteForever'),style:'destructive',onPress:async()=>{await ContactRepository.purge(contact.id);await ReminderPlanner.reconcile();await load()}},
 ]);

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('trash')}</Title>
  <Subtitle>{t('trashSubtitle')}</Subtitle>
  {people.length?people.map(contact=><Card key={contact.id} style={{marginBottom:10}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
    <Avatar name={contactName(contact)} size={40} photo={contact.photo}/>
    <View style={{flex:1}}>
     <Text style={{color:c.ink,fontWeight:'800',fontSize:16}}>{contactName(contact)}</Text>
     <Text style={{color:c.muted,fontSize:12,marginTop:3}}>{t('deletedAt',formatDate(contact.deleted_at,language))}</Text>
    </View>
   </View>
   <View style={{flexDirection:'row',gap:8,marginTop:12}}>
    <Btn label={t('restore')} variant="ghost" style={{flex:1}} onPress={()=>void restore(contact)}/>
    <Btn label={t('deleteForever')} variant="danger" style={{flex:1}} onPress={()=>purge(contact)}/>
   </View>
  </Card>):<Empty>{t('trashEmpty')}</Empty>}
 </ScreenScroll>;
}
