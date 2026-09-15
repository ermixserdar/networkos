import {SyncState} from '@/database/database';
import {uuid} from '@/types';
import {EnvelopeFile} from '@/services/EnvelopeFile';
import {translate} from '@/i18n';
import {useAppStore} from '@/stores/useAppStore';
import {BackupService} from '@/services/BackupService';
import {SnapshotService} from '@/services/SnapshotService';
import {RecoveryKeyService} from '@/services/RecoveryKeyService';

/**
 * Device-to-device sync without a server: a full snapshot, sealed with the recovery key both
 * devices share, carried across by AirDrop or Files. Merging is last-write-wins per row, so the
 * bundle can travel in either direction, arrive out of order, or be imported twice.
 */
export const SyncService={
 deviceId:async()=>{
  const existing=await SyncState.get('device_id');
  if(existing)return existing;
  const id=uuid();
  await SyncState.set('device_id',id);
  return id;
 },
 lastSyncAt:async()=>{
  const value=await SyncState.get('last_sync_at');
  return value?Number(value):null;
 },
 exportBundle:async()=>{
  const envelope=await BackupService.buildEnvelope(await RecoveryKeyService.get(),{device_id:await SyncService.deviceId()});
  const uri=await EnvelopeFile.write('networkos-sync',envelope);
  await EnvelopeFile.share(uri,translate(useAppStore.getState().language)('shareSyncTitle'));
  await SyncState.set('last_sync_at',String(Date.now()));
  return uri;
 },
 importBundle:async(secret?:string)=>{
  const contents=await EnvelopeFile.pick();
  if(!contents)return null;
  const snapshot=await BackupService.readEnvelope(contents,secret);
  const result=await SnapshotService.merge(snapshot);
  await SyncState.set('last_sync_at',String(Date.now()));
  return result;
 },
};
