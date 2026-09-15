import {generateShareCode,sealChunks} from '@/utils/crypto';
import {EnvelopeFile} from '@/services/EnvelopeFile';
import {translate} from '@/i18n';
import {useAppStore} from '@/stores/useAppStore';
import {BackupService} from '@/services/BackupService';
import {SnapshotService} from '@/services/SnapshotService';

/**
 * Selective sharing used to encrypt with the sender's own device key, which meant the recipient
 * could never open the file. Each share now gets a one-time code the sender passes along
 * out of band — the only shape that makes "encrypted share" mean anything.
 */
export const ShareService={
 shareContacts:async(ids:string[])=>{
  const code=generateShareCode();
  const snapshot=SnapshotService.detachForeignKeys(await SnapshotService.collect({table:'contacts',ids}));
  const encoder=new TextEncoder();
  const envelope=sealChunks({
   __meta:encoder.encode(JSON.stringify({exported_at:snapshot.exported_at,version:3})),
   contacts:encoder.encode(JSON.stringify(snapshot.tables.contacts)),
  },code);
  const uri=await EnvelopeFile.write('networkos-shared',envelope);
  await EnvelopeFile.share(uri,translate(useAppStore.getState().language)('shareContactsTitle'));
  return {uri,code};
 },
 receiveContacts:async(code:string)=>{
  const contents=await EnvelopeFile.pick();
  if(!contents)return null;
  const snapshot=await BackupService.readEnvelope(contents,code);
  return SnapshotService.merge(SnapshotService.detachForeignKeys(snapshot));
 },
};
