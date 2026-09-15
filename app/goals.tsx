import {useCallback,useState} from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Goal,Tag} from '@/types';
import {GoalRepository} from '@/repositories/GoalRepository';
import {TagRepository} from '@/repositories/TagRepository';
import {BackLink,Btn,Card,Chip,Empty,Field,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {HIT,hitSlop,radius,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

const DAY=86400000;
type Window='month'|'quarter'|'year';

/** End of the chosen window, so "this quarter" means the calendar quarter rather than 90 days. */
function windowRange(window:Window){
 const now=new Date();
 const start=new Date(now.getFullYear(),window==='year'?0:window==='quarter'?Math.floor(now.getMonth()/3)*3:now.getMonth(),1,0,0,0,0);
 const end=new Date(start);
 if(window==='year')end.setFullYear(start.getFullYear()+1);
 else end.setMonth(start.getMonth()+(window==='quarter'?3:1));
 return {startsAt:start.getTime(),endsAt:end.getTime()-1};
}

export default function Goals(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [goals,setGoals]=useState<Goal[]>([]);
 const [tags,setTags]=useState<Tag[]>([]);
 const [title,setTitle]=useState('');
 const [target,setTarget]=useState('5');
 const [tagId,setTagId]=useState<string|undefined>();
 const [window,setWindow]=useState<Window>('quarter');
 const [expanded,setExpanded]=useState<string|null>(null);
 const [contributors,setContributors]=useState<{id:string;name:string;count:number}[]>([]);
 const [saving,setSaving]=useState(false);

 const load=useCallback(async()=>{
  const [rows,allTags]=await Promise.all([GoalRepository.list(),TagRepository.list()]);
  setGoals(rows);setTags(allTags);
 },[]);
 useFocusRefresh(load);

 const save=async()=>{
  const count=Number(target);
  if(!title.trim()||!Number.isFinite(count)||count<1){Alert.alert(t('required'));return}
  setSaving(true);
  try{
   await GoalRepository.create({title,target:count,tagId,...windowRange(window)});
   setTitle('');
   await load();
  }finally{setSaving(false)}
 };

 const toggle=async(goal:Goal)=>{
  if(expanded===goal.id){setExpanded(null);return}
  setExpanded(goal.id);
  setContributors(await GoalRepository.contributors(goal));
 };

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('goals')}</Title>
  <Subtitle>{t('goalsSubtitle')}</Subtitle>

  <Card>
   <Field label={t('goalTitle')} value={title} onChangeText={setTitle}/>
   <Field label={t('goalTarget')} value={target} onChangeText={setTarget} keyboardType="number-pad"/>
   <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginBottom:8}}>{t('goalWindow')}</Text>
   <View style={{flexDirection:'row',gap:8,marginBottom:14}}>
    <Chip label={t('goalMonth')} selected={window==='month'} onPress={()=>setWindow('month')}/>
    <Chip label={t('goalQuarter')} selected={window==='quarter'} onPress={()=>setWindow('quarter')}/>
    <Chip label={t('goalYear')} selected={window==='year'} onPress={()=>setWindow('year')}/>
   </View>
   <Text style={{color:c.muted,fontSize:12,fontWeight:'800',marginBottom:8}}>{t('goalTag')}</Text>
   <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:14}}>
    <Chip label={t('goalAnyone')} selected={!tagId} onPress={()=>setTagId(undefined)}/>
    {tags.map(tag=><Chip key={tag.id} label={tag.name} selected={tagId===tag.id} onPress={()=>setTagId(tag.id)}/>)}
   </View>
   <Btn label={t('addGoal')} busy={saving} onPress={()=>void save()}/>
  </Card>

  <SectionLabel style={{marginTop:26}}>{t('goals').toUpperCase()}</SectionLabel>
  {goals.length?goals.map(goal=>{
   const progress=goal.progress??0;
   const done=progress>=goal.target;
   const daysLeft=Math.ceil((goal.ends_at-Date.now())/DAY);
   return <Card key={goal.id} tone={done?'sage':'card'} style={{marginBottom:10}}>
    <View style={{flexDirection:'row',alignItems:'center'}}>
     <View style={{flex:1}}>
      <Text style={{color:c.ink,fontWeight:'800',fontSize:16}}>{goal.title}</Text>
      <Text style={{color:c.muted,fontSize:12,marginTop:3}}>
       {t('goalProgress',progress,goal.target)}{goal.tag_name?` · ${goal.tag_name}`:''} · {done?t('goalDone'):daysLeft>=0?t('goalDaysLeft',daysLeft):t('goalEnded')}
      </Text>
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={`${goal.title} — ${t('delete')}`} hitSlop={hitSlop}
      onPress={async()=>{await GoalRepository.remove(goal.id);await load()}} style={{width:HIT,height:HIT,alignItems:'center',justifyContent:'center'}}>
      <Ionicons name="trash-outline" size={18} color={c.muted}/>
     </Pressable>
    </View>
    {/* A bar you can open: the number is only trustworthy if the people behind it are visible. */}
    <View style={{height:8,backgroundColor:c.line,borderRadius:4,marginTop:12,overflow:'hidden'}}>
     <View style={{height:8,width:`${Math.min(100,Math.round(progress/goal.target*100))}%`,backgroundColor:done?c.good:c.coral}}/>
    </View>
    <Btn label={expanded===goal.id?t('hideEvidence'):t('goalContributors')} variant="ghost" style={{marginTop:12}} onPress={()=>void toggle(goal)}/>
    {expanded===goal.id?(contributors.length?contributors.map(person=><Pressable key={person.id} accessibilityRole="button" accessibilityLabel={person.name}
     onPress={()=>router.push(`/contacts/${person.id}` as never)} style={{minHeight:HIT,justifyContent:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:c.line}}>
     <Text style={{color:c.ink,fontWeight:'700'}}>{person.name}</Text>
    </Pressable>):<Text style={{color:c.muted,marginTop:10}}>{t('goalNobodyYet')}</Text>):null}
   </Card>;
  }):<Empty>{t('noGoals')}</Empty>}
  <View style={{height:radius.lg}}/>
 </ScreenScroll>;
}
