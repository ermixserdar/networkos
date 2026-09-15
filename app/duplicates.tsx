import {useCallback,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {DuplicateGroup,MergeService} from '@/services/MergeService';
import {contactName} from '@/components/ContactRow';
import {Avatar} from '@/components/Avatar';
import {BackLink,Btn,Card,Empty,Loading,ScreenScroll,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {relativeDate} from '@/utils/format';
import {useTranslation} from '@/i18n';

const REASON={phone:'dupReasonPhone',email:'dupReasonEmail',name:'dupReasonName'} as const;

export default function Duplicates(){
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [groups,setGroups]=useState<DuplicateGroup[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);

 const load=useCallback(async()=>{
  setLoading(true);
  try{setGroups(await MergeService.duplicates())}finally{setLoading(false)}
 },[]);
 useFocusRefresh(load);

 const merge=(group:DuplicateGroup,winnerId:string)=>Alert.alert(t('mergeConfirm'),t('mergeContactsBody'),[
  {text:t('cancel'),style:'cancel'},
  {text:t('keepThis'),onPress:async()=>{
   setBusy(true);
   try{
    for(const loser of group.contacts.filter(x=>x.id!==winnerId))await MergeService.merge(winnerId,loser.id);
    Alert.alert(t('merged'));
    await load();
   }finally{setBusy(false)}
  }},
 ]);

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('duplicates')}</Title>
  <Subtitle>{t('duplicatesSubtitle')}</Subtitle>

  {loading?<Loading/>:groups.length?groups.map(group=><Card key={`${group.reason}-${group.value}`} style={{marginBottom:12}}>
   <Text style={{fontSize:12,fontWeight:'900',color:c.muted,letterSpacing:0.6}}>{t(REASON[group.reason]).toUpperCase()}</Text>
   {group.contacts.map(contact=><View key={contact.id} style={{marginTop:12}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
     <Avatar name={contactName(contact)} size={36} photo={contact.photo}/>
     <View style={{flex:1}}>
      <Text style={{color:c.ink,fontWeight:'800'}}>{contactName(contact)}</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:2}}>
       {[contact.job_title,contact.company_name].filter(Boolean).join(' · ')||relativeDate(contact.last_contact_at,language)}
      </Text>
     </View>
    </View>
    <Btn label={t('mergeInto',contactName(contact))} variant="ghost" busy={busy} style={{marginTop:8}} onPress={()=>merge(group,contact.id)}/>
   </View>)}
  </Card>):<Empty>{t('noDuplicates')}</Empty>}
 </ScreenScroll>;
}
