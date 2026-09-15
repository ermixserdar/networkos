import {getDatabase,hasFullTextSearch} from '@/database/database';
import {Contact,now,uuid} from '@/types';
import {escapeLike,normalizePhone} from '@/utils/format';
import {VaultService} from '@/services/VaultService';

const SELECT=`SELECT c.*,co.name company_name FROM contacts c LEFT JOIN companies co ON co.id=c.company_id`;

export type ContactQuery={q?:string;tagId?:string;limit?:number;offset?:number;order?:'name'|'recent'|'strength';deleted?:boolean};
const ORDER={name:'c.favorite DESC,c.first_name COLLATE NOCASE,c.last_name COLLATE NOCASE',recent:'c.created_at DESC',strength:'c.relationship_strength DESC,c.importance DESC'} as const;

/** FTS5 wants explicit prefix terms; quoting each token keeps user punctuation from becoming syntax. */
function ftsQuery(q:string){
 const tokens=q.trim().split(/\s+/).map(x=>x.replace(/["*]/g,'')).filter(Boolean);
 return tokens.length?tokens.map(x=>`"${x}"*`).join(' '):null;
}

function buildWhere({q,tagId,deleted}:ContactQuery){
 // Private contacts are excluded by default; the vault decides, not the caller.
 const where=[deleted?'c.deleted_at IS NOT NULL':'c.deleted_at IS NULL'];const args:(string|number)[]=[];
 if(!VaultService.isUnlocked())where.push('c.private=0');
 if(tagId){where.push('EXISTS(SELECT 1 FROM contact_tags ct WHERE ct.contact_id=c.id AND ct.tag_id=? AND ct.deleted_at IS NULL)');args.push(tagId)}
 if(q&&q.trim()){
  const match=hasFullTextSearch()?ftsQuery(q):null;
  if(match){
   // Company lives on another table, so keep a narrow LIKE for it alongside the MATCH.
   where.push(`(c.id IN (SELECT contact_id FROM contacts_fts WHERE contacts_fts MATCH ?) OR co.name LIKE ? ESCAPE '\\')`);
   args.push(match,`%${escapeLike(q.trim())}%`);
  }else{
   const like=`%${escapeLike(q.trim())}%`;
   where.push(`(c.first_name LIKE ? ESCAPE '\\' OR c.last_name LIKE ? ESCAPE '\\' OR c.display_name LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.job_title LIKE ? ESCAPE '\\' OR c.notes LIKE ? ESCAPE '\\' OR co.name LIKE ? ESCAPE '\\')`);
   args.push(like,like,like,like,like,like,like,like);
  }
 }
 return {clause:where.join(' AND '),args};
}

export const ContactRepository={
 /** Accepts the legacy positional form (`list(q, limit, offset)`) as well as a query object. */
 list:async(query:ContactQuery|string='',limit=100,offset=0)=>{
  const spec:ContactQuery=typeof query==='string'?{q:query,limit,offset}:query;
  const d=await getDatabase();
  const {clause,args}=buildWhere(spec);
  return d.getAllAsync<Contact>(`${SELECT} WHERE ${clause} ORDER BY ${ORDER[spec.order??'name']} LIMIT ? OFFSET ?`,...args,spec.limit??limit,spec.offset??offset);
 },
 count:async(query:ContactQuery={})=>{
  const d=await getDatabase();
  const {clause,args}=buildWhere(query);
  const row=await d.getFirstAsync<{total:number}>(`SELECT COUNT(*) total FROM contacts c LEFT JOIN companies co ON co.id=c.company_id WHERE ${clause}`,...args);
  return row?.total??0;
 },
 /** Aggregates the home screen needs without pulling every row into JS. */
 stats:async()=>{
  const d=await getDatabase();
  const row=await d.getFirstAsync<{total:number;strong:number;due:number}>(
   `SELECT COUNT(*) total,SUM(CASE WHEN relationship_strength>=4 THEN 1 ELSE 0 END) strong,SUM(CASE WHEN next_follow_up_at IS NOT NULL AND next_follow_up_at<=? THEN 1 ELSE 0 END) due FROM contacts c WHERE deleted_at IS NULL${VaultService.clause()}`,Date.now());
  return {total:row?.total??0,strong:row?.strong??0,due:row?.due??0};
 },
 /** Opening a specific private contact is allowed once the vault is unlocked. */
 get:async(id:string)=>{const d=await getDatabase();return d.getFirstAsync<Contact>(`${SELECT} WHERE c.id=? AND c.deleted_at IS NULL${VaultService.clause()}`,id);},
 findByPhoneOrEmail:async(phone?:string|null,email?:string|null)=>{const d=await getDatabase();const norm=normalizePhone(phone);const cleanEmail=email?.trim().toLowerCase()||null;if(!norm&&!cleanEmail)return null;return d.getFirstAsync<Contact>(`${SELECT} WHERE c.deleted_at IS NULL AND ((? IS NOT NULL AND (c.phone_norm=? OR c.phone=?)) OR (? IS NOT NULL AND lower(c.email)=?)) LIMIT 1`,norm??null,norm??phone??null,phone??null,cleanEmail,cleanEmail);},
 findByEmails:async(emails:string[])=>{
  const cleaned=emails.map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!cleaned.length)return [];
  const d=await getDatabase();
  return d.getAllAsync<Contact>(`${SELECT} WHERE c.deleted_at IS NULL${VaultService.clause()} AND lower(c.email) IN (${cleaned.map(()=>'?').join(',')})`,...cleaned);
 },
 /** Callers compute the next occurrence themselves so 29 Feb is clamped consistently. */
 withBirthday:async()=>{const d=await getDatabase();return d.getAllAsync<Contact>(`${SELECT} WHERE c.deleted_at IS NULL AND c.birthday IS NOT NULL${VaultService.clause()}`);},
 save:async(data:Partial<Contact>&{first_name:string})=>{
  const d=await getDatabase(),t=now(),id=data.id??uuid();
  const cleanPhone=data.phone?.trim()||null;
  const cleanEmail=data.email?.trim()||null;
  const phoneNorm=normalizePhone(cleanPhone)??null;
  const columns=['first_name','last_name','display_name','job_title','company_id','email','phone','phone_norm','linkedin_url','website','city','country','birthday','relationship_strength','importance','how_we_met','met_at','met_date','notes','next_follow_up_at','cadence_days','favorite','photo','private'];
  const values=[
   data.first_name,data.last_name??null,data.display_name??`${data.first_name} ${data.last_name??''}`.trim(),data.job_title??null,
   data.company_id??null,cleanEmail,cleanPhone,phoneNorm,data.linkedin_url??null,data.website??null,data.city??null,data.country??null,
   data.birthday??null,data.relationship_strength??3,data.importance??3,data.how_we_met??null,data.met_at??null,data.met_date??null,
   data.notes??null,data.next_follow_up_at??null,data.cadence_days??null,data.favorite??0,data.photo??null,data.private??0,
  ];
  const updates=columns.map(c=>`${c}=excluded.${c}`).join(',');
  await d.runAsync(
   `INSERT INTO contacts(id,${columns.join(',')},created_at,updated_at,sync_status,version) VALUES(?,${columns.map(()=>'?').join(',')},?,?,?,?) ON CONFLICT(id) DO UPDATE SET ${updates},updated_at=excluded.updated_at,sync_status='local',version=contacts.version+1`,
   id,...values,t,t,'local',1);
  return id;
 },
 /**
  * Claims a phone-book entry for a contact. Deliberately touches neither `updated_at`, `version`
  * nor `sync_status`: the column never travels between devices, and marking hundreds of rows newer
  * for a link nobody else can see would make them win a sync merge carrying no new data.
  * The `IS NULL` guard keeps an existing link, and the unique index rejects a second claimant.
  */
 linkDevice:async(id:string,deviceContactId:string)=>{
  const d=await getDatabase();
  await d.runAsync('UPDATE contacts SET device_contact_id=? WHERE id=? AND device_contact_id IS NULL',deviceContactId,id);
 },
 /** Partial writes used by follow-up scheduling and the pulse actions. */
 patch:async(id:string,fields:Partial<Contact>)=>{
  const keys=Object.keys(fields) as (keyof Contact)[];
  if(!keys.length)return;
  const d=await getDatabase();
  await d.runAsync(`UPDATE contacts SET ${keys.map(k=>`${k}=?`).join(',')},updated_at=?,version=version+1,sync_status='local' WHERE id=?`,...(keys.map(k=>fields[k]??null) as (string|number|null)[]),now(),id);
 },
 /** Soft deletes are recoverable, so the trash can put a person back exactly as they were. */
 restore:async(id:string)=>{const d=await getDatabase(),t=now();await d.withTransactionAsync(async()=>{
  await d.runAsync('UPDATE contacts SET deleted_at=NULL,updated_at=?,version=version+1 WHERE id=?',t,id);
  await d.runAsync('UPDATE interactions SET deleted_at=NULL,updated_at=? WHERE contact_id=? AND deleted_at IS NOT NULL',t,id);
  await d.runAsync('UPDATE commitments SET deleted_at=NULL,updated_at=? WHERE contact_id=? AND deleted_at IS NOT NULL',t,id);
  await d.runAsync('UPDATE contact_tags SET deleted_at=NULL,updated_at=? WHERE contact_id=? AND deleted_at IS NOT NULL',t,id);
 });},
 /** The only place a contact actually leaves the device. Not reversible and not synced back. */
 purge:async(id:string)=>{const d=await getDatabase();await d.withTransactionAsync(async()=>{
  await d.runAsync('DELETE FROM contact_tags WHERE contact_id=?',id);
  await d.runAsync('DELETE FROM event_contacts WHERE contact_id=?',id);
  await d.runAsync('DELETE FROM commitments WHERE contact_id=?',id);
  await d.runAsync('DELETE FROM interactions WHERE contact_id=?',id);
  await d.runAsync('DELETE FROM relationships WHERE contact_a_id=? OR contact_b_id=?',id,id);
  await d.runAsync('DELETE FROM contacts WHERE id=?',id);
 });},
 remove:async(id:string)=>{const d=await getDatabase();const t=now();await d.withTransactionAsync(async()=>{
  await d.runAsync('UPDATE contacts SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',t,t,id);
  await d.runAsync('UPDATE relationships SET deleted_at=?,updated_at=?,version=version+1 WHERE deleted_at IS NULL AND (contact_a_id=? OR contact_b_id=?)',t,t,id,id);
  await d.runAsync('UPDATE interactions SET deleted_at=?,updated_at=?,version=version+1 WHERE deleted_at IS NULL AND contact_id=?',t,t,id);
  await d.runAsync('UPDATE commitments SET deleted_at=?,updated_at=?,version=version+1 WHERE deleted_at IS NULL AND contact_id=?',t,t,id);
  await d.runAsync('UPDATE contact_tags SET deleted_at=?,updated_at=? WHERE deleted_at IS NULL AND contact_id=?',t,t,id);
  await d.runAsync('UPDATE event_contacts SET deleted_at=?,updated_at=? WHERE deleted_at IS NULL AND contact_id=?',t,t,id);
 });}
};
