import {useCallback,useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Contact} from '@/types';
import {useContacts} from '@/hooks/useContacts';
import {OwnerRepository} from '@/repositories/OwnerRepository';
import {NetworkGraph,NetworkService,OWNER_ID} from '@/services/NetworkService';
import {NetworkCanvas,toCanvasNodes} from '@/components/NetworkCanvas';
import {contactName} from '@/components/ContactRow';
import {Chip,useFocusRefresh} from '@/components/ui';
import {HIT,hitSlop,radius,useTheme} from '@/theme';
import {formatDate} from '@/utils/format';
import {useTranslation} from '@/i18n';

const EMPTY:NetworkGraph={nodes:[],edges:[]};
/** Months back. `created_at` on every row is what makes the rewind possible. */
const REWINDS=[0,3,12,36] as const;

export default function Network(){
 const [query,setQuery]=useState('');
 const {contacts}=useContacts({q:query,pageSize:12});
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [selected,setSelected]=useState<Contact|null>(null);
 const [ownerName,setOwnerName]=useState(t('youLabel'));
 const [graph,setGraph]=useState<NetworkGraph>(EMPTY);
 const [finding,setFinding]=useState(false);
 const [target,setTarget]=useState<Contact|null>(null);
 const [path,setPath]=useState<string[]|null>(null);
 const [pathNames,setPathNames]=useState<Record<string,string>>({});
 const [rewindMonths,setRewindMonths]=useState(0);
 const router=useRouter();

 useFocusRefresh(useCallback(async()=>{
  const owner=await OwnerRepository.get();
  if(owner)setOwnerName(owner.first_name||t('youLabel'));
 },[t]));

 // No selection means the owner's own view: everyone they know, centred on them.
 useEffect(()=>{
  const asOf=rewindMonths?Date.now()-rewindMonths*30*86400000:undefined;
  void (selected?NetworkService.graph(selected.id,2,150,asOf):NetworkService.ownerGraph(150,asOf)).then(setGraph);
 },[selected,rewindMonths]);

 const graphContacts=useMemo(()=>(graph.nodes as unknown as Contact[]).filter(n=>n.id!==selected?.id),[graph,selected]);
 // Stable identity matters: NetworkCanvas re-runs its force layout whenever this array changes.
 const allNodes=useMemo(()=>{
  const rest=toCanvasNodes(graphContacts,selected?undefined:{label:ownerName});
  return selected?[{id:selected.id,label:contactName(selected),importance:5,owner:true},...rest]:rest;
 },[graphContacts,selected,ownerName]);

 const choose=(id:string)=>{
  if(id===OWNER_ID){setSelected(null);setTarget(null);setPath(null);return}
  const contact=graphContacts.find(x=>x.id===id)??contacts.find(x=>x.id===id);
  if(!contact)return;
  if(finding&&selected&&contact.id!==selected.id){
   setTarget(contact);
   void NetworkService.shortestPath(selected.id,contact.id,6).then(async found=>{
    setPath(found);
    setPathNames(found?await NetworkService.namesFor(found):{});
   });
   setFinding(false);
  }else{setSelected(contact);setTarget(null);setPath(null)}
 };

 const nameOf=(id:string)=>pathNames[id]??id;

 return <View style={{flex:1,backgroundColor:c.tealDeep}}>
  <ScrollView contentContainerStyle={{paddingBottom:40}} stickyHeaderIndices={[0]}>
   <View style={{backgroundColor:c.tealDeep,paddingHorizontal:20,paddingTop:60,paddingBottom:16}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
     <View style={{flex:1}}>
      <Text accessibilityRole="header" style={{fontSize:32,fontWeight:'800',color:'#fff',marginTop:7}}>{t('seeThreadTitle')}</Text>
     </View>
     <View style={{flexDirection:'row',gap:8}}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('insights')} hitSlop={hitSlop} onPress={()=>router.push('/insights' as never)}
       style={{width:HIT,height:HIT,borderRadius:HIT/2,backgroundColor:'#194C52',alignItems:'center',justifyContent:'center'}}>
       <Ionicons name="sparkles-outline" size={20} color="#C5DEDA"/>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('startFromYou')} hitSlop={hitSlop} onPress={()=>{setSelected(null);setTarget(null);setPath(null)}}
       style={{width:HIT,height:HIT,borderRadius:HIT/2,backgroundColor:'#194C52',alignItems:'center',justifyContent:'center'}}>
       <Ionicons name="locate-outline" size={20} color="#C5DEDA"/>
      </Pressable>
     </View>
    </View>
    <Text style={{color:'#A8C4C2',marginTop:7}}>{finding?t('nowChoose'):t('realConnections')}</Text>
   </View>

   <NetworkCanvas nodes={allNodes} edges={graph.edges} highlightedIds={path??[]} onSelect={choose} emptyHint={t('chooseStarting')}/>

   <View style={{backgroundColor:c.tealDeep,paddingHorizontal:20,paddingTop:14}}>
    <Text style={{color:'#A8C4C2',fontSize:12,fontWeight:'800',marginBottom:8}}>{t('timeTravel').toUpperCase()} · {t('timeTravelHint')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:4}}>
     {REWINDS.map(months=><Chip key={months} selected={rewindMonths===months} onPress={()=>setRewindMonths(months)}
      label={months?t('timeTravelAt',formatDate(Date.now()-months*30*86400000,language)):t('timeTravelNow')}/>)}
    </ScrollView>
   </View>

   <View style={{backgroundColor:c.paper,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,marginTop:-18,minHeight:355}}>
    <View style={{height:4,width:40,borderRadius:2,backgroundColor:c.line,alignSelf:'center',marginBottom:18}}/>

    {path&&selected&&target?<View style={{backgroundColor:c.coralSoft,borderRadius:radius.md,padding:15,marginBottom:15}}>
     <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
      <Text style={{fontSize:11,color:c.coralInk,fontWeight:'900',letterSpacing:1}}>{t('shortestPath')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('close')} hitSlop={hitSlop} onPress={()=>{setPath(null);setTarget(null)}}>
       <Ionicons name="close" size={18} color={c.coralInk}/>
      </Pressable>
     </View>
     <Text style={{fontSize:17,color:c.ink,fontWeight:'800',marginTop:7}}>{t('degreesAway',path.length-1)}</Text>
     <Text style={{color:c.coralInk,fontSize:13,lineHeight:20,marginTop:6}}>{path.map(nameOf).join('  →  ')}</Text>
    </View>:path===null&&target?<View style={{backgroundColor:c.coralSoft,borderRadius:radius.md,padding:15,marginBottom:15}}>
     <Text style={{color:c.coralInk,fontWeight:'800'}}>{t('noConnectionSix')}</Text>
     <Text style={{color:c.coralInk,fontSize:13,marginTop:5}}>{t('tryAnother')}</Text>
    </View>:null}

    {selected?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
     <View style={{flex:1}}>
      <Text style={{fontSize:11,color:c.coral,fontWeight:'900',letterSpacing:1}}>{t('focusLabel')}</Text>
      <Text style={{fontSize:21,color:c.ink,fontWeight:'800',marginTop:4}}>{contactName(selected)}</Text>
     </View>
     <View style={{flexDirection:'row',gap:14,alignItems:'center'}}>
      <Pressable accessibilityRole="button" hitSlop={hitSlop} onPress={()=>setFinding(true)}><Text style={{color:c.coral,fontWeight:'800'}}>{t('findPath')}</Text></Pressable>
      <Pressable accessibilityRole="button" hitSlop={hitSlop} onPress={()=>router.push(`/contacts/${selected.id}` as never)}><Text style={{color:c.coral,fontWeight:'800'}}>{t('profileLink')}</Text></Pressable>
     </View>
    </View>:<>
     <Text accessibilityRole="header" style={{fontSize:20,color:c.ink,fontWeight:'800'}}>{t('chooseStarting')}</Text>
     <Text style={{color:c.muted,marginTop:5,marginBottom:14}}>{t('buildMap')}</Text>
    </>}

    <View style={{backgroundColor:c.card,borderRadius:radius.sm,flexDirection:'row',alignItems:'center',paddingHorizontal:14,marginBottom:8,borderWidth:1,borderColor:c.line}}>
     <Ionicons name="search" size={18} color={c.muted}/>
     <TextInput accessibilityLabel={t('findPerson')} value={query} onChangeText={setQuery} placeholder={finding?t('choosePerson'):t('findPerson')} placeholderTextColor={c.placeholder}
      style={{flex:1,padding:14,fontSize:15,color:c.ink,minHeight:HIT}}/>
    </View>

    {contacts.slice(0,12).map(contact=><Pressable key={contact.id} accessibilityRole="button" accessibilityLabel={contactName(contact)} onPress={()=>choose(contact.id)}
     style={{minHeight:HIT+12,paddingVertical:13,borderBottomWidth:1,borderBottomColor:c.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
     <View style={{flex:1}}>
      <Text style={{color:c.ink,fontWeight:'800'}}>{contactName(contact)}</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:3}}>{contact.job_title||t('connectionDefault')} · {finding?t('setAsDestination'):t('inNeighborhood')}</Text>
     </View>
     <Ionicons name={finding?'arrow-forward-outline':'arrow-up-outline'} size={18} color={c.coral}/>
    </Pressable>)}
   </View>
  </ScrollView>
 </View>;
}
