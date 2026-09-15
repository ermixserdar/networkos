import {SyncState,getDatabase} from '@/database/database';

/**
 * A snapshot is the portable form of the database: every syncable table, row for row.
 * Backups, selective shares and device-to-device sync all ride on this one shape so a file
 * produced by any of them can be merged by any of them.
 *
 * Merging is last-write-wins per row, keyed on `updated_at` with `version` as the tiebreak.
 * `deleted_at` is an ordinary field, so a deletion propagates like any other edit.
 */
export type SnapshotTable=Record<string,unknown>[];
export type Snapshot={exported_at:number;version:1|2|3;device_id?:string;tables:Record<string,SnapshotTable>};

type TableSpec={name:string;columns:string[];key:string[];required:string[];defaults:Record<string,unknown>};
/** Filled in for rows coming from an older snapshot that predates a NOT NULL column. */
const SYNC_DEFAULTS={sync_status:'local',version:1} as const;
const stamp=()=>Date.now();

const SPECS:TableSpec[]=[
 {name:'companies',key:['id'],required:['name'],defaults:{...SYNC_DEFAULTS},columns:['id','name','website','industry','city','country','description','created_at','updated_at','deleted_at','sync_status','version']},
 {name:'tags',key:['id'],required:['name'],defaults:{...SYNC_DEFAULTS},columns:['id','name','created_at','updated_at','deleted_at','sync_status','version']},
 // `device_contact_id` is deliberately absent: the phone-book link is device-local and means
 // nothing on another device. AddressBookSyncService rebuilds it from phone/email after a restore.
 {name:'contacts',key:['id'],required:['first_name'],defaults:{relationship_strength:3,importance:3,favorite:0,...SYNC_DEFAULTS},columns:['id','first_name','last_name','display_name','job_title','company_id','email','phone','phone_norm','linkedin_url','website','city','country','birthday','relationship_strength','importance','how_we_met','met_at','met_date','notes','last_contact_at','next_follow_up_at','cadence_days','favorite','photo','private','created_at','updated_at','deleted_at','sync_status','version']},
 {name:'relationships',key:['id'],required:['contact_a_id','contact_b_id'],defaults:{strength:3,...SYNC_DEFAULTS},columns:['id','contact_a_id','contact_b_id','relationship_type','strength','context','notes','created_at','updated_at','deleted_at','sync_status','version']},
 {name:'interactions',key:['id'],required:['contact_id'],defaults:{type:'other',interaction_at:0,...SYNC_DEFAULTS},columns:['id','contact_id','type','title','description','interaction_at','created_at','updated_at','deleted_at','sync_status','version']},
 {name:'commitments',key:['id'],required:['contact_id','text'],defaults:{direction:'owed_by_me',...SYNC_DEFAULTS},columns:['id','contact_id','text','direction','due_at','completed_at','created_at','updated_at','deleted_at','sync_status','version']},
 {name:'events',key:['id'],required:['name'],defaults:{event_at:0,...SYNC_DEFAULTS},columns:['id','name','event_at','location','notes','created_at','updated_at','deleted_at','sync_status','version']},
 {name:'goals',key:['id'],required:['title'],defaults:{target:1,starts_at:0,ends_at:0,...SYNC_DEFAULTS},columns:['id','title','target','tag_id','starts_at','ends_at','created_at','updated_at','deleted_at','sync_status','version']},
 {name:'contact_tags',key:['contact_id','tag_id'],required:[],defaults:{},columns:['contact_id','tag_id','created_at','updated_at','deleted_at']},
 {name:'event_contacts',key:['event_id','contact_id'],required:[],defaults:{},columns:['event_id','contact_id','created_at','updated_at','deleted_at']},
 {name:'owner_profile',key:['id'],required:['first_name'],defaults:{},columns:['id','first_name','last_name','email','phone','company','job_title','created_at','updated_at']},
];
export const BACKUP_TABLES=SPECS.map(s=>s.name);
const specOf=(name:string)=>SPECS.find(s=>s.name===name);

const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:0;
/** Incoming wins only when it is strictly newer, so a re-import is a no-op. */
function isNewer(incoming:Record<string,unknown>,existing:Record<string,unknown>){
 const a=number(incoming.updated_at),b=number(existing.updated_at);
 if(a!==b)return a>b;
 return number(incoming.version)>number(existing.version);
}

type ExistingRow={updated_at:unknown;version:unknown};

/** One read per table instead of one per row, plus the two identity indexes the merge needs. */
async function indexTable(d:Awaited<ReturnType<typeof getDatabase>>,spec:TableSpec){
 const columns=[...spec.key,'updated_at','version'].filter(c=>spec.columns.includes(c));
 const rows=await d.getAllAsync<Record<string,unknown>>(`SELECT ${columns.join(',')} FROM ${spec.name}`);
 const byKey=new Map<string,ExistingRow>();
 for(const row of rows)byKey.set(spec.key.map(k=>String(row[k])).join('|'),{updated_at:row.updated_at,version:row.version});

 const tagsByName=new Map<string,string>();
 const pairIndex=new Map<string,string>();
 if(spec.name==='tags'){
  for(const row of await d.getAllAsync<{id:string;name:string;deleted_at:number|null}>('SELECT id,name,deleted_at FROM tags ORDER BY deleted_at IS NOT NULL'))
   if(!tagsByName.has(row.name.toLowerCase()))tagsByName.set(row.name.toLowerCase(),row.id);
 }
 if(spec.name==='relationships'){
  for(const row of await d.getAllAsync<{id:string;contact_a_id:string;contact_b_id:string;deleted_at:number|null}>('SELECT id,contact_a_id,contact_b_id,deleted_at FROM relationships ORDER BY deleted_at IS NOT NULL')){
   const key=[row.contact_a_id,row.contact_b_id].sort().join('|');
   if(!pairIndex.has(key))pairIndex.set(key,row.id);
  }
 }
 return {byKey,tagsByName,pairIndex};
}

export const SnapshotService={
 /** Yields one table at a time so an export never holds the whole database in memory at once. */
 tables:()=>SPECS.map(spec=>spec.name),
 collectTable:async(name:string,ids?:string[]):Promise<SnapshotTable>=>{
  const spec=specOf(name);
  if(!spec)return [];
  const d=await getDatabase();
  if(!ids)return d.getAllAsync(`SELECT ${spec.columns.join(',')} FROM ${spec.name}`);
  return ids.length?d.getAllAsync(`SELECT ${spec.columns.join(',')} FROM ${spec.name} WHERE id IN (${ids.map(()=>'?').join(',')})`,...ids):[];
 },
 collect:async(only?:{table:string;ids:string[]}):Promise<Snapshot>=>{
  const d=await getDatabase();
  const tables:Record<string,SnapshotTable>={};
  for(const spec of SPECS){
   if(only&&spec.name!==only.table){tables[spec.name]=[];continue}
   if(only)tables[spec.name]=only.ids.length?await d.getAllAsync(`SELECT ${spec.columns.join(',')} FROM ${spec.name} WHERE id IN (${only.ids.map(()=>'?').join(',')})`,...only.ids):[];
   else tables[spec.name]=await d.getAllAsync(`SELECT ${spec.columns.join(',')} FROM ${spec.name}`);
  }
  return {exported_at:Date.now(),version:2,tables};
 },

 /**
  * Applies a snapshot onto the local database and reports how many rows actually changed.
  * Tables are written parents-first and a row whose parent is genuinely missing is skipped,
  * so one orphan cannot abort the whole merge.
  *
  * Existing keys are read once per table rather than once per row: a per-row lookup turned a
  * large bundle into tens of thousands of round trips.
  */
 merge:async(snapshot:Snapshot)=>{
  if(!snapshot||typeof snapshot!=='object'||!snapshot.tables)throw Error('Unsupported NetworkOS snapshot');
  if(snapshot.version!==1&&snapshot.version!==2&&snapshot.version!==3)throw Error('Unsupported NetworkOS snapshot');
  const d=await getDatabase();
  let applied=0,conflicts=0;
  const tagRemap=new Map<string,string>();
  const watermark=Number(await SyncState.get('last_sync_at')??0);

  await d.withTransactionAsync(async()=>{
   for(const spec of SPECS){
    const rows=(snapshot.tables[spec.name]??[]) as Record<string,unknown>[];
    if(!rows.length)continue;
    const {byKey,tagsByName,pairIndex}=await indexTable(d,spec);

    for(const raw of rows){
     if(!raw||typeof raw!=='object')continue;
     const row:Record<string,any>=Object.fromEntries(spec.columns.map(c=>[c,raw[c]??null]));
     for(const [column,value] of Object.entries(spec.defaults))if(row[column]===null)row[column]=value;
     if(spec.columns.includes('created_at')&&row.created_at===null)row.created_at=stamp();
     if(spec.columns.includes('updated_at')&&row.updated_at===null)row.updated_at=stamp();
     if(spec.key.some(k=>row[k]===null)||spec.required.some(k=>row[k]===null))continue;

     if(spec.name==='tags'){
      // UNIQUE(name) means an identically named tag from another device is the same tag.
      const twin=tagsByName.get(String(row.name).toLowerCase());
      if(twin&&twin!==row.id){tagRemap.set(String(row.id),twin);row.id=twin}
     }
     if(spec.name==='contact_tags'&&tagRemap.has(String(row.tag_id)))row.tag_id=tagRemap.get(String(row.tag_id))!;
     if(spec.name==='relationships'){
      // The partial unique index is on the ordered pair, not the id.
      const [x,y]=[String(row.contact_a_id),String(row.contact_b_id)].sort();
      row.contact_a_id=x;row.contact_b_id=y;
      const twin=pairIndex.get(`${x}|${y}`);
      if(twin&&twin!==row.id)row.id=twin;
     }

     const key=spec.key.map(k=>String(row[k])).join('|');
     const existing=byKey.get(key);
     if(existing){
      if(!isNewer(row,existing))continue;
      // Both sides moved since the last sync: last-write-wins still applies, but say so.
      if(watermark&&number(existing.updated_at)>watermark&&number(row.updated_at)>watermark)conflicts++;
     }
     const assignments=spec.columns.filter(c=>!spec.key.includes(c)).map(c=>`${c}=excluded.${c}`).join(',');
     try{
      await d.runAsync(
       `INSERT INTO ${spec.name}(${spec.columns.join(',')}) VALUES(${spec.columns.map(()=>'?').join(',')}) ON CONFLICT(${spec.key.join(',')}) DO UPDATE SET ${assignments}`,
       ...spec.columns.map(c=>row[c] as never));
      byKey.set(key,{updated_at:row.updated_at,version:row.version});
      if(spec.name==='tags')tagsByName.set(String(row.name).toLowerCase(),String(row.id));
      if(spec.name==='relationships')pairIndex.set(`${row.contact_a_id}|${row.contact_b_id}`,String(row.id));
      applied++;
     }catch(error){
      // A row whose parent never made it into the bundle is dropped; the rest still merges.
      if(!(error instanceof Error)||!/FOREIGN KEY|constraint/i.test(error.message))throw error;
     }
    }
   }
  });
  return {applied,conflicts};
 },

 /**
  * Selective shares carry contacts only, so links to rows the recipient does not have are cut —
  * and a private contact is dropped outright rather than handed to someone else.
  */
 detachForeignKeys(snapshot:Snapshot){
  snapshot.tables.contacts=(snapshot.tables.contacts??[]).filter(row=>!Number(row.private));
  for(const row of snapshot.tables.contacts)row.company_id=null;
  for(const name of ['relationships','interactions','commitments','contact_tags','event_contacts','events','goals','tags','companies','owner_profile'])snapshot.tables[name]=[];
  return snapshot;
 },

 rowCount(snapshot:Snapshot){return Object.values(snapshot.tables).reduce((total,rows)=>total+rows.length,0)},
 specFor:specOf,
};
