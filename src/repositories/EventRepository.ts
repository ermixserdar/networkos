import {getDatabase} from '@/database/database';
import {Contact,Event,now,uuid} from '@/types';
import {VaultService} from '@/services/VaultService';

export const EventRepository={
 list:async()=>{const d=await getDatabase();return d.getAllAsync<Event>(`SELECT e.*,(SELECT COUNT(*) FROM event_contacts ec JOIN contacts c ON c.id=ec.contact_id WHERE ec.event_id=e.id AND ec.deleted_at IS NULL AND c.deleted_at IS NULL${VaultService.clause()}) contact_count FROM events e WHERE e.deleted_at IS NULL ORDER BY e.event_at DESC`)},
 get:async(id:string)=>{const d=await getDatabase();return d.getFirstAsync<Event>('SELECT * FROM events WHERE id=? AND deleted_at IS NULL',id)},
 create:async(name:string,eventAt:number,location?:string,notes?:string)=>{const d=await getDatabase(),id=uuid(),t=now();await d.runAsync('INSERT INTO events(id,name,event_at,location,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',id,name.trim(),eventAt,location?.trim()||null,notes?.trim()||null,t,t);return id},
 remove:async(id:string)=>{const d=await getDatabase(),t=now();await d.withTransactionAsync(async()=>{
  await d.runAsync('UPDATE events SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',t,t,id);
  await d.runAsync('UPDATE event_contacts SET deleted_at=?,updated_at=? WHERE event_id=? AND deleted_at IS NULL',t,t,id);
 })},
 attendees:async(eventId:string)=>{const d=await getDatabase();return d.getAllAsync<Contact>(`SELECT c.*,co.name company_name FROM event_contacts ec JOIN contacts c ON c.id=ec.contact_id LEFT JOIN companies co ON co.id=c.company_id WHERE ec.event_id=? AND ec.deleted_at IS NULL AND c.deleted_at IS NULL${VaultService.clause()} ORDER BY c.first_name COLLATE NOCASE`,eventId)},
 setAttendees:async(eventId:string,contactIds:string[])=>{
  const d=await getDatabase(),t=now();
  await d.withTransactionAsync(async()=>{
   await d.runAsync('UPDATE event_contacts SET deleted_at=?,updated_at=? WHERE event_id=? AND deleted_at IS NULL',t,t,eventId);
   for(const contactId of contactIds)await d.runAsync('INSERT INTO event_contacts(event_id,contact_id,created_at,updated_at,deleted_at) VALUES(?,?,?,?,NULL) ON CONFLICT(event_id,contact_id) DO UPDATE SET deleted_at=NULL,updated_at=excluded.updated_at',eventId,contactId,t,t);
  });
 },
};
