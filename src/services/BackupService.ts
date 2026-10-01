import {getDatabase,getDatabaseKey} from '@/database/database';
import {EnvelopeError,isChunked,open,openChunks,sealChunks} from '@/utils/crypto';
import {EnvelopeFile} from '@/services/EnvelopeFile';
import {translate} from '@/i18n';
import {useAppStore} from '@/stores/useAppStore';
import {RecoveryKeyService} from '@/services/RecoveryKeyService';
import {ReminderPlanner} from '@/services/ReminderPlanner';
import {Snapshot,SnapshotService,BACKUP_TABLES} from '@/services/SnapshotService';
import type {SnapshotTable} from '@/services/SnapshotService';

export {BACKUP_TABLES};
export const CSV_UNENCRYPTED_WARNING='CSV export is NOT encrypted. Anyone with the file can read it.';

const CSV_KEYS=['first_name','last_name','display_name','job_title','email','phone','city','country','birthday','relationship_strength','importance','notes'];

export class WrongKeyError extends Error{constructor(){super('Wrong recovery key')}}

export const BackupService={
 collect:()=>SnapshotService.collect(),

 /** Encrypted with the recovery key, so it can be opened on a device this one has never met. */
 shareJson:async()=>{
  const envelope=await BackupService.buildEnvelope(await RecoveryKeyService.get());
  const uri=await EnvelopeFile.write('networkos-backup',envelope);
  return EnvelopeFile.share(uri,translate(useAppStore.getState().language)('shareBackupTitle'));
 },

 /** Seals table by table; the whole database is never a single string in memory. */
 buildEnvelope:async(secret:string,extra:Record<string,unknown>={})=>{
  const encoder=new TextEncoder();
  const chunks:Record<string,Uint8Array>={
   __meta:encoder.encode(JSON.stringify({exported_at:Date.now(),version:3,...extra})),
  };
  for(const table of SnapshotService.tables())
   chunks[table]=encoder.encode(JSON.stringify(await SnapshotService.collectTable(table)));
  return sealChunks(chunks,secret);
 },

 shareCsv:async()=>{
  const d=await getDatabase();
  // Plain text leaving the device never includes the vault, even when it is unlocked.
  const rows=await d.getAllAsync<Record<string,unknown>>(`SELECT ${CSV_KEYS.join(',')} FROM contacts WHERE deleted_at IS NULL AND private=0 ORDER BY first_name COLLATE NOCASE`);
  const cell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;
  const csv=[CSV_KEYS.join(','),...rows.map(row=>CSV_KEYS.map(k=>cell(k==='birthday'&&row[k]?new Date(Number(row[k])).toISOString().slice(0,10):row[k])).join(','))].join('\n');
  const uri=await EnvelopeFile.write('networkos-contacts',csv,'csv');
  return EnvelopeFile.share(uri,translate(useAppStore.getState().language)('shareCsvTitle'),'text/csv');
 },

 /**
  * Reads a v2 envelope with the supplied (or stored) recovery key, and still opens a legacy v1
  * envelope with this device's database key so backups taken before the change are not stranded.
  */
 readEnvelope:async(envelope:string,secret?:string):Promise<Snapshot>=>{
  const key=secret??await RecoveryKeyService.get();
  const decoder=new TextDecoder();
  try{
   if(isChunked(envelope)){
    const chunks=openChunks(envelope,key);
    const meta=chunks.__meta?JSON.parse(decoder.decode(chunks.__meta)):{};
    const tables:Record<string,SnapshotTable>={};
    for(const [name,bytes] of Object.entries(chunks))if(name!=='__meta')tables[name]=JSON.parse(decoder.decode(bytes));
    return {exported_at:Number(meta.exported_at)||Date.now(),version:3,device_id:meta.device_id,tables};
   }
   const parsed=JSON.parse(decoder.decode(open(envelope,key,await getDatabaseKey()))) as Snapshot;
   if(!parsed?.tables||(parsed.version!==1&&parsed.version!==2))throw Error('Unsupported NetworkOS backup');
   return parsed;
  }catch(error){
   if(error instanceof EnvelopeError&&error.reason==='auth')throw new WrongKeyError();
   throw error;
  }
 },

 restoreMerge:async(secret?:string)=>{
  const contents=await EnvelopeFile.pick();
  if(!contents)return null;
  const snapshot=await BackupService.readEnvelope(contents,secret);
  const result=await SnapshotService.merge(snapshot);
  // Restored follow-ups and birthdays with no schedule are silent misses; a deleted contact's
  // reminder with no cancellation is a stale ping. Reconcile covers both.
  await ReminderPlanner.reconcile();
  return result;
 },
};
