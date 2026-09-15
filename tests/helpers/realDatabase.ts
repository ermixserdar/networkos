import {readFileSync} from 'fs';
import {join} from 'path';
import {DatabaseSync} from 'node:sqlite';

/**
 * Runs services against a real SQLite built from the real migrations, so the SQL under test is
 * the SQL that ships. Node's SQLite is not SQLCipher, which does not matter here — encryption is
 * a build concern, covered in `docs/SECURITY.md`.
 */
const SOURCE=readFileSync(join(__dirname,'..','..','src','database','database.ts'),'utf8');
const literal=(name:string)=>{
 const match=new RegExp(`const ${name}=\`([\\s\\S]*?)\`;`).exec(SOURCE);
 if(!match)throw new Error(`missing ${name}`);
 return match[1];
};
const withNew=(sql:string)=>sql.replace(/\b(first_name|last_name|display_name|email|phone|job_title|city|country|how_we_met|met_at|notes)\b/g,'new.$1');

export function migratedDatabase(){
 const body=literal('FTS_BODY');
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON');
 for(const name of ['migration','migration2','migration3','migration4','migration5'])db.exec(literal(name));
 db.exec(literal('migration6').replace(/\$\{FTS_BODY\.replace\([\s\S]*?\)\}/g,withNew(body)).replace(/\$\{FTS_BODY\}/g,body));
 db.exec(literal('migration7'));
 db.exec(literal('migration8'));
 return db;
}

/** The async surface `getDatabase()` promises, backed by the synchronous node driver. */
export function asyncAdapter(db:DatabaseSync){
 return {
  getAllAsync:async(sql:string,...args:unknown[])=>db.prepare(sql).all(...(args as never[])),
  getFirstAsync:async(sql:string,...args:unknown[])=>db.prepare(sql).get(...(args as never[]))??null,
  runAsync:async(sql:string,...args:unknown[])=>db.prepare(sql).run(...(args as never[])),
  execAsync:async(sql:string)=>{db.exec(sql)},
  withTransactionAsync:async(fn:()=>Promise<void>)=>{
   db.exec('BEGIN');
   try{await fn();db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}
  },
 };
}

const NOW=1_700_000_000_000;
const quote=(value:unknown)=>value===null||value===undefined?'NULL':typeof value==='number'?String(value):`'${String(value).replace(/'/g,"''")}'`;

export function insertContact(db:DatabaseSync,id:string,first:string,extra:Record<string,string|number|null>={}){
 const columns=Object.keys(extra);
 db.exec(`INSERT INTO contacts(id,first_name,relationship_strength,importance,favorite,created_at,updated_at${columns.length?','+columns.join(','):''})`
  +` VALUES(${quote(id)},${quote(first)},3,3,0,${NOW},${NOW}${columns.length?','+Object.values(extra).map(quote).join(','):''})`);
}
export const TEST_NOW=NOW;
