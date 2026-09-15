import {getDatabase} from '@/database/database';
import {Contact} from '@/types';
import {ContactRepository} from '@/repositories/ContactRepository';
import {VaultService} from '@/services/VaultService';
import {NotificationService} from './NotificationService';
import {ReminderPlanner} from './ReminderPlanner';

export type FollowUpBucket='overdue'|'today'|'week'|'later';
const DAY=86400000;

const SELECT=()=>`SELECT c.*,co.name company_name FROM contacts c LEFT JOIN companies co ON co.id=c.company_id WHERE c.deleted_at IS NULL AND c.next_follow_up_at IS NOT NULL${VaultService.clause()}`;

export const FollowUpService={
 list:async(bucket:FollowUpBucket='today')=>{
  const d=await getDatabase(),now=Date.now();
  const endOfToday=new Date();endOfToday.setHours(23,59,59,999);
  const clauses:Record<FollowUpBucket,{sql:string;args:number[]}>={
   overdue:{sql:'AND c.next_follow_up_at < ?',args:[new Date().setHours(0,0,0,0)]},
   today:{sql:'AND c.next_follow_up_at BETWEEN ? AND ?',args:[new Date().setHours(0,0,0,0),endOfToday.getTime()]},
   week:{sql:'AND c.next_follow_up_at > ? AND c.next_follow_up_at <= ?',args:[endOfToday.getTime(),now+7*DAY]},
   later:{sql:'AND c.next_follow_up_at > ?',args:[now+7*DAY]},
  };
  const {sql,args}=clauses[bucket];
  return d.getAllAsync<Contact>(`${SELECT()} ${sql} ORDER BY c.next_follow_up_at`,...args);
 },
 counts:async()=>{
  const d=await getDatabase(),now=Date.now();
  const startOfDay=new Date().setHours(0,0,0,0);
  const endOfToday=new Date().setHours(23,59,59,999);
  const row=await d.getFirstAsync<Record<FollowUpBucket,number>>(
   `SELECT SUM(CASE WHEN next_follow_up_at<? THEN 1 ELSE 0 END) overdue,
           SUM(CASE WHEN next_follow_up_at BETWEEN ? AND ? THEN 1 ELSE 0 END) today,
           SUM(CASE WHEN next_follow_up_at>? AND next_follow_up_at<=? THEN 1 ELSE 0 END) week,
           SUM(CASE WHEN next_follow_up_at>? THEN 1 ELSE 0 END) later
    FROM contacts c WHERE deleted_at IS NULL AND next_follow_up_at IS NOT NULL${VaultService.clause()}`,
   startOfDay,startOfDay,endOfToday,endOfToday,now+7*DAY,now+7*DAY);
  return {overdue:row?.overdue??0,today:row?.today??0,week:row?.week??0,later:row?.later??0};
 },
 /**
  * The single writer for `next_follow_up_at`. Scheduling is delegated to the planner so the app
  * never exceeds the platform's pending-notification budget.
  */
 set:async(contactId:string,timestamp:number|null)=>{
  await ContactRepository.patch(contactId,{next_follow_up_at:timestamp});
  // Ask at the moment the user schedules something, never from a background refresh.
  if(timestamp)await NotificationService.requestPermission();
  await ReminderPlanner.reconcile();
 },
 snooze:async(contact:Contact,days=7)=>{
  const base=Math.max(Date.now(),contact.next_follow_up_at??Date.now());
  await FollowUpService.set(contact.id,base+days*DAY);
 },
 /**
  * Logging contact clears the current follow-up and, when the contact has a cadence, books the
  * next one — this is what turns a rhythm into something the app maintains rather than the user.
  */
 markContacted:async(contact:Contact,at=Date.now())=>{
  const next=contact.cadence_days?at+contact.cadence_days*DAY:null;
  await ContactRepository.patch(contact.id,{last_contact_at:at});
  await FollowUpService.set(contact.id,next);
  return next;
 },
 /** Applied after every logged interaction so cadences stay live without extra taps. */
 applyCadence:async(contactId:string,at=Date.now())=>{
  const contact=await ContactRepository.get(contactId);
  if(!contact?.cadence_days)return null;
  const next=at+contact.cadence_days*DAY;
  await FollowUpService.set(contactId,next);
  return next;
 },
};
