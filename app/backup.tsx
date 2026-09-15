import {useCallback,useState} from 'react';
import {Alert,Text} from 'react-native';
import {useRouter} from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {BackupService,WrongKeyError} from '@/services/BackupService';
import {RecoveryKeyService} from '@/services/RecoveryKeyService';
import {BackLink,Btn,Card,Field,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function Backup(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [key,setKey]=useState('');
 const [revealed,setRevealed]=useState(false);
 const [entered,setEntered]=useState('');
 const [busy,setBusy]=useState(false);

 useFocusRefresh(useCallback(async()=>{setKey(await RecoveryKeyService.get())},[]));

 const exportBackup=async()=>{
  setBusy(true);
  try{await BackupService.shareJson()}
  catch{Alert.alert(t('backupFailed'),t('backupFailedBody'))}
  finally{setBusy(false)}
 };

 const restore=async()=>{
  setBusy(true);
  try{
   const result=await BackupService.restoreMerge(entered.trim()||undefined);
   if(result)Alert.alert(t('restoreComplete'),t('restoreCompleteBody',result.applied));
  }catch(error){
   if(error instanceof WrongKeyError)Alert.alert(t('wrongKeyTitle'),t('wrongKeyBody'));
   else Alert.alert(t('restoreFailed'),t('restoreFailedBody'));
  }finally{setBusy(false)}
 };

 const exportCsv=()=>Alert.alert(t('csvWarnTitle'),t('csvWarnBody'),[
  {text:t('cancel'),style:'cancel'},
  {text:t('exportCsvAction'),onPress:async()=>{try{await BackupService.shareCsv()}catch{Alert.alert(t('exportFailed'),t('exportFailedBody'))}}},
 ]);

 const confirmRestore=()=>Alert.alert(t('restoreConfirm'),t('restoreConfirmBody'),[
  {text:t('cancel'),style:'cancel'},
  {text:t('chooseBackup'),onPress:()=>void restore()},
 ]);

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('backup')}</Title>
  <Subtitle>{t('backupSubtitle')}</Subtitle>

  <Card tone="coral">
   <Text style={{fontSize:12,fontWeight:'900',color:c.coralInk}}>{t('recoveryKeyTitle').toUpperCase()}</Text>
   <Text style={{color:c.ink,lineHeight:21,marginTop:8}}>{t('recoveryKeyBody')}</Text>
   {revealed?<Text selectable style={{color:c.ink,fontSize:18,fontWeight:'800',letterSpacing:1.5,marginTop:12}}>{key}</Text>:null}
   <Btn label={revealed?t('hideKey'):t('revealKey')} variant="outline" style={{marginTop:12}} onPress={()=>setRevealed(!revealed)}/>
   {revealed?<Btn label={t('copyKey')} variant="ghost" style={{marginTop:8}} onPress={async()=>{await Clipboard.setStringAsync(key);Alert.alert(t('keyCopied'))}}/>:null}
  </Card>

  <Btn label={t('exportEncrypted')} busy={busy} style={{marginTop:22}} onPress={()=>void exportBackup()}/>
  <Btn label={t('exportCsv')} variant="outline" style={{marginTop:12}} onPress={exportCsv}/>

  <SectionLabel style={{marginTop:28}}>{t('restoreEncrypted').toUpperCase()}</SectionLabel>
  <Card>
   <Text style={{color:c.muted,lineHeight:20,marginBottom:12}}>{t('mergeBody')}</Text>
   <Field label={t('enterRecoveryKey')} hint={t('optional')} value={entered} onChangeText={setEntered} autoCapitalize="characters" autoCorrect={false}/>
   <Btn label={t('restoreEncrypted')} variant="danger" busy={busy} onPress={confirmRestore}/>
  </Card>
 </ScreenScroll>;
}
