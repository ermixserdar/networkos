import {useCallback,useEffect,useState} from 'react';
import {Alert,FlatList,Pressable,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Commitment,CommitmentDirection,Contact} from '@/types';
import {CommitmentRepository} from '@/repositories/CommitmentRepository';
import {ContactRepository} from '@/repositories/ContactRepository';
import {ContactSelect} from '@/components/ContactSelect';
import {BackLink,Btn,Card,Chip,Empty,Field,Screen,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {HIT,hitSlop,radius,useTheme} from '@/theme';
import {formatDate,parseDateInput} from '@/utils/format';
import {useTranslation} from '@/i18n';

export default function Commitments(){
 const {contactId:initialContact}=useLocalSearchParams<{contactId?:string}>();
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [items,setItems]=useState<Commitment[]>([]);
 const [balance,setBalance]=useState({mine:0,theirs:0});
 const [contact,setContact]=useState<Contact|null>(null);
 const [text,setText]=useState('');
 const [due,setDue]=useState('');
 const [direction,setDirection]=useState<CommitmentDirection>('owed_by_me');
 const [filter,setFilter]=useState<CommitmentDirection|undefined>();
 const [saving,setSaving]=useState(false);

 const load=useCallback(async()=>{
  const [rows,totals]=await Promise.all([CommitmentRepository.list({direction:filter}),CommitmentRepository.balance()]);
  setItems(rows);setBalance(totals);
 },[filter]);
 useFocusRefresh(load);

 // Arriving from a contact's "add a promise" button should land with that person already chosen.
 useEffect(()=>{
  if(!initialContact)return;
  void ContactRepository.get(initialContact).then(preset=>setContact(current=>current??preset??null));
 },[initialContact]);

 const save=async()=>{
  const timestamp=due.trim()?parseDateInput(due):null;
  if(!contact||!text.trim()||(due.trim()&&timestamp===null)){Alert.alert(t('promiseRequired'));return}
  setSaving(true);
  try{
   await CommitmentRepository.create(contact.id,text,timestamp,direction);
   setText('');setDue('');
   await load();
  }finally{setSaving(false)}
 };

 return <Screen>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('promises')}</Title>
  <Subtitle>{t('promisesSubtitle')}</Subtitle>

  <Card tone="sage" style={{marginBottom:14}}>
   <Text style={{fontSize:12,fontWeight:'900',color:c.teal}}>{t('reciprocityTitle')}</Text>
   <Text style={{color:c.ink,fontWeight:'800',marginTop:6}}>{balance.mine||balance.theirs?t('reciprocityBody',balance.mine,balance.theirs):t('balanceEven')}</Text>
  </Card>

  <Card>
   <Text style={{fontSize:13,fontWeight:'800',color:c.muted,marginBottom:10}}>{t('addPromise').toUpperCase()}</Text>
   <View style={{flexDirection:'row',gap:8,marginBottom:12}}>
    <Chip label={t('owedByMe')} selected={direction==='owed_by_me'} onPress={()=>setDirection('owed_by_me')}/>
    <Chip label={t('owedToMe')} selected={direction==='owed_to_me'} onPress={()=>setDirection('owed_to_me')}/>
   </View>
   <ContactSelect label={t('choosePersonPrompt')} value={contact} onChange={setContact}/>
   <Field label={t('promiseText')} value={text} onChangeText={setText}/>
   <Field label={t('dueDate')} hint={t('dateHint')} value={due} onChangeText={setDue} keyboardType="numbers-and-punctuation" autoCapitalize="none"/>
   <Btn label={t('savePromise')} busy={saving} onPress={()=>void save()}/>
  </Card>

  <View style={{flexDirection:'row',gap:8,marginTop:18}}>
   <Chip label={t('filterAll')} selected={!filter} onPress={()=>setFilter(undefined)}/>
   <Chip label={t('owedByMe')} selected={filter==='owed_by_me'} onPress={()=>setFilter('owed_by_me')}/>
   <Chip label={t('owedToMe')} selected={filter==='owed_to_me'} onPress={()=>setFilter('owed_to_me')}/>
  </View>

  <FlatList data={items} keyExtractor={x=>x.id} contentContainerStyle={{paddingTop:16,paddingBottom:30}}
   ListEmptyComponent={<Empty>{t('noPromises')}</Empty>}
   renderItem={({item})=><View style={{backgroundColor:c.card,borderRadius:radius.md,padding:16,marginBottom:9,flexDirection:'row',alignItems:'center',minHeight:HIT+16}}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:Boolean(item.completed_at)}} accessibilityLabel={item.text} hitSlop={hitSlop}
     onPress={async()=>{await CommitmentRepository.complete(item.id,!item.completed_at);await load()}}
     style={{width:26,height:26,borderRadius:8,borderWidth:2,borderColor:item.completed_at?c.teal:c.line,backgroundColor:item.completed_at?c.teal:'transparent',alignItems:'center',justifyContent:'center'}}>
     {item.completed_at?<Ionicons name="checkmark" size={16} color="#fff"/>:null}
    </Pressable>
    <View style={{marginLeft:12,flex:1}}>
     <Text style={{color:item.completed_at?c.muted:c.ink,fontWeight:'800',textDecorationLine:item.completed_at?'line-through':'none'}}>
      {item.direction==='owed_by_me'?'↑':'↓'} {item.text}
     </Text>
     <Text style={{color:c.muted,fontSize:12,marginTop:4}}>
      {item.display_name||`${item.first_name??''} ${item.last_name??''}`.trim()}{item.due_at?` · ${formatDate(item.due_at,language)}`:''}
     </Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.text} — ${t('delete')}`} hitSlop={hitSlop}
     onPress={async()=>{await CommitmentRepository.remove(item.id);await load()}} style={{width:HIT,height:HIT,alignItems:'center',justifyContent:'center'}}>
     <Ionicons name="trash-outline" size={18} color={c.muted}/>
    </Pressable>
   </View>}/>
 </Screen>;
}
