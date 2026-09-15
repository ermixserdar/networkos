import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {translate} from '@/i18n';
import {useAppStore} from '@/stores/useAppStore';

const REMINDER_STATE='networkos.reminders';
const DIGEST_KEY='networkos.digest.id';
const DIGEST_ENABLED='networkos.digest.enabled';
const BRIEF_ENABLED='networkos.brief.enabled';
const briefKey=(eventId:string)=>`networkos.brief.${eventId}`;
/** Per-contact keys written by the pre-budget scheduler; drained once so nothing is orphaned. */
const LEGACY_PREFIXES=['networkos.followup.','networkos.birthday.'];

const t=()=>translate(useAppStore.getState().language);

async function readId(key:string){
 const value=await AsyncStorage.getItem(key);
 if(value)return value;
 const legacy=await SecureStore.getItemAsync(key).catch(()=>null);
 if(legacy){await AsyncStorage.setItem(key,legacy);await SecureStore.deleteItemAsync(key).catch(()=>{});}
 return legacy;
}
async function cancelKey(key:string){
 const id=await readId(key);
 if(!id)return;
 await Notifications.cancelScheduledNotificationAsync(id).catch(()=>{});
 await AsyncStorage.removeItem(key);
}

export type ReminderState=Record<string,{id:string;at:number}>;

export const NotificationService={
 configure(){
  Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false} as any)});
 },
 getPermission:async()=>{
  const current=await Notifications.getPermissionsAsync() as any;
  return Boolean(current.granted||current.status===Notifications.PermissionStatus.GRANTED);
 },
 requestPermission:async()=>{
  if(await NotificationService.getPermission())return true;
  const next=await Notifications.requestPermissionsAsync() as any;
  return Boolean(next.granted||next.status===Notifications.PermissionStatus.GRANTED);
 },

 // --- primitives the planner builds on -------------------------------------------------------
 scheduleDate:async(content:{title:string;body:string;data?:Record<string,unknown>},at:number)=>{
  if(at<=Date.now())return null;
  return Notifications.scheduleNotificationAsync({
   content,
   trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at)},
  }).catch(()=>null);
 },
 cancelById:async(id:string)=>{await Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})},

 readReminderState:async():Promise<ReminderState>=>{
  try{
   const raw=await AsyncStorage.getItem(REMINDER_STATE);
   const state=raw?JSON.parse(raw) as ReminderState:{};
   await drainLegacyKeys();
   return state;
  }catch{return {}}
 },
 writeReminderState:async(state:ReminderState)=>{await AsyncStorage.setItem(REMINDER_STATE,JSON.stringify(state))},
 clearReminders:async(ids:string[])=>{
  for(const id of ids)await NotificationService.cancelById(id);
  await AsyncStorage.removeItem(REMINDER_STATE);
 },

 // --- weekly digest ---------------------------------------------------------------------------
 isDigestEnabled:async()=>(await AsyncStorage.getItem(DIGEST_ENABLED))==='1',
 setDigestEnabled:async(enabled:boolean,counts?:{cooling:number;due:number})=>{
  await AsyncStorage.setItem(DIGEST_ENABLED,enabled?'1':'0');
  await cancelKey(DIGEST_KEY);
  if(!enabled)return false;
  if(!(await NotificationService.requestPermission()))return false;
  const label=t();
  const id=await Notifications.scheduleNotificationAsync({
   content:{title:label('notifDigestTitle'),body:label('notifDigestBody',counts?.cooling??0,counts?.due??0),data:{kind:'digest'}},
   trigger:{type:Notifications.SchedulableTriggerInputTypes.WEEKLY,weekday:1,hour:19,minute:0},
  });
  await AsyncStorage.setItem(DIGEST_KEY,id);
  return true;
 },
 /**
  * Called on foreground so the body reflects the current week, not the week it was enabled.
  * Checks permission rather than requesting it — a refresh must never raise a system prompt.
  */
 refreshDigest:async(counts:{cooling:number;due:number})=>{
  if(!(await NotificationService.isDigestEnabled()))return;
  if(!(await NotificationService.getPermission()))return;
  await NotificationService.setDigestEnabled(true,counts);
 },

 // --- calendar briefings ----------------------------------------------------------------------
 /** Capped well below the platform limit so briefings can never starve the reminder budget. */
 BRIEF_LIMIT:10,
 isBriefEnabled:async()=>(await AsyncStorage.getItem(BRIEF_ENABLED))==='1',
 setBriefEnabled:async(enabled:boolean)=>{await AsyncStorage.setItem(BRIEF_ENABLED,enabled?'1':'0');if(!enabled)return false;return NotificationService.requestPermission()},
 scheduleBrief:async(eventId:string,contactName:string,startsAt:number)=>{
  await cancelKey(briefKey(eventId));
  const at=startsAt-30*60000;
  if(at<=Date.now())return null;
  if(!(await NotificationService.getPermission()))return null;
  const label=t();
  const id=await NotificationService.scheduleDate({title:label('notifBriefTitle'),body:label('notifBriefBody',contactName),data:{eventId,kind:'brief'}},at);
  if(id)await AsyncStorage.setItem(briefKey(eventId),id);
  return id;
 },
 cancelBriefs:async()=>{
  const keys=(await AsyncStorage.getAllKeys()).filter(k=>k.startsWith('networkos.brief.'));
  for(const key of keys)await cancelKey(key);
 },
};

async function drainLegacyKeys(){
 const keys=(await AsyncStorage.getAllKeys()).filter(k=>LEGACY_PREFIXES.some(prefix=>k.startsWith(prefix)));
 for(const key of keys)await cancelKey(key);
}
