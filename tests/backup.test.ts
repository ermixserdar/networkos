jest.mock('expo-crypto',()=>({randomUUID:()=>'test-id'}));
jest.mock('../src/database/database',()=>({getDatabase:jest.fn(),getDatabaseKey:jest.fn(async()=>'device-key'),SyncState:{get:jest.fn(async()=>null),set:jest.fn(async()=>{})}}));
jest.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})}}));
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{getItem:jest.fn(async()=>null),setItem:jest.fn(async()=>{}),removeItem:jest.fn(async()=>{}),getAllKeys:jest.fn(async()=>[])}}));
jest.mock('expo-secure-store',()=>({getItemAsync:jest.fn(async()=>null),setItemAsync:jest.fn(async()=>{}),deleteItemAsync:jest.fn(async()=>{}),WHEN_UNLOCKED_THIS_DEVICE_ONLY:1}));
jest.mock('../src/services/EnvelopeFile',()=>({EnvelopeFile:{pick:jest.fn(),write:jest.fn(async()=>'/tmp/x'),share:jest.fn(async()=>{})}}));
jest.mock('../src/services/ReminderPlanner',()=>({ReminderPlanner:{reconcile:jest.fn(async()=>({scheduled:0,cancelled:0}))}}));

import type {DatabaseSync} from 'node:sqlite';
import {getDatabase} from '../src/database/database';
import {BackupService,WrongKeyError} from '../src/services/BackupService';
import {Snapshot,SnapshotService} from '../src/services/SnapshotService';
import {EnvelopeFile} from '../src/services/EnvelopeFile';
import {ReminderPlanner} from '../src/services/ReminderPlanner';
import {seal} from '../src/utils/crypto';
import {asyncAdapter,insertContact,migratedDatabase} from './helpers/realDatabase';

const SECRET='TEST-RECOVERY-KEY-2026-ABCD';

/**
 * The backup is the only way off the device, so the envelope has to survive the trip:
 * seal every table, reopen with the key, and land row-for-row on a fresh database.
 */
let db:DatabaseSync;
const freshDatabase=()=>{
 db=migratedDatabase();
 (getDatabase as jest.Mock).mockResolvedValue(asyncAdapter(db));
};
beforeEach(()=>{freshDatabase();jest.clearAllMocks()});

const T=1_700_000_000_000;
const fullSnapshot=():Snapshot=>({exported_at:T,version:2,tables:{
 companies:[{id:'co1',name:'Acme',created_at:T,updated_at:T,sync_status:'local',version:1}],
 tags:[{id:'t1',name:'Close',created_at:T,updated_at:T,sync_status:'local',version:1}],
 contacts:[
  {id:'c1',first_name:'Ada',last_name:'Lovelace',birthday:new Date(1990,11,9,12).getTime(),next_follow_up_at:T+86400000,notes:'First programmer',private:0,relationship_strength:4,importance:4,favorite:0,created_at:T,updated_at:T,sync_status:'local',version:1},
  {id:'c2',first_name:'Zed',last_name:'Private',private:1,relationship_strength:3,importance:3,favorite:0,created_at:T,updated_at:T,sync_status:'local',version:1},
 ],
 relationships:[{id:'r1',contact_a_id:'c1',contact_b_id:'c2',relationship_type:'friend',strength:5,created_at:T,updated_at:T,sync_status:'local',version:1}],
 interactions:[{id:'i1',contact_id:'c1',type:'call',title:'Intro call',description:'Talked about engines',interaction_at:T,created_at:T,updated_at:T,sync_status:'local',version:1}],
 commitments:[{id:'k1',contact_id:'c1',text:'Send the paper',direction:'owed_by_me',created_at:T,updated_at:T,sync_status:'local',version:1}],
 events:[{id:'e1',name:'Dinner',event_at:T,created_at:T,updated_at:T,sync_status:'local',version:1}],
 goals:[{id:'g1',title:'Call parents weekly',target:4,starts_at:T,ends_at:T+30*86400000,created_at:T,updated_at:T,sync_status:'local',version:1}],
 contact_tags:[{contact_id:'c1',tag_id:'t1',created_at:T,updated_at:T}],
 event_contacts:[{event_id:'e1',contact_id:'c1',created_at:T,updated_at:T}],
 owner_profile:[{id:'owner',first_name:'Owner',created_at:T,updated_at:T}],
} as never});

const cell=(sql:string)=>(db.prepare(sql).get() as Record<string,unknown>);

test('buildEnvelope → readEnvelope → merge lands every row on a fresh database',async()=>{
 await SnapshotService.merge(fullSnapshot());
 const envelope=await BackupService.buildEnvelope(SECRET);

 freshDatabase();
 const snapshot=await BackupService.readEnvelope(envelope,SECRET);
 expect(snapshot.version).toBe(3);
 const result=await SnapshotService.merge(snapshot);
 expect(result.applied).toBe(SnapshotService.rowCount(snapshot));

 expect(cell(`SELECT first_name,notes,birthday,private FROM contacts WHERE id='c1'`)).toMatchObject({first_name:'Ada',notes:'First programmer',private:0});
 expect(cell(`SELECT birthday FROM contacts WHERE id='c1'`)).toMatchObject({birthday:new Date(1990,11,9,12).getTime()});
 expect(cell(`SELECT private FROM contacts WHERE id='c2'`)).toMatchObject({private:1});
 expect(cell(`SELECT strength FROM relationships WHERE id='r1'`)).toMatchObject({strength:5});
 expect(cell(`SELECT title FROM interactions WHERE id='i1'`)).toMatchObject({title:'Intro call'});
 expect(cell(`SELECT text FROM commitments WHERE id='k1'`)).toMatchObject({text:'Send the paper'});
 expect(cell(`SELECT COUNT(*) n FROM contact_tags WHERE contact_id='c1' AND tag_id='t1'`)).toMatchObject({n:1});
 expect(cell(`SELECT COUNT(*) n FROM event_contacts WHERE event_id='e1' AND contact_id='c1'`)).toMatchObject({n:1});
});

test('re-importing the same envelope is a no-op',async()=>{
 await SnapshotService.merge(fullSnapshot());
 const envelope=await BackupService.buildEnvelope(SECRET);
 const snapshot=await BackupService.readEnvelope(envelope,SECRET);
 await SnapshotService.merge(snapshot);
 const again=await SnapshotService.merge(snapshot);
 expect(again.applied).toBe(0);
});

test('a wrong recovery key fails closed with WrongKeyError',async()=>{
 await SnapshotService.merge(fullSnapshot());
 const envelope=await BackupService.buildEnvelope(SECRET);
 await expect(BackupService.readEnvelope(envelope,'WRONG-KEY-0000-AAAA-BBBB')).rejects.toBeInstanceOf(WrongKeyError);
});

test('a legacy v2 envelope still opens with the recovery key',async()=>{
 const snapshot=fullSnapshot();
 const envelope=seal(new TextEncoder().encode(JSON.stringify(snapshot)),SECRET);
 const opened=await BackupService.readEnvelope(envelope,SECRET);
 expect(opened.version).toBe(2);
 expect(opened.tables.contacts).toHaveLength(2);
});

test('restoreMerge reconciles reminders so restored dates actually fire',async()=>{
 await SnapshotService.merge(fullSnapshot());
 (EnvelopeFile.pick as jest.Mock).mockResolvedValue(await BackupService.buildEnvelope(SECRET));
 freshDatabase();
 const result=await BackupService.restoreMerge(SECRET);
 expect(result?.applied).toBeGreaterThan(0);
 expect(ReminderPlanner.reconcile).toHaveBeenCalled();
 expect(cell(`SELECT COUNT(*) n FROM contacts`)).toMatchObject({n:2});
});

test('restoreMerge returns null without scheduling anything when no file is picked',async()=>{
 (EnvelopeFile.pick as jest.Mock).mockResolvedValue(null);
 await expect(BackupService.restoreMerge(SECRET)).resolves.toBeNull();
 expect(ReminderPlanner.reconcile).not.toHaveBeenCalled();
});

test('CSV export stays unencrypted but never carries the vault',async()=>{
 insertContact(db,'c1','Ada',{last_name:'Lovelace',email:'ada@example.com'});
 insertContact(db,'c2','Zed',{private:1,email:'zed@example.com'});
 await BackupService.shareCsv();
 const csv=(EnvelopeFile.write as jest.Mock).mock.calls[0][1] as string;
 expect(csv).toContain('ada@example.com');
 expect(csv).not.toContain('zed@example.com');
 expect(csv).not.toContain('Zed');
});
