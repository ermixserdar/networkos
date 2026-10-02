import {useCallback,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Contact,Event} from '@/types';
import {EventRepository} from '@/repositories/EventRepository';
import {useContacts} from '@/hooks/useContacts';
import {NetworkService} from '@/services/NetworkService';
import {contactName} from '@/components/ContactRow';
import {BackLink,Btn,Card,Checkbox,Field,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {formatDate} from '@/utils/format';
import {useTranslation} from '@/i18n';

export default function EventDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [event,setEvent]=useState<Event|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [attendees,setAttendees]=useState<Contact[]>([]);
 const [query,setQuery]=useState('');
 const [busy,setBusy]=useState(false);
 const {contacts}=useContacts({q:query,pageSize:40});

 const load=useCallback(async()=>{
  const [current,people]=await Promise.all([EventRepository.get(id),EventRepository.attendees(id)]);
  setEvent(current);setAttendees(people);setSelected(people.map(x=>x.id));
 },[id]);
 useFocusRefresh(load);

 const toggle=async(contactId:string)=>{
  const next=selected.includes(contactId)?selected.filter(x=>x!==contactId):[...selected,contactId];
  setSelected(next);
  await EventRepository.setAttendees(id,next);
  setAttendees(await EventRepository.attendees(id));
 };

 /** Turns an attendee list into real edges — the graph is the point of event mode. */
 const connectEveryone=async()=>{
  if(selected.length<2)return;
  setBusy(true);
  try{
   let created=0;
   for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++){
    await NetworkService.upsert(selected[i],selected[j],'event',3);
    created++;
   }
   Alert.alert(t('connectionsCreated',created));
  }finally{setBusy(false)}
 };

 if(!event)return <View style={{flex:1,backgroundColor:c.paper}}/>;

 return <ScreenScroll>
  <BackLink label={t('back')} onPress={()=>router.back()}/>
  <Title>{event.name}</Title>
  <Subtitle>{formatDate(event.event_at,language)}{event.location?` · ${event.location}`:''}</Subtitle>

  <Card tone="sage">
   <Text style={{color:c.ink,fontWeight:'800'}}>{t('peopleAtEvent',attendees.length)}</Text>
   <Text style={{color:c.muted,marginTop:6,lineHeight:20}}>{t('connectAttendeesBody')}</Text>
   <Btn label={t('connectAttendees')} busy={busy} disabled={selected.length<2} onPress={()=>void connectEveryone()} style={{marginTop:12}}/>
  </Card>

   <SectionLabel style={{marginTop:24}}>{t('addPeopleToEvent').toUpperCase()}</SectionLabel>
   <Btn label={t('addPersonAtEvent')} variant="outline" icon="add" onPress={()=>router.push(`/contacts/form?eventId=${id}` as never)} style={{marginBottom:12}}/>
   <Field label={t('search')} value={query} onChangeText={setQuery}/>
  {contacts.length?contacts.map(contact=><Checkbox key={contact.id} checked={selected.includes(contact.id)} label={contactName(contact)}
   sublabel={[contact.job_title,contact.company_name].filter(Boolean).join(' · ')||undefined} onPress={()=>void toggle(contact.id)}/>)
   :<Text style={{color:c.muted}}>{t('eventPeopleEmpty')}</Text>}
 </ScreenScroll>;
}
