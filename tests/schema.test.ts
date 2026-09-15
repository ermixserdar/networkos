import {readFileSync} from 'fs';
import {join} from 'path';
import {DatabaseSync} from 'node:sqlite';

/**
 * Runs the real migrations and the real repository SQL against a real SQLite, so schema mistakes
 * are caught here instead of on a device. Node's SQLite is not SQLCipher, which is fine: this
 * checks the statements, not the encryption (see `docs/SECURITY.md` for that).
 */
const SOURCE=readFileSync(join(__dirname,'..','src','database','database.ts'),'utf8');
const literal=(name:string)=>{
 const match=new RegExp(`const ${name}=\`([\\s\\S]*?)\`;`).exec(SOURCE);
 if(!match)throw new Error(`missing ${name}`);
 return match[1];
};
const withNew=(sql:string)=>sql.replace(/\b(first_name|last_name|display_name|email|phone|job_title|city|country|how_we_met|met_at|notes)\b/g,'new.$1');

function migrate(){
 const body=literal('FTS_BODY');
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON');
 for(const name of ['migration','migration2','migration3','migration4','migration5'])db.exec(literal(name));
 db.exec(literal('migration6')
  .replace(/\$\{FTS_BODY\.replace\([\s\S]*?\)\}/g,withNew(body))
  .replace(/\$\{FTS_BODY\}/g,body));
 db.exec(literal('migration7'));
 db.exec(literal('migration8'));
 return db;
}

const NOW=1_700_000_000_000;
const quote=(value:string|number)=>typeof value==='string'?`'${value.replace(/'/g,"''")}'`:String(value);
function addContact(db:DatabaseSync,id:string,first:string,extra:Record<string,string|number>={}){
 const columns=Object.keys(extra);
 db.exec(`INSERT INTO contacts(id,first_name,relationship_strength,importance,favorite,created_at,updated_at${columns.length?','+columns.join(','):''})`
  +` VALUES(${quote(id)},${quote(first)},4,4,0,${NOW},${NOW}${columns.length?','+Object.values(extra).map(quote).join(','):''})`);
}
const count=(db:DatabaseSync,sql:string)=>(db.prepare(sql).get() as {n:number}).n;

describe('schema',()=>{
 test('every migration applies in order',()=>{
  expect(()=>migrate()).not.toThrow();
 });

 test('full-text search is diacritic-insensitive, so Turkish names are findable either way',()=>{
  const db=migrate();
  addContact(db,'c1','Şükrü',{last_name:'Çelik',notes:'met at ODTÜ'});
  const hits=db.prepare(`SELECT contact_id FROM contacts_fts WHERE contacts_fts MATCH '"sukru"*'`).all();
  expect(hits).toHaveLength(1);
 });

 test('the search index follows edits and soft deletes',()=>{
  const db=migrate();
  addContact(db,'c1','Ada');
  db.exec(`UPDATE contacts SET first_name='Grace',updated_at=${NOW} WHERE id='c1'`);
  expect(count(db,`SELECT COUNT(*) n FROM contacts_fts WHERE contacts_fts MATCH '"ada"*'`)).toBe(0);
  expect(count(db,`SELECT COUNT(*) n FROM contacts_fts WHERE contacts_fts MATCH '"grace"*'`)).toBe(1);
  db.exec(`UPDATE contacts SET deleted_at=${NOW} WHERE id='c1'`);
  expect(count(db,'SELECT COUNT(*) n FROM contacts_fts')).toBe(0);
 });

 test('the same relationship cannot be stored twice in either direction',()=>{
  const db=migrate();
  addContact(db,'a','A');addContact(db,'b','B');
  db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r1','a','b',3,${NOW},${NOW})`);
  expect(()=>db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r2','b','a',5,${NOW},${NOW})`)).toThrow(/UNIQUE/);
 });

 test('a soft-deleted relationship frees the pair again',()=>{
  const db=migrate();
  addContact(db,'a','A');addContact(db,'b','B');
  db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r1','a','b',3,${NOW},${NOW})`);
  db.exec(`UPDATE relationships SET deleted_at=${NOW} WHERE id='r1'`);
  expect(()=>db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r2','a','b',5,${NOW},${NOW})`)).not.toThrow();
 });

 test('a promise defaults to something the reciprocity ledger can read',()=>{
  const db=migrate();
  addContact(db,'c1','Ada');
  db.exec(`INSERT INTO commitments(id,contact_id,text,created_at,updated_at) VALUES('p1','c1','Send deck',${NOW},${NOW})`);
  expect((db.prepare("SELECT direction FROM commitments WHERE id='p1'").get() as {direction:string}).direction).toBe('owed_by_me');
 });

 test('join tables carry the columns sync needs to propagate a removal',()=>{
  const db=migrate();
  addContact(db,'c1','Ada');
  db.exec(`INSERT INTO tags(id,name,created_at,updated_at) VALUES('t1','Investors',${NOW},${NOW})`);
  db.exec(`INSERT INTO contact_tags(contact_id,tag_id,created_at,updated_at,deleted_at) VALUES('c1','t1',${NOW},${NOW},NULL) ON CONFLICT(contact_id,tag_id) DO UPDATE SET deleted_at=NULL`);
  expect(Object.keys(db.prepare('SELECT * FROM contact_tags').get() as object)).toEqual(['contact_id','tag_id','created_at','updated_at','deleted_at']);
 });

 test('stores a photo and a private flag on a contact',()=>{
  const db=migrate();
  addContact(db,'c1','Ada',{photo:'data:image/jpeg;base64,AAA',private:1});
  const row=db.prepare("SELECT photo,private FROM contacts WHERE id='c1'").get() as {photo:string;private:number};
  expect(row.photo).toContain('base64');
  expect(row.private).toBe(1);
 });

 test('one phone-book entry can belong to only one live contact',()=>{
  const db=migrate();
  addContact(db,'a','Ada',{device_contact_id:'d1'});
  expect(()=>addContact(db,'b','Grace',{device_contact_id:'d1'})).toThrow();
  db.exec("UPDATE contacts SET deleted_at=1 WHERE id='a'");
  // Soft-deleting the claimant frees the entry, the way the relationship pair index does.
  expect(()=>addContact(db,'b','Grace',{device_contact_id:'d1'})).not.toThrow();
 });

 test('a contact starts with no phone-book link',()=>{
  const db=migrate();
  addContact(db,'a','Ada');
  expect(count(db,"SELECT COUNT(*) n FROM contacts WHERE device_contact_id IS NULL")).toBe(1);
 });

 test('defaults a contact to not private',()=>{
  const db=migrate();
  addContact(db,'c1','Ada');
  expect((db.prepare("SELECT private FROM contacts WHERE id='c1'").get() as {private:number}).private).toBe(0);
 });

 test('counts goal progress from interactions inside the window only',()=>{
  const db=migrate();
  addContact(db,'c1','Ada');addContact(db,'c2','Grace');
  db.exec(`INSERT INTO goals(id,title,target,starts_at,ends_at,created_at,updated_at) VALUES('g1','Investors',3,${NOW},${NOW+1000},${NOW},${NOW})`);
  const log=(id:string,contact:string,at:number)=>db.exec(`INSERT INTO interactions(id,contact_id,type,interaction_at,created_at,updated_at) VALUES('${id}','${contact}','meeting',${at},${NOW},${NOW})`);
  log('i1','c1',NOW+10);
  log('i2','c1',NOW+20);   // same person twice still counts once
  log('i3','c2',NOW+5000); // outside the window
  const progress=count(db,`SELECT COUNT(DISTINCT i.contact_id) n FROM interactions i JOIN contacts c ON c.id=i.contact_id
    WHERE i.deleted_at IS NULL AND c.deleted_at IS NULL AND i.interaction_at BETWEEN ${NOW} AND ${NOW+1000}`);
  expect(progress).toBe(1);
 });

 test('a purged contact leaves nothing behind',()=>{
  const db=migrate();
  addContact(db,'c1','Ada');
  db.exec(`INSERT INTO interactions(id,contact_id,type,interaction_at,created_at,updated_at) VALUES('i1','c1','meeting',${NOW},${NOW},${NOW})`);
  db.exec(`DELETE FROM interactions WHERE contact_id='c1'`);
  db.exec(`DELETE FROM contacts WHERE id='c1'`);
  expect(count(db,'SELECT COUNT(*) n FROM contacts')).toBe(0);
  expect(count(db,'SELECT COUNT(*) n FROM contacts_fts')).toBe(0);
 });

 test('foreign keys reject a contact pointing at a company that does not exist',()=>{
  const db=migrate();
  expect(()=>db.exec(`INSERT INTO contacts(id,first_name,company_id,relationship_strength,importance,favorite,created_at,updated_at) VALUES('x','X','ghost',3,3,0,${NOW},${NOW})`)).toThrow(/FOREIGN KEY/);
 });
});
