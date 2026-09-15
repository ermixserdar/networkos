import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {translate} from '@/i18n';
import {useAppStore} from '@/stores/useAppStore';

const KEY='networkos.app-lock';
const GRACE='networkos.app-lock.grace';
const PRIVACY='networkos.app-lock.privacy';
export type LockMode='off'|'biometric';
/** How long the app may stay unlocked in the background before asking again. */
export const GRACE_OPTIONS=[0,60_000,300_000] as const;
export type Grace=(typeof GRACE_OPTIONS)[number];

export const SecurityService={
 getMode:async():Promise<LockMode>=>((await SecureStore.getItemAsync(KEY)) as LockMode)||'off',
 setMode:async(mode:LockMode)=>{await SecureStore.setItemAsync(KEY,mode)},
 enableBiometric:async()=>{
  const available=await LocalAuthentication.hasHardwareAsync()&&await LocalAuthentication.isEnrolledAsync();
  if(!available)return false;
  const t=translate(useAppStore.getState().language);
  const result=await LocalAuthentication.authenticateAsync({promptMessage:t('enableLockPrompt'),cancelLabel:t('cancel')});
  if(result.success)await SecurityService.setMode('biometric');
  return result.success;
 },
 getGrace:async():Promise<Grace>=>{
  const value=Number(await AsyncStorage.getItem(GRACE));
  return (GRACE_OPTIONS as readonly number[]).includes(value)?value as Grace:0;
 },
 setGrace:async(value:Grace)=>{await AsyncStorage.setItem(GRACE,String(value))},
 /** Defaults on: a locked app that still shows contacts in the app switcher is not locked. */
 getPrivacyScreen:async()=>(await AsyncStorage.getItem(PRIVACY))!=='0',
 setPrivacyScreen:async(enabled:boolean)=>{await AsyncStorage.setItem(PRIVACY,enabled?'1':'0')},
};
