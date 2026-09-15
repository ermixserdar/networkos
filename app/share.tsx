import {useState} from 'react';
import {Alert,FlatList,Text} from 'react-native';
import {useRouter} from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {useContacts} from '@/hooks/useContacts';
import {ShareService} from '@/services/ShareService';
import {WrongKeyError} from '@/services/BackupService';
import {contactName} from '@/components/ContactRow';
import {BackLink,Btn,Card,Checkbox,Empty,Field,Loading,Screen,SectionLabel,Subtitle,Title} from '@/components/ui';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function ShareContacts(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [query,setQuery]=useState('');
 const {contacts,total,loadMore,hasMore}=useContacts({q:query});
 const [selected,setSelected]=useState<string[]>([]);
 const [code,setCode]=useState<string|null>(null);
 const [incomingCode,setIncomingCode]=useState('');
 const [busy,setBusy]=useState(false);

 const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);

 const send=async()=>{
  setBusy(true);
  try{
   const result=await ShareService.shareContacts(selected);
   setCode(result.code);
  }catch{Alert.alert(t('shareFailed'))}
  finally{setBusy(false)}
 };

 const receive=async()=>{
  if(!incomingCode.trim())return;
  setBusy(true);
  try{
   const result=await ShareService.receiveContacts(incomingCode);
   if(result)Alert.alert(t('importedContacts',result.applied));
  }catch(error){
   Alert.alert(error instanceof WrongKeyError?t('wrongKeyTitle'):t('shareFailed'),error instanceof WrongKeyError?t('wrongKeyBody'):undefined);
  }finally{setBusy(false)}
 };

 return <Screen>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('secureSharing')}</Title>
  <Subtitle>{t('secureSharingSubtitle')}</Subtitle>

  {code?<Card tone="coral" style={{marginBottom:14}}>
   <Text style={{fontSize:12,fontWeight:'900',color:c.coralInk}}>{t('shareCodeTitle').toUpperCase()}</Text>
   <Text selectable style={{color:c.ink,fontSize:22,fontWeight:'800',letterSpacing:2,marginTop:8}}>{code}</Text>
   <Text style={{color:c.muted,marginTop:8,lineHeight:20}}>{t('shareCodeBody')}</Text>
   <Btn label={t('copyCode')} variant="outline" style={{marginTop:12}} onPress={async()=>{await Clipboard.setStringAsync(code);Alert.alert(t('codeCopied'))}}/>
  </Card>:null}

  <Field label={t('searchNetwork')} hint={t('findPerson')} value={query} onChangeText={setQuery}/>
  <FlatList data={contacts} keyExtractor={x=>x.id} contentContainerStyle={{paddingBottom:16}} style={{maxHeight:300}}
   onEndReachedThreshold={0.4} onEndReached={()=>{void loadMore()}}
   ListEmptyComponent={<Empty>{query?t('noMatches'):t('noContactsToShare')}</Empty>}
   ListFooterComponent={hasMore?<Loading/>:null}
   renderItem={({item})=><Checkbox checked={selected.includes(item.id)} label={contactName(item)} onPress={()=>toggle(item.id)}/>}/>
  {/* Selection survives filtering, so the count is the honest total rather than what is on screen. */}
  <Text style={{color:c.muted,fontSize:12,marginBottom:8}}>{t('peopleCount',total)}</Text>

  <Btn label={`${t('shareAction')} (${selected.length})`} busy={busy} disabled={!selected.length} onPress={()=>void send()}/>

  <SectionLabel style={{marginTop:26}}>{t('receiveTitle').toUpperCase()}</SectionLabel>
  <Card>
   <Text style={{color:c.muted,lineHeight:20,marginBottom:12}}>{t('receiveBody')}</Text>
   <Field label={t('enterShareCode')} value={incomingCode} onChangeText={setIncomingCode} autoCapitalize="characters" autoCorrect={false}/>
   <Btn label={t('receiveAction')} variant="outline" busy={busy} disabled={!incomingCode.trim()} onPress={()=>void receive()}/>
  </Card>
 </Screen>;
}
