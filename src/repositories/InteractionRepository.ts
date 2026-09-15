import {getDatabase} from '@/database/database';
import {Interaction,now,uuid} from '@/types';

export const InteractionRepository={
 listForContact:async(contactId:string,limit=100)=>{const d=await getDatabase();return d.getAllAsync<Interaction>('SELECT * FROM interactions WHERE contact_id=? AND deleted_at IS NULL ORDER BY interaction_at DESC LIMIT ?',contactId,limit)},
 recentForContacts:async(contactIds:string[],perContact=3)=>{
  if(!contactIds.length)return new Map<string,Interaction[]>();
  const d=await getDatabase();
  const rows=await d.getAllAsync<Interaction>(`SELECT * FROM interactions WHERE deleted_at IS NULL AND contact_id IN (${contactIds.map(()=>'?').join(',')}) ORDER BY interaction_at DESC`,...contactIds);
  const map=new Map<string,Interaction[]>();
  for(const row of rows){const current=map.get(row.contact_id)??[];if(current.length<perContact)map.set(row.contact_id,[...current,row]);}
  return map;
 },
 create:async(data:Pick<Interaction,'contact_id'|'type'|'interaction_at'>&{title?:string;description?:string})=>{
  const d=await getDatabase(),id=uuid(),t=now();
  await d.runAsync('INSERT INTO interactions(id,contact_id,type,title,description,interaction_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',id,data.contact_id,data.type,data.title??null,data.description??null,data.interaction_at,t,t);
  await d.runAsync('UPDATE contacts SET last_contact_at=CASE WHEN last_contact_at IS NULL OR last_contact_at<? THEN ? ELSE last_contact_at END,updated_at=?,version=version+1 WHERE id=?',data.interaction_at,data.interaction_at,t,data.contact_id);
  return id;
 },
 remove:async(id:string)=>{const d=await getDatabase();await d.runAsync('UPDATE interactions SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',now(),now(),id)},
};
