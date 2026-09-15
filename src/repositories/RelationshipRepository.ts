import {getDatabase} from '@/database/database';
import {Relationship,now,uuid} from '@/types';

export type RelationshipEdge=Relationship&{other_id:string;other_name:string;other_job_title?:string|null};

export const RelationshipRepository={
 listForContact:async(id:string)=>{
  const d=await getDatabase();
  return d.getAllAsync<RelationshipEdge>(
   `SELECT r.*,o.id other_id,coalesce(o.display_name,o.first_name||' '||coalesce(o.last_name,'')) other_name,o.job_title other_job_title
    FROM relationships r
    JOIN contacts o ON o.id=CASE WHEN r.contact_a_id=? THEN r.contact_b_id ELSE r.contact_a_id END
    WHERE (r.contact_a_id=? OR r.contact_b_id=?) AND r.deleted_at IS NULL AND o.deleted_at IS NULL
    ORDER BY r.strength DESC,other_name COLLATE NOCASE`,id,id,id);
 },
 create:async(a:string,b:string,type:string,strength:number)=>{
  if(a===b)throw Error('A person cannot be connected to themselves');
  const d=await getDatabase(),[x,y]=[a,b].sort(),t=now();
  const existing=await d.getFirstAsync<Relationship>('SELECT id FROM relationships WHERE min(contact_a_id,contact_b_id)=? AND max(contact_a_id,contact_b_id)=? AND deleted_at IS NULL',x,y);
  if(existing){await d.runAsync('UPDATE relationships SET relationship_type=?,strength=?,updated_at=?,version=version+1 WHERE id=?',type,strength,t,existing.id);return existing.id}
  // A soft-deleted pair still occupies the partial unique index only while deleted_at IS NULL, but
  // reviving keeps history rather than piling up duplicate rows.
  const tombstone=await d.getFirstAsync<Relationship>('SELECT id FROM relationships WHERE min(contact_a_id,contact_b_id)=? AND max(contact_a_id,contact_b_id)=? AND deleted_at IS NOT NULL',x,y);
  if(tombstone){await d.runAsync('UPDATE relationships SET deleted_at=NULL,relationship_type=?,strength=?,updated_at=?,version=version+1 WHERE id=?',type,strength,t,tombstone.id);return tombstone.id}
  const id=uuid();
  await d.runAsync('INSERT INTO relationships(id,contact_a_id,contact_b_id,relationship_type,strength,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',id,x,y,type,strength,t,t);
  return id;
 },
 remove:async(id:string)=>{const d=await getDatabase();await d.runAsync('UPDATE relationships SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',now(),now(),id)},
 countForContact:async(id:string)=>{const d=await getDatabase();const row=await d.getFirstAsync<{total:number}>('SELECT COUNT(*) total FROM relationships WHERE deleted_at IS NULL AND (contact_a_id=? OR contact_b_id=?)',id,id);return row?.total??0},
};
