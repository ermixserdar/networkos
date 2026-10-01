import * as Calendar from 'expo-calendar';
import {Contact,Interaction,Commitment} from '@/types';
import type {Language} from '@/i18n';
import {ContactRepository} from '@/repositories/ContactRepository';
import {CommitmentRepository} from '@/repositories/CommitmentRepository';
import {InteractionRepository} from '@/repositories/InteractionRepository';
import {NotificationService} from '@/services/NotificationService';
import {meetingQuestions} from '@/services/InteractionInsights';

export type MatchedMeeting={id:string;title:string;startsAt:number;location?:string|null;contacts:Contact[]};
export type Briefing={contact:Contact;interactions:Interaction[];commitments:Commitment[];questions:string[]};

const DAY=86400000;
const fold=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const fullName=(c:Contact)=>fold(c.display_name||`${c.first_name} ${c.last_name??''}`);
/** iOS exposes the attendee address as a `mailto:` URL; Android puts it on `email`. */
const emailOf=(attendee:Calendar.Attendee)=>attendee.email??(attendee.url?.startsWith('mailto:')?attendee.url.slice(7):undefined);

export const MeetingBriefService={
 getPermission:async()=>{
  const current=await Calendar.getCalendarPermissionsAsync();
  return current.granted;
 },
 requestPermission:async()=>{
  if(await MeetingBriefService.getPermission())return true;
  const next=await Calendar.requestCalendarPermissionsAsync();
  return next.granted;
 },

 /**
  * Reads the device calendar and keeps only events with someone from the network in the room.
  * Nothing is written back to the calendar and nothing leaves the device.
  */
 upcoming:async(days=7):Promise<MatchedMeeting[]>=>{
  if(!(await MeetingBriefService.getPermission()))return [];
  const calendars=await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const ids=calendars.map(c=>c.id);
  if(!ids.length)return [];
  const start=new Date();
  const events=await Calendar.getEventsAsync(ids,start,new Date(Date.now()+days*DAY));
  const roster=await ContactRepository.list({limit:1500,order:'strength'});
  const byName=new Map(roster.map(c=>[fullName(c),c]));
  const matched:MatchedMeeting[]=[];
  for(const event of events){
   const attendees=await Calendar.getAttendeesForEventAsync(event.id).catch(()=>[] as Calendar.Attendee[]);
   if(!attendees.length)continue;
   const emails=attendees.map(emailOf).filter(Boolean) as string[];
   const found=new Map<string,Contact>();
   for(const c of await ContactRepository.findByEmails(emails))found.set(c.id,c);
   for(const attendee of attendees){
    if(attendee.isCurrentUser)continue;
    const c=byName.get(fold(attendee.name??''));
    if(c)found.set(c.id,c);
   }
   if(!found.size)continue;
   matched.push({id:event.id,title:event.title||'',startsAt:new Date(event.startDate).getTime(),location:event.location,contacts:[...found.values()]});
  }
  return matched.sort((a,b)=>a.startsAt-b.startsAt);
 },

 /** Reschedules from scratch so a moved or cancelled meeting never leaves a stale reminder. */
 refreshBriefs:async()=>{
  await NotificationService.cancelBriefs();
  if(!(await NotificationService.isBriefEnabled()))return 0;
  const meetings=await MeetingBriefService.upcoming();
  let scheduled=0;
  for(const meeting of meetings){
   // A briefing fires from the OS whether the vault is open or not, so private names never go in.
   const visible=meeting.contacts.filter(c=>!c.private);
   if(!visible.length)continue;
   const lead=visible[0];
   const name=lead.display_name||lead.first_name;
   if(await NotificationService.scheduleBrief(meeting.id,visible.length>1?`${name} +${visible.length-1}`:name,meeting.startsAt))scheduled++;
  }
  return scheduled;
 },

 briefing:async(contact:Contact,language:Language='en'):Promise<Briefing>=>{
  const [interactions,commitments]=await Promise.all([
   InteractionRepository.listForContact(contact.id,3),
   CommitmentRepository.list({contactId:contact.id,openOnly:true}),
  ]);
  return {contact,interactions,commitments,questions:meetingQuestions(contact,interactions,language)};
 },
};
