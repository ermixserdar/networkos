import {useCallback,useState} from 'react';
import {Alert,Text} from 'react-native';
import {useRouter} from 'expo-router';
import {SyncService} from '@/services/SyncService';
import {WrongKeyError} from '@/services/BackupService';
import {BackLink,Btn,Card,Field,ScreenScroll,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {formatDate} from '@/utils/format';
import {useTranslation} from '@/i18n';

export default function Sync(){
 const router=useRouter();
 const {t,language}=useTranslation();
 const {c}=useTheme();
 const [lastSync,setLastSync]=useState<number|null>(null);
 const [key,setKey]=useState('');
 const [busy,setBusy]=useState(false);
 const [conflicts,setConflicts]=useState(0);

 const load=useCallback(async()=>{setLastSync(await SyncService.lastSyncAt())},[]);
 useFocusRefresh(load);

 const run=async(action:'export'|'import')=>{
  setBusy(true);
  try{
   if(action==='export')await SyncService.exportBundle();
   else{
    const result=await SyncService.importBundle(key.trim()||undefined);
    if(result){
     setConflicts(result.conflicts);
     Alert.alert(result.applied?t('syncApplied',result.applied):t('syncNoChanges'),result.conflicts?t('syncConflicts',result.conflicts):undefined);
    }
   }
   await load();
  }catch(error){
   if(error instanceof WrongKeyError)Alert.alert(t('wrongKeyTitle'),t('wrongKeyBody'));
   else Alert.alert(t('somethingWrong'));
  }finally{setBusy(false)}
 };

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('syncDevices')}</Title>
  <Subtitle>{t('syncSubtitle')}</Subtitle>

  <Card tone="sage">
   <Text style={{fontSize:12,fontWeight:'900',color:c.teal}}>{t('syncHow').toUpperCase()}</Text>
   <Text style={{color:c.ink,lineHeight:21,marginTop:8}}>{t('syncHowBody')}</Text>
   <Text style={{color:c.muted,marginTop:10}}>{t('syncSameKeyHint')}</Text>
  </Card>

  <Text style={{color:c.muted,marginTop:18}}>{lastSync?t('lastSyncAt',formatDate(lastSync,language)):t('lastSyncNever')}</Text>
  {conflicts?<Card tone="coral" style={{marginTop:12}}><Text style={{color:c.ink,lineHeight:21}}>{t('syncConflicts',conflicts)}</Text></Card>:null}

  <Btn label={t('exportBundle')} busy={busy} style={{marginTop:16}} onPress={()=>void run('export')}/>
  <Card style={{marginTop:16}}>
   <Field label={t('enterRecoveryKey')} hint={t('optional')} value={key} onChangeText={setKey} autoCapitalize="characters" autoCorrect={false}/>
   <Btn label={t('importBundle')} variant="outline" busy={busy} onPress={()=>void run('import')}/>
  </Card>
 </ScreenScroll>;
}
