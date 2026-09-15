import {useCallback,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Contact} from '@/types';
import {FollowUpBucket,FollowUpService} from '@/services/FollowUpService';
import {ContactRow} from '@/components/ContactRow';
import {Chip,Empty,useFocusRefresh} from '@/components/ui';
import {HIT,hitSlop,radius,useTheme} from '@/theme';
import {relativeFuture} from '@/utils/format';
import {useTranslation} from '@/i18n';

const BUCKETS:{key:FollowUpBucket;label:'bucketOverdue'|'bucketToday'|'bucketWeek'|'bucketLater'}[]=[
 {key:'overdue',label:'bucketOverdue'},{key:'today',label:'bucketToday'},{key:'week',label:'bucketWeek'},{key:'later',label:'bucketLater'},
];

export default function Followup(){
 const [bucket,setBucket]=useState<FollowUpBucket>('today');
 const [counts,setCounts]=useState<Record<FollowUpBucket,number>>({overdue:0,today:0,week:0,later:0});
 const [list,setList]=useState<Contact[]>([]);
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();

 const load=useCallback(async()=>{
  const [rows,totals]=await Promise.all([FollowUpService.list(bucket),FollowUpService.counts()]);
  setList(rows);setCounts(totals);
 },[bucket]);
 useFocusRefresh(load);

 const act=async(action:'done'|'snooze',contact:Contact)=>{
  if(action==='done')await FollowUpService.markContacted(contact);
  else await FollowUpService.snooze(contact);
  await load();
 };

 const action=(label:string,icon:keyof typeof Ionicons.glyphMap,onPress:()=>void)=>
  <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={hitSlop} onPress={onPress}
   style={{minHeight:HIT,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,borderRadius:radius.sm,backgroundColor:c.sage}}>
   <Ionicons name={icon} size={16} color={c.teal}/>
   <Text style={{color:c.teal,fontWeight:'800',fontSize:13}}>{label}</Text>
  </Pressable>;

 return <View style={{flex:1,padding:22,paddingTop:62,backgroundColor:c.paper}}>
  <Text accessibilityRole="header" style={{fontSize:34,fontWeight:'800',color:c.ink}}>{t('followUp')}</Text>
  <Text style={{color:c.muted,marginTop:5,marginBottom:16}}>{t('followUpSubtitle')}</Text>

  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:4}} style={{flexGrow:0,marginBottom:14}}>
   {BUCKETS.map(item=><Chip key={item.key} label={`${t(item.label)} ${counts[item.key]}`} selected={bucket===item.key} onPress={()=>setBucket(item.key)}/>)}
  </ScrollView>

  <ScrollView contentContainerStyle={{paddingBottom:30}}>
   {list.length?list.map(contact=><View key={contact.id} style={{backgroundColor:c.card,borderRadius:radius.lg,padding:14,marginBottom:10}}>
    <ContactRow contact={contact} onPress={()=>router.push(`/contacts/${contact.id}` as never)}/>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
     <Text style={{color:c.coral,fontWeight:'800',fontSize:12}}>{relativeFuture(contact.next_follow_up_at,language)}</Text>
     <View style={{flexDirection:'row',gap:8}}>
      {action(t('snoozeWeek'),'time-outline',()=>void act('snooze',contact))}
      {action(t('markContacted'),'checkmark-circle-outline',()=>void act('done',contact))}
     </View>
    </View>
   </View>):<Empty>{t('nothingScheduled')}</Empty>}
  </ScrollView>
 </View>;
}
