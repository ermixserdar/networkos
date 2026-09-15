import {useCallback,useState} from 'react';
import {Alert,Text} from 'react-native';
import {useRouter} from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import {Contact} from '@/types';
import {ContactRepository} from '@/repositories/ContactRepository';
import {VaultService} from '@/services/VaultService';
import {ContactRow} from '@/components/ContactRow';
import {BackLink,Btn,Card,Empty,ScreenScroll,SectionLabel,Subtitle,Title,useFocusRefresh} from '@/components/ui';
import {useTheme} from '@/theme';
import {useTranslation} from '@/i18n';

export default function Vault(){
 const router=useRouter();
 const {t}=useTranslation();
 const {c}=useTheme();
 const [unlocked,setUnlocked]=useState(VaultService.isUnlocked());
 const [people,setPeople]=useState<Contact[]>([]);

 const load=useCallback(async()=>{
  setUnlocked(VaultService.isUnlocked());
  setPeople(VaultService.isUnlocked()?(await ContactRepository.list({limit:200})).filter(x=>x.private):[]);
 },[]);
 useFocusRefresh(load);

 const unlock=async()=>{
  const available=await LocalAuthentication.hasHardwareAsync()&&await LocalAuthentication.isEnrolledAsync();
  if(!available){Alert.alert(t('biometricsUnavailable'),t('biometricsUnavailableBody'));return}
  const result=await LocalAuthentication.authenticateAsync({promptMessage:t('unlockVault'),cancelLabel:t('cancel')});
  if(!result.success)return;
  VaultService.unlock();
  await load();
 };
 const lock=async()=>{VaultService.lock();await load()};

 return <ScreenScroll>
  <BackLink label={t('backMore')} onPress={()=>router.back()}/>
  <Title>{t('vault')}</Title>
  <Subtitle>{t('vaultSubtitle')}</Subtitle>

  <Card tone={unlocked?'sage':'card'}>
   <Text style={{fontSize:17,fontWeight:'800',color:c.ink}}>{unlocked?t('vaultUnlocked'):t('vaultLocked')}</Text>
   <Text style={{color:c.muted,lineHeight:21,marginTop:6}}>{unlocked?t('vaultUnlockedBody'):t('vaultLockedBody')}</Text>
   <Btn label={unlocked?t('lockVault'):t('unlockVault')} variant={unlocked?'outline':'primary'} style={{marginTop:16}}
    onPress={()=>void(unlocked?lock():unlock())}/>
  </Card>

  {unlocked?<>
   <SectionLabel style={{marginTop:26}}>{t('vaultCount',people.length).toUpperCase()}</SectionLabel>
   {people.length?people.map(contact=><ContactRow key={contact.id} contact={contact} onPress={()=>router.push(`/contacts/${contact.id}` as never)}/>)
    :<Empty>{t('privateHint')}</Empty>}
  </>:null}
 </ScreenScroll>;
}
