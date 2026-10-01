import {getDatabase} from '@/database/database';
import {translate} from '@/i18n';
import {useAppStore} from '@/stores/useAppStore';
import {nextAnniversary} from '@/utils/format';
import {NotificationService} from './NotificationService';

/**
 * iOS keeps at most 64 pending local notifications per app and silently discards the rest — so
 * scheduling one per contact does not fail loudly, it just stops delivering once the list is long
 * enough. Everything date-based therefore goes through one planner that keeps only the nearest
 * reminders scheduled and re-plans as they fire.
 *
 * The remaining headroom is left for the weekly digest and the calendar briefings.
 */
export const REMINDER_BUDGET=48;
const YEAR=365*86400000;

export type ReminderKind='follow-up'|'birthday';
export type Reminder={key:string;kind:ReminderKind;contactId:string;name:string;at:number};
export type ReminderSource={contactId:string;name:string;followUpAt?:number|null;birthday?:number|null};

/** Pure and total: given everyone who wants a reminder, decide which ones actually get scheduled. */
export function selectReminders(sources:ReminderSource[],now:number,budget=REMINDER_BUDGET):Reminder[]{
 const candidates:Reminder[]=[];
 for(const source of sources){
  if(source.followUpAt&&source.followUpAt>now)
   candidates.push({key:`follow-up:${source.contactId}`,kind:'follow-up',contactId:source.contactId,name:source.name,at:source.followUpAt});
  if(source.birthday){
   const at=nextAnniversary(source.birthday,now);
   // A birthday nine months out would otherwise crowd out a follow-up next week.
   if(at>now&&at-now<=YEAR)candidates.push({key:`birthday:${source.contactId}`,kind:'birthday',contactId:source.contactId,name:source.name,at});
  }
 }
 return candidates.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key)).slice(0,budget);
}

async function sources():Promise<ReminderSource[]>{
 const d=await getDatabase();
 // Private contacts are never scheduled, locked or not: a notification outlives the session and
 // would carry the name onto the lock screen after the vault re-locks on background.
 const rows=await d.getAllAsync<{id:string;display_name:string|null;first_name:string;last_name:string|null;next_follow_up_at:number|null;birthday:number|null}>(
  `SELECT id,display_name,first_name,last_name,next_follow_up_at,birthday FROM contacts
   WHERE deleted_at IS NULL AND private=0 AND (next_follow_up_at IS NOT NULL OR birthday IS NOT NULL)`);
 return rows.map(row=>({
  contactId:row.id,
  name:row.display_name||`${row.first_name} ${row.last_name??''}`.trim(),
  followUpAt:row.next_follow_up_at,
  birthday:row.birthday,
 }));
}

export const ReminderPlanner={
 selectReminders,
 /**
  * Brings the scheduled set in line with what the database says, scheduling and cancelling only
  * the difference. Safe to call after any mutation and on every foreground.
  */
 reconcile:async(now=Date.now())=>{
  const stored=await NotificationService.readReminderState();
  if(!(await NotificationService.getPermission())){
   // Nothing can be delivered, so leave no stale schedules behind either.
   await NotificationService.clearReminders(Object.values(stored).map(x=>x.id));
   return {scheduled:0,cancelled:Object.keys(stored).length};
  }
  const desired=new Map(selectReminders(await sources(),now).map(reminder=>[reminder.key,reminder]));
  const label=translate(useAppStore.getState().language);
  const next:Record<string,{id:string;at:number}>={};
  let scheduled=0,cancelled=0;

  for(const [key,entry] of Object.entries(stored)){
   const wanted=desired.get(key);
   if(wanted&&wanted.at===entry.at){next[key]=entry;continue}
   await NotificationService.cancelById(entry.id);
   cancelled++;
  }
  for(const reminder of desired.values()){
   if(next[reminder.key])continue;
   const id=await NotificationService.scheduleDate({
    title:label(reminder.kind==='birthday'?'notifBirthdayTitle':'notifFollowUpTitle'),
    body:label(reminder.kind==='birthday'?'notifBirthdayBody':'notifFollowUpBody',reminder.name),
    data:{contactId:reminder.contactId,kind:reminder.kind},
   },reminder.kind==='birthday'?atNineAm(reminder.at):reminder.at);
   if(!id)continue;
   next[reminder.key]={id,at:reminder.at};
   scheduled++;
  }
  await NotificationService.writeReminderState(next);
  return {scheduled,cancelled};
 },
};

/** Birthdays fire in the morning; follow-ups fire at whatever time the user picked. */
function atNineAm(at:number){const date=new Date(at);date.setHours(9,0,0,0);return date.getTime()>Date.now()?date.getTime():at}
