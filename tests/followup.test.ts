jest.mock('expo-crypto',()=>({randomUUID:()=>'test'}));
jest.mock('../src/database/database',()=>({getDatabase:jest.fn()}));
jest.mock('../src/repositories/ContactRepository',()=>({ContactRepository:{patch:jest.fn(),get:jest.fn()}}));
jest.mock('../src/services/NotificationService',()=>({NotificationService:{requestPermission:jest.fn(async()=>true)}}));
jest.mock('../src/services/ReminderPlanner',()=>({ReminderPlanner:{reconcile:jest.fn(async()=>({scheduled:0,cancelled:0}))}}));

import {ContactRepository} from '../src/repositories/ContactRepository';
import {NotificationService} from '../src/services/NotificationService';
import {ReminderPlanner} from '../src/services/ReminderPlanner';
import {FollowUpService} from '../src/services/FollowUpService';
import {Contact} from '../src/types';

const DAY=86400000;
const contact=(over:Partial<Contact>={}):Contact=>({
 id:'c1',first_name:'Ada',last_name:'Lovelace',relationship_strength:4,importance:4,favorite:0,
 created_at:0,updated_at:0,sync_status:'local',version:1,...over,
} as Contact);

describe('follow-up scheduling',()=>{
 beforeEach(()=>jest.clearAllMocks());

 test('writing a date stores it and re-plans the schedule',async()=>{
  const when=Date.now()+DAY;
  await FollowUpService.set('c1',when);
  expect(ContactRepository.patch).toHaveBeenCalledWith('c1',{next_follow_up_at:when});
  expect(ReminderPlanner.reconcile).toHaveBeenCalled();
 });

 test('asks for notification permission only when a date is actually set',async()=>{
  await FollowUpService.set('c1',Date.now()+DAY);
  expect(NotificationService.requestPermission).toHaveBeenCalled();
  jest.clearAllMocks();
  await FollowUpService.set('c1',null);
  expect(NotificationService.requestPermission).not.toHaveBeenCalled();
  expect(ReminderPlanner.reconcile).toHaveBeenCalled();
 });

 test('marking contacted books the next touch when a cadence is set',async()=>{
  const at=Date.now();
  const next=await FollowUpService.markContacted(contact({cadence_days:30}),at);
  expect(next).toBe(at+30*DAY);
  expect(ContactRepository.patch).toHaveBeenCalledWith('c1',{last_contact_at:at});
  expect(ContactRepository.patch).toHaveBeenCalledWith('c1',{next_follow_up_at:at+30*DAY});
 });

 test('marking contacted without a cadence simply clears the follow-up',async()=>{
  const next=await FollowUpService.markContacted(contact(),Date.now());
  expect(next).toBeNull();
  expect(ContactRepository.patch).toHaveBeenCalledWith('c1',{next_follow_up_at:null});
 });

 test('snoozing pushes from the existing date, not from today',async()=>{
  const future=Date.now()+10*DAY;
  await FollowUpService.snooze(contact({next_follow_up_at:future}),7);
  expect(ContactRepository.patch).toHaveBeenCalledWith('c1',{next_follow_up_at:future+7*DAY});
 });

 test('snoozing an overdue follow-up starts from now',async()=>{
  await FollowUpService.snooze(contact({next_follow_up_at:Date.now()-10*DAY}),7);
  const scheduled=(ContactRepository.patch as jest.Mock).mock.calls[0][1].next_follow_up_at;
  expect(scheduled).toBeGreaterThan(Date.now());
 });

 test('logging an interaction advances a cadence',async()=>{
  (ContactRepository.get as jest.Mock).mockResolvedValue(contact({cadence_days:90}));
  const at=Date.now();
  await expect(FollowUpService.applyCadence('c1',at)).resolves.toBe(at+90*DAY);
 });

 test('logging an interaction leaves a contact without a cadence alone',async()=>{
  (ContactRepository.get as jest.Mock).mockResolvedValue(contact());
  await expect(FollowUpService.applyCadence('c1')).resolves.toBeNull();
  expect(ContactRepository.patch).not.toHaveBeenCalled();
 });
});
