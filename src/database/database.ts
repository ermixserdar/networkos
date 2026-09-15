import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import {now,uuid} from '@/types';
let db:SQLite.SQLiteDatabase|null=null;
const KEY='networkos.db.key';
const migration=`CREATE TABLE IF NOT EXISTS companies(id TEXT PRIMARY KEY,name TEXT NOT NULL,website TEXT,industry TEXT,city TEXT,country TEXT,description TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,sync_status TEXT NOT NULL DEFAULT 'local',version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS contacts(id TEXT PRIMARY KEY,first_name TEXT NOT NULL,last_name TEXT,display_name TEXT,job_title TEXT,company_id TEXT,email TEXT,phone TEXT,linkedin_url TEXT,website TEXT,city TEXT,country TEXT,birthday INTEGER,relationship_strength INTEGER NOT NULL DEFAULT 3 CHECK(relationship_strength BETWEEN 1 AND 5),importance INTEGER NOT NULL DEFAULT 3 CHECK(importance BETWEEN 1 AND 5),how_we_met TEXT,met_at TEXT,met_date INTEGER,notes TEXT,last_contact_at INTEGER,next_follow_up_at INTEGER,favorite INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,sync_status TEXT NOT NULL DEFAULT 'local',version INTEGER NOT NULL DEFAULT 1,FOREIGN KEY(company_id) REFERENCES companies(id));
CREATE TABLE IF NOT EXISTS relationships(id TEXT PRIMARY KEY,contact_a_id TEXT NOT NULL,contact_b_id TEXT NOT NULL,relationship_type TEXT,strength INTEGER NOT NULL DEFAULT 3 CHECK(strength BETWEEN 1 AND 5),context TEXT,notes TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,sync_status TEXT NOT NULL DEFAULT 'local',version INTEGER NOT NULL DEFAULT 1,FOREIGN KEY(contact_a_id) REFERENCES contacts(id),FOREIGN KEY(contact_b_id) REFERENCES contacts(id),CHECK(contact_a_id<>contact_b_id));
CREATE UNIQUE INDEX IF NOT EXISTS relationships_pair ON relationships(min(contact_a_id,contact_b_id),max(contact_a_id,contact_b_id)) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS interactions(id TEXT PRIMARY KEY,contact_id TEXT NOT NULL,type TEXT NOT NULL,title TEXT,description TEXT,interaction_at INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,sync_status TEXT NOT NULL DEFAULT 'local',version INTEGER NOT NULL DEFAULT 1,FOREIGN KEY(contact_id) REFERENCES contacts(id));
CREATE TABLE IF NOT EXISTS tags(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,sync_status TEXT NOT NULL DEFAULT 'local',version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS contact_tags(contact_id TEXT NOT NULL,tag_id TEXT NOT NULL,PRIMARY KEY(contact_id,tag_id),FOREIGN KEY(contact_id) REFERENCES contacts(id),FOREIGN KEY(tag_id) REFERENCES tags(id));
CREATE TABLE IF NOT EXISTS owner_profile(id TEXT PRIMARY KEY,first_name TEXT NOT NULL,last_name TEXT,email TEXT,phone TEXT,company TEXT,job_title TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS contacts_name ON contacts(first_name,last_name);CREATE INDEX IF NOT EXISTS contacts_company ON contacts(company_id);CREATE INDEX IF NOT EXISTS contacts_followup ON contacts(next_follow_up_at);CREATE INDEX IF NOT EXISTS relationships_a ON relationships(contact_a_id);CREATE INDEX IF NOT EXISTS relationships_b ON relationships(contact_b_id);CREATE INDEX IF NOT EXISTS interactions_contact ON interactions(contact_id,interaction_at);`;
const migration2=`CREATE TABLE IF NOT EXISTS commitments(id TEXT PRIMARY KEY,contact_id TEXT NOT NULL,text TEXT NOT NULL,due_at INTEGER,completed_at INTEGER,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,FOREIGN KEY(contact_id) REFERENCES contacts(id));CREATE INDEX IF NOT EXISTS commitments_due ON commitments(due_at,completed_at);`;
const migration3=`CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,name TEXT NOT NULL,event_at INTEGER NOT NULL,location TEXT,notes TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER);CREATE TABLE IF NOT EXISTS event_contacts(event_id TEXT NOT NULL,contact_id TEXT NOT NULL,PRIMARY KEY(event_id,contact_id),FOREIGN KEY(event_id) REFERENCES events(id),FOREIGN KEY(contact_id) REFERENCES contacts(id));CREATE INDEX IF NOT EXISTS events_date ON events(event_at);`;
const migration4=`ALTER TABLE contacts ADD COLUMN phone_norm TEXT;CREATE INDEX IF NOT EXISTS contacts_phone_norm ON contacts(phone_norm);CREATE INDEX IF NOT EXISTS contacts_email_lower ON contacts(email);UPDATE contacts SET phone_norm=REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),'+','') WHERE phone IS NOT NULL;`;
/**
 * v5 adds what the sync engine and the reciprocity ledger need: a version/timestamp on every
 * syncable table, soft deletes on the join tables (a hard DELETE cannot propagate), a cadence
 * per contact, and a direction on each commitment.
 */
const migration5=`ALTER TABLE contacts ADD COLUMN cadence_days INTEGER;
ALTER TABLE commitments ADD COLUMN direction TEXT NOT NULL DEFAULT 'owed_by_me';
ALTER TABLE commitments ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local';
ALTER TABLE commitments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local';
ALTER TABLE events ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE contact_tags ADD COLUMN created_at INTEGER;
ALTER TABLE contact_tags ADD COLUMN updated_at INTEGER;
ALTER TABLE contact_tags ADD COLUMN deleted_at INTEGER;
ALTER TABLE event_contacts ADD COLUMN created_at INTEGER;
ALTER TABLE event_contacts ADD COLUMN updated_at INTEGER;
ALTER TABLE event_contacts ADD COLUMN deleted_at INTEGER;
CREATE TABLE IF NOT EXISTS sync_state(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS contacts_birthday ON contacts(birthday);
CREATE INDEX IF NOT EXISTS commitments_contact ON commitments(contact_id,completed_at);
CREATE INDEX IF NOT EXISTS contact_tags_tag ON contact_tags(tag_id);`;

/** Body text kept in one FTS5 column so a single MATCH covers every searchable field. */
const FTS_BODY=`coalesce(first_name,'')||' '||coalesce(last_name,'')||' '||coalesce(display_name,'')||' '||coalesce(email,'')||' '||coalesce(phone,'')||' '||coalesce(job_title,'')||' '||coalesce(city,'')||' '||coalesce(country,'')||' '||coalesce(how_we_met,'')||' '||coalesce(met_at,'')||' '||coalesce(notes,'')`;
const migration6=`CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(contact_id UNINDEXED,body,tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER IF NOT EXISTS contacts_fts_ai AFTER INSERT ON contacts BEGIN INSERT INTO contacts_fts(contact_id,body) SELECT new.id,${FTS_BODY.replace(/\b(first_name|last_name|display_name|email|phone|job_title|city|country|how_we_met|met_at|notes)\b/g,'new.$1')} WHERE new.deleted_at IS NULL; END;
CREATE TRIGGER IF NOT EXISTS contacts_fts_au AFTER UPDATE ON contacts BEGIN DELETE FROM contacts_fts WHERE contact_id=new.id; INSERT INTO contacts_fts(contact_id,body) SELECT new.id,${FTS_BODY.replace(/\b(first_name|last_name|display_name|email|phone|job_title|city|country|how_we_met|met_at|notes)\b/g,'new.$1')} WHERE new.deleted_at IS NULL; END;
CREATE TRIGGER IF NOT EXISTS contacts_fts_ad AFTER DELETE ON contacts BEGIN DELETE FROM contacts_fts WHERE contact_id=old.id; END;
DELETE FROM contacts_fts;
INSERT INTO contacts_fts(contact_id,body) SELECT id,${FTS_BODY} FROM contacts WHERE deleted_at IS NULL;`;

/**
 * v7 stores a small JPEG thumbnail per contact directly in the database: it stays encrypted at
 * rest and rides along with backups and sync, which a file on disk would not.
 * v7 also adds the private flag and the soft-delete watermark the trash screen reads.
 */
const migration7=`ALTER TABLE contacts ADD COLUMN photo TEXT;
ALTER TABLE contacts ADD COLUMN private INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS contacts_deleted ON contacts(deleted_at);
CREATE TABLE IF NOT EXISTS goals(id TEXT PRIMARY KEY,title TEXT NOT NULL,target INTEGER NOT NULL DEFAULT 1,tag_id TEXT,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,sync_status TEXT NOT NULL DEFAULT 'local',version INTEGER NOT NULL DEFAULT 1);
CREATE INDEX IF NOT EXISTS goals_window ON goals(ends_at);`;

/**
 * v8 links a contact to the phone-book entry it came from, so an imported person can be refreshed
 * later instead of imported twice. The link is device-local: a contact id from this phone means
 * nothing on another one, so it is deliberately absent from `SnapshotService.SPECS` and a restored
 * backup rebuilds it by phone/email on the next run. The index is partial and unique so a
 * soft-deleted contact releases its claim on the device entry.
 */
const migration8=`ALTER TABLE contacts ADD COLUMN device_contact_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_device_contact_id ON contacts(device_contact_id) WHERE device_contact_id IS NOT NULL AND deleted_at IS NULL;`;

const MIGRATIONS=[migration,migration2,migration3,migration4,migration5];

export async function getDatabaseKey(){let key=await SecureStore.getItemAsync(KEY);if(!key){key=uuid()+uuid();await SecureStore.setItemAsync(KEY,key,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}return key;}

export async function rotateDatabaseKey(newKey?:string){const d=await getDatabase();const key=newKey??uuid()+uuid();assertSafePragmaKey(key);await d.execAsync(`PRAGMA rekey = '${escapePragmaKey(key)}';`);await SecureStore.setItemAsync(KEY,key,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});return key;}

function assertSafePragmaKey(key:string){if(!key||key.length<16||key.length>256||/[\0\n\r]/.test(key))throw Error('Invalid database key');}

function escapePragmaKey(key:string){return key.replace(/'/g,"''");}

let encrypted=false;
let fullTextSearch=false;
/**
 * True only when the native build actually linked SQLCipher. Plain SQLite silently ignores
 * `PRAGMA key`, so without this check an unencrypted database looks identical to an encrypted
 * one — which is exactly how the shipped build ended up storing plaintext.
 */
export const isEncrypted=()=>encrypted;
export const hasFullTextSearch=()=>fullTextSearch;

let opening:Promise<SQLite.SQLiteDatabase>|null=null;
/** Memoised so the many concurrent callers at startup share one handle and one migration run. */
export function getDatabase(){
 if(db)return Promise.resolve(db);
 if(!opening)opening=openDatabase().catch(error=>{opening=null;throw error});
 return opening;
}

const NAME='networkos.db';
const STAGING='networkos.encrypting.db';
const PLAINTEXT_BACKUP='networkos.plaintext.db';
const databaseDirectory=()=>String(SQLite.defaultDatabaseDirectory).replace(/\/$/,'');
const fileUri=(name:string)=>`file://${databaseDirectory()}/${name}`;
const removeFile=(name:string)=>FileSystem.deleteAsync(fileUri(name),{idempotent:true});

async function openDatabase(){
 const key=await getDatabaseKey();
 assertSafePragmaKey(key);
 await recoverInterruptedSwap();
 let opened=await openKeyed(NAME,key);
 if(!opened){
  await encryptLegacyPlaintext(key);
  opened=await openKeyed(NAME,key);
  if(!opened)throw Error('Database could not be opened after encryption');
 }
 await opened.execAsync(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;`);
 await opened.withTransactionAsync(async()=>{
  const row=await opened.getFirstAsync<{user_version:number}>('PRAGMA user_version');
  let version=row?.user_version??0;
  for(let i=version;i<MIGRATIONS.length;i++){await opened.execAsync(MIGRATIONS[i]);version=i+1;await opened.execAsync(`PRAGMA user_version=${version}`);}
 });
 fullTextSearch=await setupFullTextSearch(opened);
 await applyLateMigrations(opened);
 db=opened;
 return opened;
}

/**
 * Null when SQLCipher is linked but rejects the key — the file on disk was not written with it.
 * Without SQLCipher the key is ignored, so any failure there is a real error and is rethrown.
 */
async function openKeyed(name:string,key:string,options:SQLite.SQLiteOpenOptions={}){
 const handle=await SQLite.openDatabaseAsync(name,{useSQLCipher:true,...options} as any);
 try{
  await handle.execAsync(`PRAGMA key = '${escapePragmaKey(key)}';`);
  encrypted=await detectCipher(handle);
  // Fails loudly with "file is not a database" when the key is wrong, instead of half-opening.
  await handle.getFirstAsync('SELECT count(*) FROM sqlite_master');
  return handle;
 }catch(error){
  await handle.closeAsync().catch(()=>{});
  if(!encrypted)throw error;
  return null;
 }
}

/**
 * v1.0 shipped without SQLCipher linked, so `PRAGMA key` was ignored and every existing install
 * holds a plaintext file the encrypted build cannot read. SQLCipher cannot encrypt a file in
 * place; its documented route is `sqlcipher_export` into a keyed copy, then swapping the files.
 * The plaintext original is only replaced once the copy has opened with the same schema.
 */
async function encryptLegacyPlaintext(key:string){
 const dir=databaseDirectory(),uri=fileUri,remove=removeFile;
 await Promise.all([STAGING,`${STAGING}-wal`,`${STAGING}-shm`,`${STAGING}-journal`].map(remove));

 const count='SELECT count(*) AS n FROM sqlite_master';
 const plain=await SQLite.openDatabaseAsync(NAME,{useNewConnection:true});
 let expected=0;
 try{
  // With no key SQLCipher reads plaintext. If this fails too, the file is encrypted with a key
  // this device no longer has, and it must be left exactly as it is.
  expected=(await plain.getFirstAsync<{n:number}>(count))?.n??0;
  const version=Number((await plain.getFirstAsync<{user_version:number}>('PRAGMA user_version'))?.user_version??0);
  // Folds the WAL into the main file, so the plaintext file is complete on its own.
  await plain.execAsync('PRAGMA journal_mode=DELETE;');
  await plain.execAsync(`ATTACH DATABASE '${escapePragmaKey(`${dir}/${STAGING}`)}' AS encrypted KEY '${escapePragmaKey(key)}';`);
  await plain.getFirstAsync("SELECT sqlcipher_export('encrypted')");
  // sqlcipher_export copies schema and rows but not the header, where the migration level lives.
  await plain.execAsync(`PRAGMA encrypted.user_version=${version}; DETACH DATABASE encrypted;`);
 }finally{await plain.closeAsync()}

 const copy=await openKeyed(STAGING,key,{useNewConnection:true});
 if(!copy)throw Error('Encrypted copy could not be opened');
 let actual=-1;
 try{
  actual=(await copy.getFirstAsync<{n:number}>(count))?.n??0;
  await copy.execAsync('PRAGMA journal_mode=DELETE;');
 }finally{await copy.closeAsync()}
 if(actual!==expected)throw Error('Encrypted copy is incomplete');

 await FileSystem.moveAsync({from:uri(NAME),to:uri(PLAINTEXT_BACKUP)});
 // A stale plaintext WAL replayed onto the encrypted file would corrupt it.
 await Promise.all([`${NAME}-wal`,`${NAME}-shm`,`${NAME}-journal`].map(remove));
 try{await FileSystem.moveAsync({from:uri(STAGING),to:uri(NAME)})}
 catch(error){await FileSystem.moveAsync({from:uri(PLAINTEXT_BACKUP),to:uri(NAME)});throw error}
 await remove(PLAINTEXT_BACKUP);
}

/**
 * The swap is two renames. A crash between them must not leave the app on a fresh, empty
 * database with the user's data sitting beside it: put the original back and encrypt again.
 * If both files exist the swap finished and only the plaintext leftover needs to go.
 */
async function recoverInterruptedSwap(){
 if(!(await FileSystem.getInfoAsync(fileUri(PLAINTEXT_BACKUP))).exists)return;
 if((await FileSystem.getInfoAsync(fileUri(NAME))).exists)await removeFile(PLAINTEXT_BACKUP);
 else await FileSystem.moveAsync({from:fileUri(PLAINTEXT_BACKUP),to:fileUri(NAME)});
}

async function detectCipher(handle:SQLite.SQLiteDatabase){
 try{const row=await handle.getFirstAsync<{cipher_version?:string}>('PRAGMA cipher_version');return Boolean(row&&Object.values(row)[0]);}catch{return false}
}

/** FTS5 is optional: if the build lacks it, search falls back to LIKE instead of failing. */
async function setupFullTextSearch(handle:SQLite.SQLiteDatabase){
 try{
  const row=await handle.getFirstAsync<{user_version:number}>('PRAGMA user_version');
  if((row?.user_version??0)>=6)return true;
  await handle.execAsync(migration6);
  await handle.execAsync('PRAGMA user_version=6');
  return true;
 }catch{return false}
}

/** Runs after FTS so these version numbers stay ordered even when FTS is unavailable. */
async function applyLateMigrations(handle:SQLite.SQLiteDatabase){
 const row=await handle.getFirstAsync<{user_version:number}>('PRAGMA user_version');
 let version=row?.user_version??0;
 for(const [target,sql] of [[7,migration7],[8,migration8]] as const){
  if(version>=target)continue;
  await handle.withTransactionAsync(async()=>{
   await handle.execAsync(sql);
   await handle.execAsync(`PRAGMA user_version=${target}`);
  });
  version=target;
 }
}

export const seedOwner=async(first_name:string,last_name:string)=>{const d=await getDatabase();const existing=await d.getFirstAsync('SELECT id FROM owner_profile');if(!existing)await d.runAsync('INSERT INTO owner_profile(id,first_name,last_name,created_at,updated_at) VALUES(?,?,?,?,?)',uuid(),first_name,last_name,now(),now());};

export const SyncState={
 get:async(key:string)=>{const d=await getDatabase();const row=await d.getFirstAsync<{value:string}>('SELECT value FROM sync_state WHERE key=?',key);return row?.value??null},
 set:async(key:string,value:string)=>{const d=await getDatabase();await d.runAsync('INSERT INTO sync_state(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',key,value,now())},
};

/** Test seam — lets suites drop the memoised handle between cases. */
export function __resetDatabase(){db=null;opening=null;encrypted=false;fullTextSearch=false;}
