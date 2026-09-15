import {useCallback,useState} from 'react';
import {Image,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Commitment,Contact} from '@/types';
import {ContactRepository} from '@/repositories/ContactRepository';
import {CommitmentRepository} from '@/repositories/CommitmentRepository';
import {relationshipScore} from '@/services/NetworkService';
import {contactName} from '@/components/ContactRow';
import {BackLink,Btn,Card,Empty,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {HIT,radius,shadow,useTheme} from '@/theme';
import {formatDayMonth,nextAnniversary} from '@/utils/format';
import {useTranslation} from '@/i18n';

const DAY=86400000;

export default function Today(){
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [focus,setFocus]=useState<Contact[]>([]);
 const [due,setDue]=useState<Commitment[]>([]);
 const [birthdays,setBirthdays]=useState<{contact:Contact;at:number}[]>([]);
 const [recall,setRecall]=useState<Contact[]>([]);
 const [recallIndex,setRecallIndex]=useState(0);
 const [revealed,setRevealed]=useState(false);

 const load=useCallback(async()=>{
  const [weakest,promises,withBirthday]=await Promise.all([
   ContactRepository.list({limit:200,order:'strength'}),
   CommitmentRepository.list({openOnly:true}),
   ContactRepository.withBirthday(),
  ]);
  const now=Date.now();
  setFocus(weakest.map(x=>({x,score:relationshipScore(x)})).filter(x=>x.score<55).sort((a,b)=>a.score-b.score).slice(0,5).map(x=>x.x));
  setDue(promises.filter(x=>!x.due_at||x.due_at<=now+DAY));
  // Spaced recall, applied to people instead of vocabulary: a face from the quiet end.
  setRecall(weakest.filter(x=>x.photo&&(!x.last_contact_at||now-x.last_contact_at>60*DAY)).slice(0,10));
  setRecallIndex(0);setRevealed(false);
  setBirthdays(withBirthday
   .map(contact=>({contact,at:nextAnniversary(contact.birthday!)}))
   .filter(x=>x.at<=now+30*DAY)
   .sort((a,b)=>a.at-b.at).slice(0,3));
 },[]);
 useFocusRefresh(load);

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('todayFocus')}</Title>
  <Subtitle>{t('todayFocusSubtitle')}</Subtitle>

  {due.length?<Card tone="coral" style={{marginBottom:18}}>
   <Text style={{fontSize:13,fontWeight:'900',color:c.coralInk}}>{t('openPromises')}</Text>
   {due.slice(0,3).map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.text} onPress={()=>router.push('/commitments' as never)} style={{minHeight:HIT,paddingTop:10}}>
    <Text style={{color:c.ink,fontWeight:'800'}}>{item.direction==='owed_by_me'?'↑':'↓'} {item.text}</Text>
    <Text style={{color:c.muted,fontSize:12,marginTop:3}}>{item.display_name||item.first_name||''}</Text>
   </Pressable>)}
  </Card>:null}

  {birthdays.length?<Card tone="sage" style={{marginBottom:18}}>
   <Text style={{fontSize:13,fontWeight:'900',color:c.teal}}>{t('birthdays')}</Text>
   {birthdays.map(item=><Pressable key={item.contact.id} accessibilityRole="button" accessibilityLabel={contactName(item.contact)} onPress={()=>router.push(`/contacts/${item.contact.id}` as never)} style={{minHeight:HIT,paddingTop:10}}>
    <Text style={{color:c.ink,fontWeight:'800'}}>{contactName(item.contact)} · {formatDayMonth(item.at,language)}</Text>
   </Pressable>)}
  </Card>:<Card style={{marginBottom:18}}><Text style={{color:c.muted}}>{t('noBirthdays')}</Text></Card>}

  {recall.length?(()=>{
   const person=recall[recallIndex%recall.length];
   return <Card style={{marginBottom:18,alignItems:'center'}}>
    <Text style={{fontSize:12,fontWeight:'900',color:c.muted,letterSpacing:0.6,alignSelf:'flex-start'}}>{t('rememberTitle')}</Text>
    <Image accessibilityIgnoresInvertColors accessibilityLabel={revealed?contactName(person):t('rememberPrompt')}
     source={{uri:person.photo!}} style={{width:140,height:140,borderRadius:70,marginTop:14,backgroundColor:c.sage}}/>
    <Text style={{color:c.ink,fontWeight:'800',fontSize:18,marginTop:12}}>{revealed?contactName(person):t('rememberPrompt')}</Text>
    <Text style={{color:c.muted,marginTop:4,textAlign:'center'}}>{revealed?[person.job_title,person.company_name].filter(Boolean).join(' · ')||t('rememberHint'):t('rememberHint')}</Text>
    <View style={{flexDirection:'row',gap:8,marginTop:14,alignSelf:'stretch'}}>
     {revealed
      ?<Btn label={t('rememberOpen')} variant="ghost" style={{flex:1}} onPress={()=>router.push(`/contacts/${person.id}` as never)}/>
      :<Btn label={t('rememberReveal')} variant="ghost" style={{flex:1}} onPress={()=>setRevealed(true)}/>}
     <Btn label={t('rememberNext')} variant="outline" style={{flex:1}} onPress={()=>{setRecallIndex(recallIndex+1);setRevealed(false)}}/>
    </View>
   </Card>;
  })():null}

  <SectionLabel>{t('relationshipPulse')}</SectionLabel>
  {focus.length?focus.map(contact=>{
   const score=relationshipScore(contact);
   return <Pressable key={contact.id} accessibilityRole="button" accessibilityLabel={`${contactName(contact)} ${t('scoreOf',score)}`} onPress={()=>router.push(`/contacts/${contact.id}` as never)}
    style={{backgroundColor:c.card,borderRadius:radius.md,padding:16,marginBottom:9,...shadow}}>
    <View style={{flexDirection:'row',justifyContent:'space-between'}}>
     <Text style={{fontSize:16,fontWeight:'800',color:c.ink,flex:1}}>{contactName(contact)}</Text>
     <Text style={{color:score<35?c.coral:c.muted,fontWeight:'900'}}>{t('scoreOf',score)}</Text>
    </View>
    <Text style={{color:c.muted,marginTop:5}}>{t('pulseHint')}</Text>
   </Pressable>;
  }):<Empty>{t('noSuggestions')}</Empty>}
 </ScreenScroll>;
}
