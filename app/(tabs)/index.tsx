import {useCallback,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Contact} from '@/types';
import {ContactRepository} from '@/repositories/ContactRepository';
import {CommitmentRepository} from '@/repositories/CommitmentRepository';
import {FollowUpService} from '@/services/FollowUpService';
import {NotificationService} from '@/services/NotificationService';
import {ContactRow} from '@/components/ContactRow';
import {Btn,Card,ErrorNote,Loading,useFocusRefresh,useTopInset} from '@/components/ui';
import {HIT,hitSlop,radius,shadow,spacing,useTheme} from '@/theme';
import {ageOn,nextAnniversary,relativeFuture} from '@/utils/format';
import {useTranslation} from '@/i18n';

type Birthday={contact:Contact;at:number};
type Anniversary={contact:Contact;at:number};
type HomeData={total:number;strong:number;due:Contact[];promises:number;birthdays:Birthday[];anniversaries:Anniversary[];recent:Contact[]};
const EMPTY:HomeData={total:0,strong:0,due:[],promises:0,birthdays:[],anniversaries:[],recent:[]};
const WEEK=7*86400000;
const MONTH=30*86400000;

/**
 * Home is the day's work, not a dashboard: what is due leads, the totals follow. Nothing here is
 * a summary of something the user has to go elsewhere to act on — every row acts in place.
 */
export default function Home(){
 const [data,setData]=useState<HomeData>(EMPTY);
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const top=useTopInset();

 const load=useCallback(async()=>{
  try{
   const [stats,overdue,today,recent,promises,withBirthday,withMet]=await Promise.all([
    ContactRepository.stats(),
    FollowUpService.list('overdue'),
    FollowUpService.list('today'),
    ContactRepository.list({limit:4,order:'recent'}),
    CommitmentRepository.dueCount(),
    ContactRepository.withBirthday(),
    ContactRepository.withMetDate(),
   ]);
   const now=Date.now();
   const birthdays=withBirthday
    .map(contact=>({contact,at:nextAnniversary(contact.birthday!,now)}))
    .filter(item=>item.at-now<=WEEK)
    .sort((a,b)=>a.at-b.at)
    .slice(0,3);
   const anniversaries=withMet
    .map(contact=>({contact,at:nextAnniversary(contact.met_date!,now)}))
    .filter(item=>item.at-now<=MONTH)
    .sort((a,b)=>a.at-b.at)
    .slice(0,3);
   setData({total:stats.total,strong:stats.strong,due:[...overdue,...today],promises,birthdays,anniversaries,recent});
   setState('ready');
   // Keep the weekly summary honest about the week it is actually sent in.
   void NotificationService.refreshDigest({cooling:overdue.length,due:promises});
  }catch{
   // An empty screen and a failed read look identical; only this keeps them apart.
   setState('error');
  }
 },[]);
 useFocusRefresh(load);

 const act=async(action:'done'|'snooze',contact:Contact)=>{
  if(action==='done')await FollowUpService.markContacted(contact);
  else await FollowUpService.snooze(contact);
  await load();
 };

 const rowAction=(label:string,icon:keyof typeof Ionicons.glyphMap,onPress:()=>void)=>
  <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={hitSlop} onPress={onPress}
   style={{minHeight:HIT,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,borderRadius:radius.sm,backgroundColor:c.sage}}>
   <Ionicons name={icon} size={16} color={c.onSage}/>
   <Text style={{color:c.onSage,fontWeight:'800',fontSize:13}}>{label}</Text>
  </Pressable>;

 const stat=(value:number,label:string,onPress:()=>void)=><Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress}
  style={{flex:1,minHeight:HIT+16,backgroundColor:c.card,borderRadius:radius.lg,padding:spacing.md}}>
  <Text style={{fontSize:24,fontWeight:'800',color:c.ink}}>{value}</Text>
  <Text style={{fontSize:12,color:c.muted,marginTop:4}}>{label}</Text>
 </Pressable>;

 const quiet=!data.due.length&&!data.birthdays.length&&!data.anniversaries.length&&!data.promises;

 return <ScrollView style={{flex:1,backgroundColor:c.paper}} contentContainerStyle={{padding:spacing.lg,paddingTop:top,paddingBottom:40}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Text accessibilityRole="header" style={{fontSize:32,fontWeight:'800',color:c.ink,flex:1,paddingRight:12}}>{t('keepTheThread')}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel={t('addContact')} hitSlop={hitSlop} onPress={()=>router.push('/contacts/form' as never)}
    style={{width:HIT+6,height:HIT+6,borderRadius:(HIT+6)/2,backgroundColor:c.coral,alignItems:'center',justifyContent:'center',...shadow}}>
    <Ionicons name="add" size={27} color={c.onTeal}/>
   </Pressable>
  </View>

  {state==='loading'?<Loading/>:state==='error'?<ErrorNote onRetry={()=>void load()}/>:<>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:26,marginBottom:11}}>
    <Text accessibilityRole="header" style={{fontSize:20,fontWeight:'800',color:c.ink}}>{t('todaySection')}</Text>
    {data.due.length>3?<Pressable accessibilityRole="button" hitSlop={hitSlop} onPress={()=>router.push('/(tabs)/followup' as never)} style={{minHeight:HIT,justifyContent:'center'}}>
     <Text style={{fontSize:13,color:c.onSage,fontWeight:'800'}}>{t('viewAll')}</Text>
    </Pressable>:null}
   </View>

   {data.due.slice(0,3).map(contact=><View key={contact.id} style={{backgroundColor:c.card,borderRadius:radius.lg,padding:15,marginBottom:9}}>
    <ContactRow contact={contact} onPress={()=>router.push(`/contacts/${contact.id}` as never)}/>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
     <Text style={{color:c.warn,fontSize:12,fontWeight:'800',flex:1,paddingRight:8}}>{t('followUpPrefix')} · {relativeFuture(contact.next_follow_up_at,language)}</Text>
     <View style={{flexDirection:'row',gap:8}}>
      {rowAction(t('snoozeWeek'),'time-outline',()=>void act('snooze',contact))}
      {rowAction(t('markContacted'),'checkmark-circle-outline',()=>void act('done',contact))}
     </View>
    </View>
   </View>)}

   {data.birthdays.map(item=><Pressable key={item.contact.id} accessibilityRole="button" onPress={()=>router.push(`/contacts/${item.contact.id}` as never)}
    style={{backgroundColor:c.card,borderRadius:radius.lg,padding:15,marginBottom:9,minHeight:HIT}}>
    <ContactRow contact={item.contact} onPress={()=>router.push(`/contacts/${item.contact.id}` as never)}
     trailing={<Ionicons name="gift-outline" size={18} color={c.onSage}/>}/>
    <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginTop:5}}>{t('birthdayLabel')} · {t('birthdayIn',Math.max(0,Math.round((item.at-Date.now())/86400000)))}</Text>
   </Pressable>)}

   {data.anniversaries.map(item=><Pressable key={item.contact.id} accessibilityRole="button" onPress={()=>router.push(`/contacts/${item.contact.id}` as never)}
    style={{backgroundColor:c.card,borderRadius:radius.lg,padding:15,marginBottom:9,minHeight:HIT}}>
    <ContactRow contact={item.contact} onPress={()=>router.push(`/contacts/${item.contact.id}` as never)}
     trailing={<Ionicons name="calendar-outline" size={18} color={c.onSage}/>}/>
    <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginTop:5}}>{t('metAnniversary')} · {t('birthdayIn',Math.max(0,Math.round((item.at-Date.now())/86400000)))} · {t('metYears',ageOn(item.contact.met_date!,item.at))}</Text>
   </Pressable>)}

   {data.promises?<Pressable accessibilityRole="button" accessibilityLabel={t('promisesDue',data.promises)} onPress={()=>router.push('/commitments' as never)}
    style={{backgroundColor:c.card,borderRadius:radius.lg,padding:15,marginBottom:9,minHeight:HIT,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Text style={{color:c.ink,fontSize:16,fontWeight:'700',flex:1,paddingRight:12}}>{t('promisesDue',data.promises)}</Text>
    <Ionicons name="chevron-forward" size={18} color={c.muted}/>
   </Pressable>:null}

   {quiet?<View style={{borderTopWidth:1,borderBottomWidth:1,borderColor:c.line,paddingVertical:18}}>
    <Text style={{color:c.muted}}>{t('quietDay')}</Text>
   </View>:null}

   {!data.total?<Card style={{marginTop:16}}>
    <Text style={{fontSize:17,fontWeight:'800',color:c.ink}}>{t('emptyHomeTitle')}</Text>
    <Text style={{color:c.muted,lineHeight:21,marginTop:6}}>{t('emptyHomeBody')}</Text>
    <Btn label={t('emptyHomeImport')} icon="download-outline" style={{marginTop:14}} onPress={()=>router.push('/contacts/import' as never)}/>
    <Btn label={t('emptyHomeManual')} variant="outline" style={{marginTop:8}} onPress={()=>router.push('/contacts/form' as never)}/>
   </Card>:null}

   {data.recent.length?<>
    <Text accessibilityRole="header" style={{fontSize:20,fontWeight:'800',color:c.ink,marginTop:30,marginBottom:7}}>{t('recentlyAdded')}</Text>
    {data.recent.map(contact=><ContactRow key={contact.id} contact={contact} onPress={()=>router.push(`/contacts/${contact.id}` as never)}/>)}
   </>:null}

   {data.total?<View style={{flexDirection:'row',gap:10,marginTop:30}}>
    {stat(data.total,t('contacts'),()=>router.push('/(tabs)/contacts' as never))}
    {stat(data.strong,t('statStrong'),()=>router.push('/(tabs)/network' as never))}
   </View>:null}
  </>}
 </ScrollView>;
}
