import {getDatabase} from '@/database/database';
import {Tag,now,uuid} from '@/types';
import {VaultService} from '@/services/VaultService';
export type {Tag};

export const TagRepository={
 list:async()=>{const d=await getDatabase();return d.getAllAsync<Tag>(`SELECT t.id,t.name,(SELECT COUNT(*) FROM contact_tags ct JOIN contacts c ON c.id=ct.contact_id WHERE ct.tag_id=t.id AND ct.deleted_at IS NULL AND c.deleted_at IS NULL${VaultService.clause()}) contact_count FROM tags t WHERE t.deleted_at IS NULL ORDER BY t.name COLLATE NOCASE`)},
 create:async(name:string)=>{
  const d=await getDatabase(),t=now();
  const trimmed=name.trim();
  const existing=await d.getFirstAsync<Tag>('SELECT id,name FROM tags WHERE lower(name)=lower(?) AND deleted_at IS NULL',trimmed);
  if(existing)return existing.id;
  const id=uuid();
  // Revive a soft-deleted tag of the same name instead of colliding with the UNIQUE(name) index.
  const tombstone=await d.getFirstAsync<{id:string}>('SELECT id FROM tags WHERE lower(name)=lower(?) AND deleted_at IS NOT NULL',trimmed);
  if(tombstone){await d.runAsync('UPDATE tags SET deleted_at=NULL,updated_at=?,version=version+1 WHERE id=?',t,tombstone.id);return tombstone.id}
  await d.runAsync('INSERT INTO tags(id,name,created_at,updated_at) VALUES(?,?,?,?)',id,trimmed,t,t);
  return id;
 },
 rename:async(id:string,name:string)=>{const d=await getDatabase();await d.runAsync('UPDATE tags SET name=?,updated_at=?,version=version+1 WHERE id=?',name.trim(),now(),id)},
 remove:async(id:string)=>{const d=await getDatabase(),t=now();await d.withTransactionAsync(async()=>{
  await d.runAsync('UPDATE tags SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',t,t,id);
  await d.runAsync('UPDATE contact_tags SET deleted_at=?,updated_at=? WHERE tag_id=? AND deleted_at IS NULL',t,t,id);
 })},
 assign:async(contactId:string,tagId:string)=>{
  const d=await getDatabase(),t=now();
  await d.runAsync('INSERT INTO contact_tags(contact_id,tag_id,created_at,updated_at,deleted_at) VALUES(?,?,?,?,NULL) ON CONFLICT(contact_id,tag_id) DO UPDATE SET deleted_at=NULL,updated_at=excluded.updated_at',contactId,tagId,t,t);
 },
 unassign:async(contactId:string,tagId:string)=>{const d=await getDatabase(),t=now();await d.runAsync('UPDATE contact_tags SET deleted_at=?,updated_at=? WHERE contact_id=? AND tag_id=? AND deleted_at IS NULL',t,t,contactId,tagId)},
 forContact:async(contactId:string)=>{const d=await getDatabase();return d.getAllAsync<Tag>('SELECT t.id,t.name FROM tags t JOIN contact_tags ct ON ct.tag_id=t.id WHERE ct.contact_id=? AND ct.deleted_at IS NULL AND t.deleted_at IS NULL ORDER BY t.name COLLATE NOCASE',contactId)},
 /** One round trip for the whole list screen instead of one query per row. */
 forContacts:async(contactIds:string[])=>{
  if(!contactIds.length)return new Map<string,Tag[]>();
  const d=await getDatabase();
  const rows=await d.getAllAsync<Tag&{contact_id:string}>(`SELECT ct.contact_id,t.id,t.name FROM contact_tags ct JOIN tags t ON t.id=ct.tag_id WHERE ct.deleted_at IS NULL AND t.deleted_at IS NULL AND ct.contact_id IN (${contactIds.map(()=>'?').join(',')}) ORDER BY t.name COLLATE NOCASE`,...contactIds);
  const map=new Map<string,Tag[]>();
  for(const row of rows)map.set(row.contact_id,[...(map.get(row.contact_id)??[]),{id:row.id,name:row.name}]);
  return map;
 },
};
