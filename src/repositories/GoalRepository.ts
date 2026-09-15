import {getDatabase} from '@/database/database';
import {Goal,now,uuid} from '@/types';
import {VaultService} from '@/services/VaultService';

/**
 * A goal turns the app from a passive memory into a plan: "talk to 5 investors this quarter".
 * Progress is never entered by hand — it is counted from interactions actually logged inside the
 * window, optionally narrowed to a tag.
 */
export const GoalRepository={
 list:async(includePast=false)=>{
  const d=await getDatabase();
  const gate=VaultService.clause();
  return d.getAllAsync<Goal>(
   `SELECT g.*,t.name tag_name,
     (SELECT COUNT(DISTINCT i.contact_id) FROM interactions i
       JOIN contacts c ON c.id=i.contact_id
       WHERE i.deleted_at IS NULL AND c.deleted_at IS NULL${gate}
         AND i.interaction_at BETWEEN g.starts_at AND g.ends_at
         AND (g.tag_id IS NULL OR EXISTS(SELECT 1 FROM contact_tags ct WHERE ct.contact_id=c.id AND ct.tag_id=g.tag_id AND ct.deleted_at IS NULL))
     ) progress
    FROM goals g LEFT JOIN tags t ON t.id=g.tag_id
    WHERE g.deleted_at IS NULL${includePast?'':' AND g.ends_at>=?'}
    ORDER BY g.ends_at`,...(includePast?[]:[Date.now()]));
 },
 create:async(data:{title:string;target:number;tagId?:string|null;startsAt:number;endsAt:number})=>{
  const d=await getDatabase(),id=uuid(),t=now();
  await d.runAsync('INSERT INTO goals(id,title,target,tag_id,starts_at,ends_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
   id,data.title.trim(),Math.max(1,Math.round(data.target)),data.tagId??null,data.startsAt,data.endsAt,t,t);
  return id;
 },
 remove:async(id:string)=>{const d=await getDatabase(),t=now();await d.runAsync('UPDATE goals SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?',t,t,id)},
 /** People counted toward a goal, so the number can always be opened up. */
 contributors:async(goal:Goal)=>{
  const d=await getDatabase();
  const gate=VaultService.clause();
  return d.getAllAsync<{id:string;name:string;count:number}>(
   `SELECT c.id,coalesce(c.display_name,c.first_name||' '||coalesce(c.last_name,'')) name,COUNT(*) count
    FROM interactions i JOIN contacts c ON c.id=i.contact_id
    WHERE i.deleted_at IS NULL AND c.deleted_at IS NULL${gate}
      AND i.interaction_at BETWEEN ? AND ?
      ${goal.tag_id?'AND EXISTS(SELECT 1 FROM contact_tags ct WHERE ct.contact_id=c.id AND ct.tag_id=? AND ct.deleted_at IS NULL)':''}
    GROUP BY c.id ORDER BY count DESC`,
   ...(goal.tag_id?[goal.starts_at,goal.ends_at,goal.tag_id]:[goal.starts_at,goal.ends_at]));
 },
};
