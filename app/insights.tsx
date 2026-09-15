import {useCallback,useState} from 'react';
import {Pressable,Share,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Insight,NetworkService} from '@/services/NetworkService';
import {IntroSuggestion,IntroductionService} from '@/services/IntroductionService';
import {contactName} from '@/components/ContactRow';
import {BackLink,Btn,Card,Empty,Loading,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {HIT,useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function Insights(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [insights,setInsights]=useState<Insight[]>([]);
 const [pairs,setPairs]=useState<IntroSuggestion[]>([]);
 const [loading,setLoading]=useState(true);
 const [openInsight,setOpenInsight]=useState<number|null>(null);
 const [evidence,setEvidence]=useState<Record<string,string>>({});

 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const [structural,suggestions]=await Promise.all([NetworkService.insights(),IntroductionService.suggestions()]);
   setInsights(structural);setPairs(suggestions);
  }finally{setLoading(false)}
 },[]);
 useFocusRefresh(load);

 const headline=(insight:Insight)=>{
  switch(insight.kind){
   case 'bridge':return {title:t('bridgesTitle'),body:t('bridgeBody',insight.name,insight.count),onPress:()=>router.push(`/contacts/${insight.contactId}` as never)};
   case 'cluster':return {title:t('clustersTitle'),body:t('clusterBody',insight.a,insight.b)};
   case 'concentration':return {title:t('concentrationTitle'),body:t('concentrationBody',insight.name,insight.percent)};
   case 'dormant':return {title:t('dormantTitle'),body:t('dormantBody',insight.count)};
  }
 };

 const reveal=async(index:number,ids:string[])=>{
  if(openInsight===index){setOpenInsight(null);return}
  setOpenInsight(index);
  setEvidence(await NetworkService.namesFor(ids));
 };

 const introduce=async(pair:IntroSuggestion)=>{
  const message=t('introPairMessage',contactName(pair.a),contactName(pair.b),t(pair.reason.key,pair.reason.value));
  await Share.share({message});
 };

 const dismiss=async(pair:IntroSuggestion)=>{
  await IntroductionService.dismiss(pair.a.id,pair.b.id);
  setPairs(current=>current.filter(x=>!(x.a.id===pair.a.id&&x.b.id===pair.b.id)));
 };

 return <ScreenScroll>
  <BackLink label={t('back')} onPress={()=>router.back()}/>
  <Title>{t('insights')}</Title>
  <Subtitle>{t('insightsSubtitle')}</Subtitle>

  {loading?<Loading/>:<>
   {insights.map((insight,index)=>{
    const copy=headline(insight);
    const open=openInsight===index;
    return <Card key={`${insight.kind}-${index}`} tone={insight.kind==='concentration'?'coral':'card'} style={{marginBottom:10}}>
     <Text style={{fontSize:12,fontWeight:'900',color:c.muted,letterSpacing:0.6}}>{copy.title.toUpperCase()}</Text>
     <Text style={{color:c.ink,fontSize:16,lineHeight:23,fontWeight:'700',marginTop:7}}>{copy.body}</Text>
     {/* An insight that will not show its working is just an assertion. */}
     {insight.evidence.length?<Btn label={open?t('hideEvidence'):t('showEvidence')} variant="ghost" style={{marginTop:12}} onPress={()=>void reveal(index,insight.evidence)}/>:null}
     {open?insight.evidence.map(id=><Pressable key={id} accessibilityRole="button" accessibilityLabel={evidence[id]??id}
      onPress={()=>router.push(`/contacts/${id}` as never)} style={{minHeight:HIT,justifyContent:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:c.line}}>
      <Text style={{color:c.ink,fontWeight:'700'}}>{evidence[id]??id}</Text>
     </Pressable>):null}
     {copy.onPress?<Btn label={t('profileLink')} variant="ghost" onPress={copy.onPress} style={{marginTop:12}}/>:null}
    </Card>;
   })}

   {pairs.length?<>
    <SectionLabel style={{marginTop:24}}>{t('introSuggestionsTitle').toUpperCase()}</SectionLabel>
    {pairs.map(pair=><Card key={`${pair.a.id}-${pair.b.id}`} style={{marginBottom:10}}>
     <Text style={{color:c.ink,fontSize:17,fontWeight:'800'}}>{contactName(pair.a)} · {contactName(pair.b)}</Text>
     <Text style={{color:c.muted,marginTop:5}}>{t(pair.reason.key,pair.reason.value)}</Text>
     <View style={{flexDirection:'row',gap:8,marginTop:12}}>
      <Btn label={t('makeIntro')} onPress={()=>void introduce(pair)} style={{flex:1}}/>
      <Btn label={t('dismissSuggestion')} variant="outline" onPress={()=>void dismiss(pair)} style={{flex:1}}/>
     </View>
    </Card>)}
   </>:null}

   {!insights.length&&!pairs.length?<Empty>{t('noInsights')}</Empty>:null}
  </>}
 </ScreenScroll>;
}
