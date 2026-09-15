import {getDatabase} from '@/database/database';
import {Commitment,CommitmentDirection,now,uuid} from '@/types';
import {VaultService} from '@/services/VaultService';

const SELECT=()=>`SELECT cm.*,c.display_name,c.first_name,c.last_name FROM commitments cm JOIN contacts c ON c.id=cm.contact_id WHERE cm.deleted_at IS NULL AND c.deleted_at IS NULL${VaultService.clause()}`;
const ORDER=`ORDER BY cm.completed_at IS NOT NULL,cm.due_at IS NULL,cm.due_at`;

export const CommitmentRepository={
 list:async(filter:{contactId?:string;direction?:CommitmentDirection;openOnly?:boolean}={})=>{
  const d=await getDatabase();
  const where:string[]=[];const args:(string|number)[]=[];
  if(filter.contactId){where.push('cm.contact_id=?');args.push(filter.contactId)}
  if(filter.direction){where.push('cm.direction=?');args.push(filter.direction)}
  if(filter.openOnly)where.push('cm.completed_at IS NULL');
  return d.getAllAsync<Commitment>(`${SELECT()}${where.length?` AND ${where.join(' AND ')}`:''} ${ORDER}`,...args);
 },
 /** The reciprocity ledger: open promises in each direction, overall and per contact. */
 balance:async(contactId?:string)=>{
  const d=await getDatabase();
  const row=await d.getFirstAsync<{mine:number;theirs:number}>(
   `SELECT SUM(CASE WHEN cm.direction='owed_by_me' THEN 1 ELSE 0 END) mine,SUM(CASE WHEN cm.direction='owed_to_me' THEN 1 ELSE 0 END) theirs FROM commitments cm JOIN contacts c ON c.id=cm.contact_id WHERE cm.deleted_at IS NULL AND c.deleted_at IS NULL${VaultService.clause()} AND cm.completed_at IS NULL${contactId?' AND cm.contact_id=?':''}`,
   ...(contactId?[contactId]:[]));
  return {mine:row?.mine??0,theirs:row?.theirs??0};
 },
 create:async(contactId:string,text:string,dueAt?:number|null,direction:CommitmentDirection='owed_by_me')=>{
  const d=await getDatabase(),t=now(),id=uuid();
  await d.runAsync('INSERT INTO commitments(id,contact_id,text,direction,due_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',id,contactId,text.trim(),direction,dueAt??null,t,t);
  return id;
 },
 complete:async(id:string,completed:boolean)=>{const d=await getDatabase();await d.runAsync('UPDATE commitments SET completed_at=?,updated_at=?,version=version+1 WHERE id=?',completed?now():null,now(),id)},
 remove:async(id:string)=>{const d=await getDatabase(),t=now();await d.runAsync('UPDATE commitments SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',t,t,id)},
 dueCount:async(within=86400000)=>{const d=await getDatabase();const row=await d.getFirstAsync<{total:number}>(`SELECT COUNT(*) total FROM commitments cm JOIN contacts c ON c.id=cm.contact_id WHERE cm.deleted_at IS NULL AND c.deleted_at IS NULL${VaultService.clause()} AND cm.completed_at IS NULL AND cm.due_at IS NOT NULL AND cm.due_at<=?`,Date.now()+within);return row?.total??0},
};
