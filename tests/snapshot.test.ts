jest.mock('expo-crypto',()=>({randomUUID:()=>`test-${Math.random()}`}));
jest.mock('../src/database/database',()=>({
 getDatabase:jest.fn(),
 SyncState:{get:jest.fn(async()=>null),set:jest.fn(async()=>{})},
}));

import {SyncState,getDatabase} from '../src/database/database';

import {Snapshot,SnapshotService} from '../src/services/SnapshotService';

type Row=Record<string,unknown>;

/** Minimal in-memory stand-in for the tables the merge touches. */
function fakeDatabase(existing:Record<string,Row[]>={}){
 const tables:Record<string,Row[]>=JSON.parse(JSON.stringify(existing));
 const writes:{sql:string;args:unknown[]}[]=[];
 const tableOf=(sql:string)=>/(?:INTO|FROM)\s+([a-z_]+)/i.exec(sql)?.[1]??'';
 const db={
  writes,tables,
  withTransactionAsync:async(fn:()=>Promise<void>)=>fn(),
  execAsync:jest.fn(async()=>{}),
  getFirstAsync:jest.fn(async(sql:string,...args:unknown[])=>{
   const table=tableOf(sql);
   const rows=tables[table]??[];
   if(/lower\(name\)=lower\(\?\)/.test(sql))return rows.find(r=>String(r.name).toLowerCase()===String(args[0]).toLowerCase())??null;
   if(/min\(contact_a_id/.test(sql))return rows.find(r=>{
    const [x,y]=[String(r.contact_a_id),String(r.contact_b_id)].sort();
    return x===args[0]&&y===args[1];
   })??null;
   const keys=[...sql.matchAll(/([a-z_]+)=\?/g)].map(m=>m[1]);
   return rows.find(r=>keys.every((k,i)=>r[k]===args[i]))??null;
  }),
  getAllAsync:jest.fn(async(sql:string)=>tables[tableOf(sql)]??[]),
  runAsync:jest.fn(async(sql:string,...args:unknown[])=>{
   writes.push({sql,args});
   const table=tableOf(sql);
   const columns=/\(([^)]+)\)\s*VALUES/i.exec(sql)?.[1].split(',')??[];
   const row=Object.fromEntries(columns.map((c,i)=>[c.trim(),args[i]]));
   const rows=tables[table]??[];
   const index=rows.findIndex(r=>r.id!==undefined?r.id===row.id:r.contact_id===row.contact_id&&r.tag_id===row.tag_id);
   if(index>=0)rows[index]=row; else rows.push(row);
   tables[table]=rows;
  }),
 };
 (getDatabase as jest.Mock).mockResolvedValue(db);
 return db;
}

const snapshot=(tables:Record<string,Row[]>):Snapshot=>({exported_at:Date.now(),version:2,tables:tables as never});
const contact=(over:Row={}):Row=>({id:'c1',first_name:'Ada',last_name:'Lovelace',updated_at:1000,version:1,created_at:1,relationship_strength:4,importance:4,favorite:0,sync_status:'local',...over});

describe('snapshot merge',()=>{
 beforeEach(()=>jest.clearAllMocks());

 test('inserts rows the device has never seen',async()=>{
  const db=fakeDatabase();
  const result=await SnapshotService.merge(snapshot({contacts:[contact()]}));
  expect(result.applied).toBe(1);
  expect(db.tables.contacts[0].first_name).toBe('Ada');
 });

 test('keeps the newer row when both sides changed',async()=>{
  const db=fakeDatabase({contacts:[contact({first_name:'Local',updated_at:5000})]});
  const result=await SnapshotService.merge(snapshot({contacts:[contact({first_name:'Remote',updated_at:2000})]}));
  expect(result.applied).toBe(0);
  expect(db.tables.contacts[0].first_name).toBe('Local');
 });

 test('accepts the incoming row when it is newer',async()=>{
  const db=fakeDatabase({contacts:[contact({first_name:'Local',updated_at:1000})]});
  await SnapshotService.merge(snapshot({contacts:[contact({first_name:'Remote',updated_at:9000})]}));
  expect(db.tables.contacts[0].first_name).toBe('Remote');
 });

 test('is idempotent — importing the same bundle twice changes nothing the second time',async()=>{
  fakeDatabase();
  const bundle=snapshot({contacts:[contact()]});
  expect((await SnapshotService.merge(bundle)).applied).toBe(1);
  expect((await SnapshotService.merge(bundle)).applied).toBe(0);
 });

 test('propagates a deletion as an ordinary field',async()=>{
  const db=fakeDatabase({contacts:[contact({updated_at:1000})]});
  await SnapshotService.merge(snapshot({contacts:[contact({updated_at:4000,deleted_at:4000})]}));
  expect(db.tables.contacts[0].deleted_at).toBe(4000);
 });

 test('remaps a tag that exists locally under a different id',async()=>{
  const db=fakeDatabase({tags:[{id:'local-tag',name:'Investors',updated_at:1}]});
  await SnapshotService.merge(snapshot({
   tags:[{id:'remote-tag',name:'investors',updated_at:9000,version:2}],
   contact_tags:[{contact_id:'c1',tag_id:'remote-tag',updated_at:9000}],
  }));
  expect(db.tables.tags).toHaveLength(1);
  expect(db.tables.contact_tags[0].tag_id).toBe('local-tag');
 });

 test('treats a relationship as the same edge regardless of stored direction or id',async()=>{
  const db=fakeDatabase({relationships:[{id:'local-edge',contact_a_id:'a',contact_b_id:'b',strength:2,updated_at:1000}]});
  await SnapshotService.merge(snapshot({relationships:[{id:'remote-edge',contact_a_id:'b',contact_b_id:'a',strength:5,updated_at:8000}]}));
  expect(db.tables.relationships).toHaveLength(1);
  expect(db.tables.relationships[0].strength).toBe(5);
 });

 test('fills NOT NULL columns that a v1 snapshot predates',async()=>{
  const db=fakeDatabase();
  await SnapshotService.merge({exported_at:1,version:1,tables:{commitments:[{id:'p1',contact_id:'c1',text:'Send deck',updated_at:10}]}} as never);
  expect(db.tables.commitments[0].direction).toBe('owed_by_me');
 });

 test('rejects a payload that is not a snapshot',async()=>{
  fakeDatabase();
  await expect(SnapshotService.merge({version:9,tables:{}} as never)).rejects.toThrow(/Unsupported/);
  await expect(SnapshotService.merge(null as never)).rejects.toThrow(/Unsupported/);
 });

 test('skips a child row whose parent never made it into the bundle',async()=>{
  const db=fakeDatabase();
  db.runAsync.mockImplementationOnce(async()=>{throw new Error('FOREIGN KEY constraint failed')});
  const result=await SnapshotService.merge(snapshot({interactions:[{id:'i1',contact_id:'ghost',type:'meeting',interaction_at:1,updated_at:1}]}));
  expect(result.applied).toBe(0);
 });

 test('reports a conflict when both sides changed since the last sync',async()=>{
  (SyncState.get as jest.Mock).mockResolvedValue('3000');
  const db=fakeDatabase({contacts:[contact({first_name:'Local',updated_at:4000})]});
  const result=await SnapshotService.merge(snapshot({contacts:[contact({first_name:'Remote',updated_at:5000})]}));
  expect(result.conflicts).toBe(1);
  // Last-write-wins still decides; the count only tells the user something was overwritten.
  expect(db.tables.contacts[0].first_name).toBe('Remote');
  (SyncState.get as jest.Mock).mockResolvedValue(null);
 });

 test('does not call an ordinary first import a conflict',async()=>{
  (SyncState.get as jest.Mock).mockResolvedValue('9000');
  fakeDatabase({contacts:[contact({updated_at:1000})]});
  const result=await SnapshotService.merge(snapshot({contacts:[contact({first_name:'Remote',updated_at:9500})]}));
  expect(result.conflicts).toBe(0);
  (SyncState.get as jest.Mock).mockResolvedValue(null);
 });

 test('selective shares drop links the recipient cannot resolve',()=>{
  const bundle=snapshot({contacts:[contact({company_id:'co1'})],companies:[{id:'co1',name:'Acme'}],relationships:[{id:'r1'}]});
  const detached=SnapshotService.detachForeignKeys(bundle);
  expect(detached.tables.contacts[0].company_id).toBeNull();
  expect(detached.tables.companies).toEqual([]);
  expect(detached.tables.relationships).toEqual([]);
 });
});
