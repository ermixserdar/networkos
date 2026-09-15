import {useCallback,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {isEncrypted} from '@/database/database';
import {GRACE_OPTIONS,Grace,LockMode,SecurityService} from '@/services/SecurityService';
import {NotificationService} from '@/services/NotificationService';
import {CommitmentRepository} from '@/repositories/CommitmentRepository';
import {FollowUpService} from '@/services/FollowUpService';
import {BackLink,Btn,Card,Chip,ScreenScroll,SectionLabel,Subtitle,SwitchRow,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {TranslationKey,useTranslation} from '@/i18n';

const GRACE_LABELS:Record<number,TranslationKey>={0:'autoLockImmediate',60000:'autoLockMinute',300000:'autoLockFive'};

export default function Security(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [mode,setMode]=useState<LockMode>('off');
 const [grace,setGrace]=useState<Grace>(0);
 const [privacy,setPrivacy]=useState(true);
 const [digest,setDigest]=useState(false);

 useFocusRefresh(useCallback(async()=>{
  const [currentMode,currentGrace,currentPrivacy,currentDigest]=await Promise.all([
   SecurityService.getMode(),SecurityService.getGrace(),SecurityService.getPrivacyScreen(),NotificationService.isDigestEnabled(),
  ]);
  setMode(currentMode);setGrace(currentGrace);setPrivacy(currentPrivacy);setDigest(currentDigest);
 },[]));

 const toggleLock=async()=>{
  if(mode==='biometric'){await SecurityService.setMode('off');setMode('off');return}
  const ok=await SecurityService.enableBiometric();
  if(ok)setMode('biometric');
  else Alert.alert(t('biometricsUnavailable'),t('biometricsUnavailableBody'));
 };

 const toggleDigest=async(value:boolean)=>{
  const [overdue,due]=await Promise.all([FollowUpService.list('overdue'),CommitmentRepository.dueCount()]);
  const enabled=await NotificationService.setDigestEnabled(value,{cooling:overdue.length,due});
  setDigest(enabled);
 };

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('security')}</Title>
  <Subtitle>{t('securitySubtitle')}</Subtitle>

  <Card>
   <Text style={{fontSize:17,fontWeight:'800',color:c.ink}}>{t('appLock')}</Text>
   <Text style={{color:c.muted,marginTop:5,lineHeight:20}}>{t('appLockBody')}</Text>
   <Btn label={mode==='biometric'?t('disableBiometric'):t('enableBiometric')} variant={mode==='biometric'?'outline':'primary'} style={{marginTop:16}} onPress={()=>void toggleLock()}/>
   {mode==='biometric'?<>
    <SectionLabel style={{marginTop:20}}>{t('autoLockTitle').toUpperCase()}</SectionLabel>
    <View style={{flexDirection:'row',gap:8}}>
     {GRACE_OPTIONS.map(option=><Chip key={option} label={t(GRACE_LABELS[option])} selected={grace===option} onPress={()=>{setGrace(option);void SecurityService.setGrace(option)}}/>)}
    </View>
   </>:null}
  </Card>

  <SwitchRow label={t('privacyScreenTitle')} body={t('privacyScreenBody')} value={privacy}
   onChange={value=>{setPrivacy(value);void SecurityService.setPrivacyScreen(value)}}/>
  <SwitchRow label={t('digestTitle')} body={`${t('digestBody')} ${t('digestDay')}`} value={digest}
   onChange={value=>void toggleDigest(value)}/>

  {/* Honest about what the build actually does rather than what the marketing says. */}
  {!isEncrypted()?<Card tone="coral" style={{marginTop:16}}>
   <Text style={{color:c.coralInk,fontWeight:'800'}}>{t('cipherOffTitle')}</Text>
   <Text style={{color:c.ink,marginTop:6,lineHeight:20}}>{t('cipherOffBody')}</Text>
  </Card>:null}
 </ScreenScroll>;
}
