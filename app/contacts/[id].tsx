import {useCallback,useState} from 'react';
import {Alert,Linking,Pressable,ScrollView,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Commitment,Contact,Interaction,Tag} from '@/types';
import {ContactRepository} from '@/repositories/ContactRepository';
import {InteractionRepository} from '@/repositories/InteractionRepository';
import {CommitmentRepository} from '@/repositories/CommitmentRepository';
import {RelationshipEdge,RelationshipRepository} from '@/repositories/RelationshipRepository';
import {TagRepository} from '@/repositories/TagRepository';
import {FollowUpService} from '@/services/FollowUpService';
import {ReminderPlanner} from '@/services/ReminderPlanner';
import {NetworkService} from '@/services/NetworkService';
import {howWeMetText} from '@/services/ContactsImportService';
import {useAppStore} from '@/stores/useAppStore';
import {Avatar} from '@/components/Avatar';
import {contactName} from '@/components/ContactRow';
import {BackLink,Btn,Card,Chip,SectionLabel,useFocusRefresh,useGoBack} from '@/components/ui';
import {HIT,hitSlop,radius,shadow,useTheme} from '@/theme';
import {ageOn,formatDate,nextAnniversary,relativeDate,relativeFuture} from '@/utils/format';
import {useTranslation} from '@/i18n';

const DAY=86400000;
const HEALTH={Healthy:'healthHealthy',Cooling:'healthCooling',Dormant:'healthDormant'} as const;
const CADENCES=[30,90,180] as const;

type Detail={contact:Contact|null;interactions:Interaction[];commitments:Commitment[];edges:RelationshipEdge[];tags:Tag[];balance:{mine:number;theirs:number}};
const EMPTY:Detail={contact:null,interactions:[],commitments:[],edges:[],tags:[],balance:{mine:0,theirs:0}};

export default function Profile(){
 const {id}=useLocalSearchParams<{id:string}>();
 const [detail,setDetail]=useState<Detail>(EMPTY);
 const [loaded,setLoaded]=useState(false);
 const router=useRouter();
 const goBack=useGoBack('/(tabs)/contacts');
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const showToast=useAppStore(s=>s.showToast);

 const load=useCallback(async()=>{
  try{
   const contact=await ContactRepository.get(id);
   if(!contact){setDetail(EMPTY);return}
   const [interactions,commitments,edges,tags,balance]=await Promise.all([
    InteractionRepository.listForContact(id),
    CommitmentRepository.list({contactId:id,openOnly:true}),
    RelationshipRepository.listForContact(id),
    TagRepository.forContact(id),
    CommitmentRepository.balance(id),
   ]);
   setDetail({contact,interactions,commitments,edges,tags,balance});
  }finally{setLoaded(true)}
 },[id]);
 useFocusRefresh(load);

 const {contact}=detail;
 if(!loaded)return <View style={{flex:1,backgroundColor:c.paper}}/>;
 if(!contact)return <View style={{flex:1,backgroundColor:c.paper,padding:20,paddingTop:58}}>
  <BackLink label={t('backPeople')} onPress={goBack}/>
  <View style={{flex:1,alignItems:'center',justifyContent:'center',paddingBottom:90}}>
   <Ionicons name="person-outline" size={46} color={c.muted}/>
   <Text accessibilityRole="header" style={{fontSize:23,fontWeight:'800',color:c.ink,marginTop:18}}>{t('personNotFound')}</Text>
   <Text style={{color:c.muted,marginTop:9,textAlign:'center',lineHeight:22,paddingHorizontal:24}}>{t('personNotFoundBody')}</Text>
   <Btn label={t('backPeople')} variant="outline" style={{marginTop:22}} onPress={goBack}/>
  </View>
 </View>;

 const name=contactName(contact);
 const health=NetworkService.health(contact);
 const healthColor=health==='Healthy'?c.good:health==='Cooling'?c.coral:c.warn;

 const setFollowUp=async(days:number|null)=>{
  await FollowUpService.set(contact.id,days===null?null:Date.now()+days*DAY);
  await load();
 };
 const setCadence=async(days:number|null)=>{
  await ContactRepository.patch(contact.id,{cadence_days:days});
  if(days)await FollowUpService.set(contact.id,(contact.last_contact_at??Date.now())+days*DAY);
  await load();
 };
 const doDelete=async()=>{
  const name=contactName(contact);
  await ContactRepository.remove(contact.id);
  // The deleted follow-up must not keep pinging, and the toast gives five seconds to take it back.
  await ReminderPlanner.reconcile();
  showToast({message:t('deletedPerson',name),actionLabel:t('undoDelete'),action:async()=>{
   await ContactRepository.restore(contact.id);
   await ReminderPlanner.reconcile();
  }});
  router.back();
 };
 const confirmDelete=()=>Alert.alert(t('deletePersonConfirm'),t('deletePersonBody'),[
  {text:t('cancel'),style:'cancel'},
  {text:t('delete'),style:'destructive',onPress:()=>void doDelete()},
 ]);

 const reach=[
  contact.phone?{icon:'call-outline' as const,label:t('callAction'),url:`tel:${contact.phone}`}:null,
  contact.email?{icon:'mail-outline' as const,label:t('emailAction'),url:`mailto:${contact.email}`}:null,
  contact.linkedin_url?{icon:'logo-linkedin' as const,label:t('linkedinAction'),url:contact.linkedin_url}:null,
 ].filter(Boolean) as {icon:'call-outline';label:string;url:string}[];

 const birthdayAt=contact.birthday?nextAnniversary(contact.birthday):null;
 const metAnniversaryAt=contact.met_date&&contact.met_date<=Date.now()?nextAnniversary(contact.met_date):null;

 return <ScrollView style={{backgroundColor:c.paper}} contentContainerStyle={{padding:20,paddingTop:58,paddingBottom:44}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <BackLink label={t('backPeople')} onPress={()=>router.back()}/>
   <View style={{flexDirection:'row',gap:6}}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('editPerson')} hitSlop={hitSlop} onPress={()=>router.push(`/contacts/form?id=${contact.id}` as never)}
     style={{width:HIT,height:HIT,alignItems:'center',justifyContent:'center'}}>
     <Ionicons name="create-outline" size={22} color={c.ink}/>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('deletePerson')} hitSlop={hitSlop} onPress={confirmDelete}
     style={{width:HIT,height:HIT,alignItems:'center',justifyContent:'center'}}>
     <Ionicons name="trash-outline" size={21} color={c.coral}/>
    </Pressable>
   </View>
  </View>

  <View style={{marginTop:20,flexDirection:'row',alignItems:'center'}}>
   <Avatar name={name} size={78} photo={contact.photo}/>
   <View style={{marginLeft:16,flex:1}}>
    <Text accessibilityRole="header" style={{fontSize:29,fontWeight:'800',color:c.ink}}>{name}</Text>
    <Text style={{color:c.muted,fontSize:15,marginTop:5}}>{[contact.job_title,contact.company_name].filter(Boolean).join(' · ')||t('addRoleCompany')}</Text>
    <Text style={{color:c.muted,fontSize:14,marginTop:4}}>{[contact.city,contact.country].filter(Boolean).join(', ')||t('locationMissing')}</Text>
   </View>
  </View>

  {detail.tags.length?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:14}}>
   {detail.tags.map(tag=><View key={tag.id} style={{backgroundColor:c.sage,borderRadius:14,paddingHorizontal:11,paddingVertical:7}}>
    <Text style={{color:c.teal,fontWeight:'700',fontSize:13}}>{tag.name}</Text>
   </View>)}
  </View>:null}

  <View style={{flexDirection:'row',marginTop:22,backgroundColor:c.card,borderRadius:radius.lg,padding:16,...shadow}}>
   <View style={{flex:1}}>
    <Text style={{color:c.muted,fontSize:11,fontWeight:'800'}}>{t('relationshipLabel')}</Text>
    <Text style={{color:c.ink,fontSize:19,fontWeight:'800',marginTop:6}}>{t(HEALTH[health as keyof typeof HEALTH])}</Text>
    <Text style={{color:healthColor,fontSize:12,fontWeight:'800',marginTop:4}}>● {t('strengthOf',contact.relationship_strength)}</Text>
   </View>
   <View style={{width:1,backgroundColor:c.line,marginHorizontal:14}}/>
   <View style={{flex:1}}>
    <Text style={{color:c.muted,fontSize:11,fontWeight:'800'}}>{t('lastContactLabel')}</Text>
    <Text style={{color:c.ink,fontSize:17,fontWeight:'800',marginTop:6}}>{relativeDate(contact.last_contact_at,language)}</Text>
    <Text style={{color:c.muted,fontSize:12,marginTop:4}}>{t('importanceOf',contact.importance)}</Text>
   </View>
  </View>

  {reach.length?<View style={{flexDirection:'row',gap:8,marginTop:12}}>
   {reach.map(item=><Btn key={item.label} label={item.label} icon={item.icon} variant="ghost" style={{flex:1}} onPress={()=>void Linking.openURL(item.url)}/>)}
  </View>:null}

  <View style={{flexDirection:'row',gap:9,marginTop:12}}>
   <Btn label={t('interaction')} icon="add" style={{flex:1}} onPress={()=>router.push(`/interactions/new?contactId=${contact.id}` as never)}/>
   <Btn label={t('connect')} icon="git-network-outline" variant="outline" style={{flex:1}} onPress={()=>router.push(`/relationships/new?contactId=${contact.id}` as never)}/>
  </View>
  <Btn label={t('manageTags')} icon="pricetag-outline" variant="ghost" style={{marginTop:10}} onPress={()=>router.push(`/contacts/tags?contactId=${contact.id}` as never)}/>

  <SectionLabel style={{marginTop:28}}>{t('followUpSection').toUpperCase()}</SectionLabel>
  <Card>
   <Text style={{color:contact.next_follow_up_at?c.ink:c.muted,fontWeight:'700'}}>
    {contact.next_follow_up_at?`${formatDate(contact.next_follow_up_at,language)} · ${relativeFuture(contact.next_follow_up_at,language)}`:t('noFollowUp')}
   </Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12}}>
    <Chip label={t('followUpTomorrow')} onPress={()=>void setFollowUp(1)}/>
    <Chip label={t('followUpWeek')} onPress={()=>void setFollowUp(7)}/>
    <Chip label={t('followUpMonth')} onPress={()=>void setFollowUp(30)}/>
    <Chip label={t('followUpQuarter')} onPress={()=>void setFollowUp(90)}/>
    {contact.next_follow_up_at?<Chip label={t('clearFollowUp')} onPress={()=>void setFollowUp(null)}/>:null}
   </View>
  </Card>

  <SectionLabel style={{marginTop:24}}>{t('cadenceSection').toUpperCase()}</SectionLabel>
  <Card>
   <Text style={{color:contact.cadence_days?c.ink:c.muted,fontWeight:'700'}}>{contact.cadence_days?t('cadenceEvery',contact.cadence_days):t('cadenceNone')}</Text>
   <Text style={{color:c.muted,marginTop:6,lineHeight:20}}>{t('cadenceHint')}</Text>
   <View style={{flexDirection:'row',gap:8,marginTop:12}}>
    {CADENCES.map(days=><Chip key={days} label={t('cadenceEvery',days)} selected={contact.cadence_days===days} onPress={()=>void setCadence(contact.cadence_days===days?null:days)}/>)}
   </View>
  </Card>

  {birthdayAt?<Card style={{marginTop:12}} tone="sage">
   <Text style={{color:c.teal,fontSize:12,fontWeight:'900'}}>{t('birthdayLabel').toUpperCase()}</Text>
   <Text style={{color:c.ink,fontWeight:'800',marginTop:6}}>
    {formatDate(contact.birthday,language)} · {t('birthdayIn',Math.max(0,Math.round((birthdayAt-Date.now())/DAY)))}
    {contact.birthday&&new Date(contact.birthday).getFullYear()>1904?` · ${t('turnsAge',ageOn(contact.birthday,birthdayAt))}`:''}
   </Text>
  </Card>:null}

  {metAnniversaryAt?<Card style={{marginTop:12}} tone="sage">
   <Text style={{color:c.teal,fontSize:12,fontWeight:'900'}}>{t('metAnniversary').toUpperCase()}</Text>
   <Text style={{color:c.ink,fontWeight:'800',marginTop:6}}>
    {formatDate(contact.met_date,language)} · {t('birthdayIn',Math.max(0,Math.round((metAnniversaryAt-Date.now())/DAY)))} · {t('metYears',ageOn(contact.met_date!,metAnniversaryAt))}
   </Text>
  </Card>:null}

  <SectionLabel style={{marginTop:24}}>{t('promisesSection').toUpperCase()}</SectionLabel>
  <Card>
   <Text style={{color:c.ink,fontWeight:'800'}}>
    {detail.balance.mine||detail.balance.theirs?t('reciprocityBody',detail.balance.mine,detail.balance.theirs):t('balanceEven')}
   </Text>
   {detail.commitments.map(item=><Text key={item.id} style={{color:c.muted,marginTop:8}}>
    {item.direction==='owed_by_me'?'↑':'↓'} {item.text}
   </Text>)}
   <Btn label={t('addPromise')} variant="ghost" style={{marginTop:12}} onPress={()=>router.push(`/commitments?contactId=${contact.id}` as never)}/>
  </Card>

  <SectionLabel style={{marginTop:24}}>{t('connectionsSection').toUpperCase()}</SectionLabel>
  {detail.edges.length?detail.edges.map(edge=><Pressable key={edge.id} accessibilityRole="button" accessibilityLabel={edge.other_name} onPress={()=>router.push(`/contacts/${edge.other_id}` as never)}
   style={{minHeight:HIT+8,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <View style={{flex:1}}>
    <Text style={{color:c.ink,fontWeight:'800'}}>{edge.other_name}</Text>
    <Text style={{color:c.muted,fontSize:12,marginTop:3}}>{t(`rel_${edge.relationship_type??'other'}` as never)} · {edge.strength}/5</Text>
   </View>
   <Ionicons name="chevron-forward" size={18} color={c.muted}/>
  </Pressable>):<Text style={{color:c.muted}}>{t('noConnections')}</Text>}

  <SectionLabel style={{marginTop:26}}>{t('contextSection').toUpperCase()}</SectionLabel>
  <Card>
   <Text style={{color:contact.notes?c.ink:c.muted,fontSize:16,lineHeight:24}}>{contact.notes||t('noNotes')}</Text>
   {contact.how_we_met?<Text style={{color:c.muted,marginTop:10}}>{t('howWeMetLabel')}: {howWeMetText(contact.how_we_met,t)}</Text>:null}
   {contact.met_at?<Text style={{color:c.muted,marginTop:4}}>{t('metAtLabel')}: {contact.met_at}</Text>:null}
   {contact.met_date?<Text style={{color:c.muted,marginTop:4}}>{t('metDateLabel')}: {formatDate(contact.met_date,language)}</Text>:null}
  </Card>

  {detail.interactions.length?<Card style={{marginTop:24}}>
   <Text style={{fontSize:12,fontWeight:'900',color:c.muted}}>{t('lastInteractionsLabel').toUpperCase()}</Text>
   {detail.interactions.slice(0,3).map(item=><View key={item.id} style={{marginTop:10}}>
    <Text style={{color:c.ink,fontWeight:'800'}}>{item.title||t(`type_${item.type}` as never)}</Text>
    <Text style={{color:c.muted,fontSize:12,marginTop:3}}>{relativeDate(item.interaction_at,language)}</Text>
   </View>)}
  </Card>:null}

  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:26,marginBottom:10}}>
   <Text accessibilityRole="header" style={{fontSize:21,fontWeight:'800',color:c.ink}}>{t('timeline')}</Text>
   <Pressable accessibilityRole="button" hitSlop={hitSlop} onPress={()=>router.push(`/interactions/new?contactId=${contact.id}` as never)}>
    <Text style={{color:c.coral,fontWeight:'800'}}>{t('add')}</Text>
   </Pressable>
  </View>
  {detail.interactions.length?detail.interactions.map(item=><View key={item.id} style={{borderLeftWidth:2,borderLeftColor:c.coral,paddingLeft:14,paddingVertical:8,marginBottom:8}}>
   <Text style={{color:c.ink,fontWeight:'800'}}>{item.title||t(`type_${item.type}` as never)}</Text>
   <Text style={{color:c.muted,marginTop:4}}>{item.description||t('noDetail')}</Text>
   <Text style={{color:c.muted,fontSize:12,marginTop:4}}>{relativeDate(item.interaction_at,language)}</Text>
  </View>):<View style={{borderLeftWidth:2,borderLeftColor:c.coral,paddingLeft:14,paddingVertical:6}}>
   <Text style={{color:c.ink,fontWeight:'800'}}>{t('noInteractions')}</Text>
   <Text style={{color:c.muted,marginTop:5}}>{t('firstTouch')}</Text>
  </View>}
 </ScrollView>;
}
