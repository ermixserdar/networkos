import {useCallback,useState} from 'react';
import {Alert,Switch,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Contact,Interaction} from '@/types';
import {InteractionRepository} from '@/repositories/InteractionRepository';
import {CommitmentRepository} from '@/repositories/CommitmentRepository';
import {MatchedMeeting,MeetingBriefService} from '@/services/MeetingBriefService';
import {NotificationService} from '@/services/NotificationService';
import {meetingQuestions,summarizeInteraction} from '@/services/InteractionInsights';
import {contactName} from '@/components/ContactRow';
import {ContactSelect} from '@/components/ContactSelect';
import {BackLink,Btn,Card,Field,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {formatDate} from '@/utils/format';
import {useTranslation} from '@/i18n';

export default function MeetingPrep(){
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [selected,setSelected]=useState<Contact|null>(null);
 const [interactions,setInteractions]=useState<Interaction[]>([]);
 const [promises,setPromises]=useState<string[]>([]);
 const [transcript,setTranscript]=useState('');
 const [summary,setSummary]=useState<{summary:string;actions:string[]}|null>(null);
 const [meetings,setMeetings]=useState<MatchedMeeting[]>([]);
 const [calendarOn,setCalendarOn]=useState(false);
 const [briefsOn,setBriefsOn]=useState(false);

 const load=useCallback(async()=>{
  const [permission,enabled]=await Promise.all([
   MeetingBriefService.getPermission(),
   NotificationService.isBriefEnabled(),
  ]);
  setCalendarOn(permission);setBriefsOn(enabled);
  if(permission)setMeetings(await MeetingBriefService.upcoming());
 },[]);
 useFocusRefresh(load);

 const pick=async(contact:Contact|null)=>{
  setSelected(contact);setSummary(null);
  if(!contact){setInteractions([]);setPromises([]);return}
  const [history,open]=await Promise.all([
   InteractionRepository.listForContact(contact.id,10),
   CommitmentRepository.list({contactId:contact.id,openOnly:true}),
  ]);
  setInteractions(history);
  setPromises(open.filter(x=>x.direction==='owed_by_me').map(x=>x.text));
 };

 const enableCalendar=async()=>{
  const ok=await MeetingBriefService.requestPermission();
  setCalendarOn(ok);
  if(ok)setMeetings(await MeetingBriefService.upcoming());
 };

 const toggleBriefs=async(value:boolean)=>{
  const ok=await NotificationService.setBriefEnabled(value);
  setBriefsOn(value&&ok);
  await MeetingBriefService.refreshBriefs();
 };

 const save=async()=>{
  if(!selected||!summary)return;
  await InteractionRepository.create({
   contact_id:selected.id,type:'meeting',interaction_at:Date.now(),title:t('meetingPrep'),
   description:`${summary.summary}${summary.actions.length?`\n\n${summary.actions.map(x=>`- ${x}`).join('\n')}`:''}`,
  });
  Alert.alert(t('interactionSaved'));
  setTranscript('');setSummary(null);
 };

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('meetingPrep')}</Title>
  <Subtitle>{t('meetingPrepSubtitle')}</Subtitle>

  {/* The calendar half turns prep from something you must remember into something that arrives. */}
  {calendarOn?<>
   <Card>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
     <Text style={{fontSize:16,fontWeight:'800',color:c.ink,flex:1,paddingRight:12}}>{briefsOn?t('briefToggleOn'):t('briefToggleOff')}</Text>
     <Switch accessibilityLabel={t('briefToggleOn')} value={briefsOn} onValueChange={value=>void toggleBriefs(value)} trackColor={{true:c.teal,false:c.line}}/>
    </View>
    <Text style={{color:c.muted,marginTop:6,lineHeight:20}}>{t('briefHint')}</Text>
   </Card>
   <SectionLabel style={{marginTop:22}}>{t('upcomingMeetings').toUpperCase()}</SectionLabel>
   {meetings.length?meetings.map(meeting=><Card key={meeting.id} style={{marginBottom:10}}>
    <Text style={{color:c.ink,fontWeight:'800',fontSize:16}}>{meeting.title}</Text>
    <Text style={{color:c.muted,marginTop:5}}>{formatDate(meeting.startsAt,language)} · {t('matchedAttendees',meeting.contacts.length)}</Text>
    <Btn label={t('openBrief')} variant="ghost" style={{marginTop:12}} onPress={()=>void pick(meeting.contacts[0])}/>
   </Card>):<Text style={{color:c.muted}}>{t('noUpcoming')}</Text>}
  </>:<Card>
   <Text style={{fontSize:17,fontWeight:'800',color:c.ink}}>{t('calendarPermission')}</Text>
   <Text style={{color:c.muted,lineHeight:21,marginTop:7}}>{t('calendarBody')}</Text>
   <Btn label={t('allowCalendar')} style={{marginTop:16}} onPress={()=>void enableCalendar()}/>
  </Card>}

  <SectionLabel style={{marginTop:26}}>{t('choosePersonLabel').toUpperCase()}</SectionLabel>
  <ContactSelect label={t('choosePersonLabel')} value={selected} onChange={contact=>void pick(contact)}/>

  {selected?<>
   <Card>
    <Text style={{fontSize:13,fontWeight:'900',color:c.muted}}>{t('contactContext').toUpperCase()}</Text>
    <Text style={{fontSize:20,fontWeight:'800',color:c.ink,marginTop:7}}>{contactName(selected)}</Text>
    <Text style={{color:c.muted,marginTop:5}}>{[selected.job_title,selected.company_name].filter(Boolean).join(' · ')||t('noContextYet')}</Text>
    {selected.notes?<Text numberOfLines={4} style={{color:c.muted,lineHeight:20,marginTop:10}}>{selected.notes}</Text>:null}
   </Card>

   {promises.length?<Card tone="coral" style={{marginTop:12}}>
    <Text style={{fontSize:12,fontWeight:'900',color:c.coralInk}}>{t('openPromisesLabel').toUpperCase()}</Text>
    {promises.map(text=><Text key={text} style={{color:c.ink,marginTop:8}}>↑ {text}</Text>)}
   </Card>:null}

   {interactions.length?<Card style={{marginTop:12}}>
    <Text style={{fontSize:12,fontWeight:'900',color:c.muted}}>{t('lastInteractionsLabel').toUpperCase()}</Text>
    {interactions.slice(0,3).map(item=><Text key={item.id} style={{color:c.ink,marginTop:8}}>· {item.title||t(`type_${item.type}` as never)}</Text>)}
   </Card>:null}

   <SectionLabel style={{marginTop:24}}>{t('suggestedQuestions').toUpperCase()}</SectionLabel>
   {meetingQuestions(selected,interactions,language,promises).map(question=><Card key={question} tone="sage" style={{marginBottom:7}}>
    <Text style={{color:c.ink,fontWeight:'700'}}>{question}</Text>
   </Card>)}

   <SectionLabel style={{marginTop:24}}>{t('transcriptLabel').toUpperCase()}</SectionLabel>
   <Field label={t('transcriptLabel')} hint={t('transcriptPlaceholder')} value={transcript} onChangeText={setTranscript} multiline style={{minHeight:125,textAlignVertical:'top'}}/>
   <Btn label={t('createSummary')} variant="outline" disabled={!transcript.trim()} onPress={()=>setSummary(summarizeInteraction(transcript))}/>

   {summary?<Card tone="coral" style={{marginTop:14}}>
    <Text style={{color:c.ink,lineHeight:22}}>{summary.summary}</Text>
    {summary.actions.length?<Text style={{color:c.ink,fontWeight:'700',marginTop:10}}>{summary.actions.map(x=>`• ${x}`).join('\n')}</Text>:null}
    <Btn label={t('saveInteraction')} style={{marginTop:14}} onPress={()=>void save()}/>
   </Card>:null}
  </>:null}
 </ScreenScroll>;
}
