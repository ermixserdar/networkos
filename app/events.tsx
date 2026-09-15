import {useCallback,useState} from 'react';
import {Alert,FlatList,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Event} from '@/types';
import {EventRepository} from '@/repositories/EventRepository';
import {BackLink,Btn,Card,Empty,Field,Screen,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {HIT,radius,useTheme} from '@/theme';
import {formatDate,parseDateInput} from '@/utils/format';
import {useTranslation} from '@/i18n';

export default function Events(){
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [items,setItems]=useState<Event[]>([]);
 const [name,setName]=useState('');
 const [date,setDate]=useState('');
 const [location,setLocation]=useState('');
 const [saving,setSaving]=useState(false);

 const load=useCallback(async()=>{setItems(await EventRepository.list())},[]);
 useFocusRefresh(load);

 const save=async()=>{
  const eventAt=parseDateInput(date);
  if(!name.trim()||eventAt===null){Alert.alert(t('eventRequired'));return}
  setSaving(true);
  try{
   const id=await EventRepository.create(name,eventAt,location);
   setName('');setDate('');setLocation('');
   await load();
   router.push(`/events/${id}` as never);
  }finally{setSaving(false)}
 };

 return <Screen>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('eventMode')}</Title>
  <Subtitle>{t('eventModeSubtitle')}</Subtitle>
  <Card>
   <Field label={t('eventName')} value={name} onChangeText={setName}/>
   <Field label={t('eventDate')} hint={t('dateHint')} value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" autoCapitalize="none"/>
   <Field label={t('eventLocation')} value={location} onChangeText={setLocation}/>
   <Btn label={t('createEvent')} busy={saving} onPress={()=>void save()}/>
  </Card>
  <FlatList data={items} keyExtractor={x=>x.id} contentContainerStyle={{paddingTop:20,paddingBottom:30}}
   ListEmptyComponent={<Empty>{t('noEvents')}</Empty>}
   renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={()=>router.push(`/events/${item.id}` as never)}
    style={{backgroundColor:c.card,borderRadius:radius.md,padding:16,marginBottom:9,minHeight:HIT+20,flexDirection:'row',alignItems:'center'}}>
    <View style={{flex:1}}>
     <Text style={{color:c.ink,fontSize:17,fontWeight:'800'}}>{item.name}</Text>
     <Text style={{color:c.muted,marginTop:5}}>{formatDate(item.event_at,language)}{item.location?` · ${item.location}`:''}</Text>
     <Text style={{color:c.coral,fontWeight:'800',marginTop:6}}>{t('peopleAtEvent',item.contact_count??0)}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={c.muted}/>
   </Pressable>}/>
 </Screen>;
}
