import {useState} from 'react';
import {Share,Text} from 'react-native';
import {useRouter} from 'expo-router';
import {Contact} from '@/types';
import {NetworkService} from '@/services/NetworkService';
import {contactName} from '@/components/ContactRow';
import {ContactSelect} from '@/components/ContactSelect';
import {BackLink,Btn,Card,ScreenScroll,Subtitle,Title} from '@/components/ui';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function Introductions(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [from,setFrom]=useState<Contact|null>(null);
 const [to,setTo]=useState<Contact|null>(null);
 const [path,setPath]=useState<string[]|null>(null);
 const [names,setNames]=useState<Record<string,string>>({});
 const [searched,setSearched]=useState(false);

 const find=async()=>{
  if(!from||!to)return;
  setSearched(true);
  const found=await NetworkService.shortestPath(from.id,to.id,6);
  setPath(found);
  if(found)setNames(await NetworkService.namesFor(found));
 };

 // The path can run through people who are not on screen, so names come from the fetched chain.
 const nameOf=(id:string)=>names[id]??id;
 const via=path&&path.length>2?path.slice(1,-1).map(nameOf).join(', '):t('introVia');
 const message=path&&to?t('introMessage',contactName(to),via):'';

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('introductions')}</Title>
  <Subtitle>{t('introductionsSubtitle')}</Subtitle>

  <Card tone="sage">
   <Text style={{color:c.ink,fontWeight:'800'}}>{t('introSuggestionsTitle')}</Text>
   <Btn label={t('insights')} variant="ghost" style={{marginTop:12}} onPress={()=>router.push('/insights' as never)}/>
  </Card>

  <ContactSelect label={t('startingPerson')} value={from} onChange={contact=>{setFrom(contact);setPath(null);setSearched(false)}}/>
  <ContactSelect label={t('destinationPerson')} value={to} exclude={from?.id} onChange={contact=>{setTo(contact);setPath(null);setSearched(false)}}/>

  <Btn label={t('findConnection')} disabled={!from||!to} style={{marginTop:24}} onPress={()=>void find()}/>

  {path?<Card style={{marginTop:18}}>
   <Text style={{fontSize:12,fontWeight:'900',color:c.coral}}>{path.length===2?t('directConnection'):t('shortestPath')}</Text>
   <Text style={{color:c.ink,fontSize:17,fontWeight:'800',lineHeight:26,marginTop:8}}>{path.map(nameOf).join('  →  ')}</Text>
   <Text style={{color:c.muted,lineHeight:21,marginTop:14}}>{message}</Text>
   <Btn label={t('shareMessage')} variant="ghost" style={{marginTop:14}} onPress={()=>void Share.share({message})}/>
  </Card>:searched?<Text style={{color:c.muted,marginTop:20}}>{t('noConnectionSix')}</Text>:null}
 </ScreenScroll>;
}
