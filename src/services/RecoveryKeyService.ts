import * as SecureStore from 'expo-secure-store';
import {generateRecoveryKey,normalizeSecret} from '@/utils/crypto';

const KEY='networkos.recovery-key';

/**
 * The secret that actually protects anything leaving the device. Generated once, held in the
 * keychain, and — unlike the database key — meant to be written down: it is the only way to open
 * a backup on a phone that is not this one.
 */
export const RecoveryKeyService={
 get:async()=>{
  let key=await SecureStore.getItemAsync(KEY);
  if(!key){key=generateRecoveryKey();await SecureStore.setItemAsync(KEY,key,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}
  return key;
 },
 /** Used when restoring onto a new device, or when pairing a second device to the same network. */
 set:async(key:string)=>{
  const normalized=normalizeSecret(key);
  if(normalized.length<20)throw Error('Recovery key is too short');
  await SecureStore.setItemAsync(KEY,formatted(normalized),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
  return formatted(normalized);
 },
 exists:async()=>Boolean(await SecureStore.getItemAsync(KEY)),
};

const formatted=(normalized:string)=>normalized.match(/.{1,4}/g)!.join('-');
