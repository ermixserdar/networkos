import {getDatabase} from '@/database/database';
import {Contact,now} from '@/types';
import {VaultService} from '@/services/VaultService';

export type DuplicateGroup={reason:'phone'|'email'|'name';value:string;contacts:Contact[]};

/** Fields where the loser can fill a gap in the winner without ambiguity. */
const FILLABLE=['last_name','display_name','job_title','company_id','email','phone','phone_norm','linkedin_url','website','city','country','birthday','how_we_met','met_at','met_date','cadence_days','photo'] as const;

export const MergeService={
 /**
  * Import, manual entry and sync all create duplicates, and until now there was no way to fix one
  * that had already landed. Matching is deliberately conservative: an exact normalised phone,
  * email or full name.
  */
 duplicates:async(limit=25):Promise<DuplicateGroup[]>=>{
  const d=await getDatabase();
  const gate=VaultService.clause();
  const groups:DuplicateGroup[]=[];
  const seen=new Set<string>();
  const keys=[
   {reason:'phone' as const,expression:'c.phone_norm',filter:"c.phone_norm IS NOT NULL AND c.phone_norm<>''"},
   {reason:'email' as const,expression:'lower(c.email)',filter:"c.email IS NOT NULL AND c.email<>''"},
   {reason:'name' as const,expression:"lower(trim(coalesce(c.display_name,c.first_name||' '||coalesce(c.last_name,''))))",filter:'1=1'},
  ];
  for(const key of keys){
   const rows=await d.getAllAsync<{value:string}>(
    `SELECT ${key.expression} value FROM contacts c WHERE c.deleted_at IS NULL${gate} AND ${key.filter}
     GROUP BY value HAVING COUNT(*)>1 LIMIT ?`,limit);
   for(const row of rows){
    if(!row.value||seen.has(`${key.reason}:${row.value}`))continue;
    const contacts=await d.getAllAsync<Contact>(
     `SELECT c.*,co.name company_name FROM contacts c LEFT JOIN companies co ON co.id=c.company_id
      WHERE c.deleted_at IS NULL${gate} AND ${key.expression}=? ORDER BY c.updated_at DESC`,row.value);
    if(contacts.length<2)continue;
    // A pair already reported under a stronger signal does not need reporting again.
    const signature=contacts.map(x=>x.id).sort().join('|');
    if(seen.has(signature))continue;
    seen.add(signature);seen.add(`${key.reason}:${row.value}`);
    groups.push({reason:key.reason,value:row.value,contacts});
   }
  }
  return groups.slice(0,limit);
 },

 /** Everything attached to `loserId` moves to `winnerId`; the loser is then soft-deleted. */
 merge:async(winnerId:string,loserId:string)=>{
  if(winnerId===loserId)throw Error('A contact cannot be merged into itself');
  const d=await getDatabase();
  const t=now();
  await d.withTransactionAsync(async()=>{
   const winner=await d.getFirstAsync<Record<string,unknown>>('SELECT * FROM contacts WHERE id=?',winnerId);
   const loser=await d.getFirstAsync<Record<string,unknown>>('SELECT * FROM contacts WHERE id=?',loserId);
   if(!winner||!loser)throw Error('Contact not found');

   const fills=FILLABLE.filter(column=>(winner[column]===null||winner[column]===undefined)&&loser[column]!==null&&loser[column]!==undefined);
   const notes=[winner.notes,loser.notes].filter(Boolean).join('\n\n');
   const sets=[...fills.map(column=>`${column}=?`),'notes=?','relationship_strength=?','importance=?','favorite=?','last_contact_at=?','updated_at=?','version=version+1'];
   await d.runAsync(`UPDATE contacts SET ${sets.join(',')} WHERE id=?`,
    ...fills.map(column=>loser[column] as never),
    notes||null,
    Math.max(Number(winner.relationship_strength??3),Number(loser.relationship_strength??3)),
    Math.max(Number(winner.importance??3),Number(loser.importance??3)),
    Number(winner.favorite)||Number(loser.favorite)?1:0,
    Math.max(Number(winner.last_contact_at??0),Number(loser.last_contact_at??0))||null,
    t,winnerId);

   await d.runAsync('UPDATE interactions SET contact_id=?,updated_at=?,version=version+1 WHERE contact_id=?',winnerId,t,loserId);
   await d.runAsync('UPDATE commitments SET contact_id=?,updated_at=?,version=version+1 WHERE contact_id=?',winnerId,t,loserId);

   // Join rows and edges can collide with ones the winner already has, so move only the new ones.
   await d.runAsync('UPDATE contact_tags SET contact_id=? WHERE contact_id=? AND tag_id NOT IN (SELECT tag_id FROM contact_tags WHERE contact_id=?)',winnerId,loserId,winnerId);
   await d.runAsync('UPDATE event_contacts SET contact_id=? WHERE contact_id=? AND event_id NOT IN (SELECT event_id FROM event_contacts WHERE contact_id=?)',winnerId,loserId,winnerId);
   await d.runAsync('DELETE FROM contact_tags WHERE contact_id=?',loserId);
   await d.runAsync('DELETE FROM event_contacts WHERE contact_id=?',loserId);

   const edges=await d.getAllAsync<{id:string;contact_a_id:string;contact_b_id:string}>(
    'SELECT id,contact_a_id,contact_b_id FROM relationships WHERE deleted_at IS NULL AND (contact_a_id=? OR contact_b_id=?)',loserId,loserId);
   for(const edge of edges){
    const other=edge.contact_a_id===loserId?edge.contact_b_id:edge.contact_a_id;
    if(other===winnerId){await d.runAsync('UPDATE relationships SET deleted_at=?,updated_at=? WHERE id=?',t,t,edge.id);continue}
    const [x,y]=[winnerId,other].sort();
    const existing=await d.getFirstAsync<{id:string}>('SELECT id FROM relationships WHERE min(contact_a_id,contact_b_id)=? AND max(contact_a_id,contact_b_id)=? AND deleted_at IS NULL',x,y);
    if(existing)await d.runAsync('UPDATE relationships SET deleted_at=?,updated_at=? WHERE id=?',t,t,edge.id);
    else await d.runAsync('UPDATE relationships SET contact_a_id=?,contact_b_id=?,updated_at=?,version=version+1 WHERE id=?',x,y,t,edge.id);
   }

   await d.runAsync('UPDATE contacts SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',t,t,loserId);
  });
 },
};
