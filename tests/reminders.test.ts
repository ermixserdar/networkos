jest.mock('expo-crypto',()=>({randomUUID:()=>'test'}));
jest.mock('../src/database/database',()=>({getDatabase:jest.fn()}));
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{getItem:jest.fn(),setItem:jest.fn(),removeItem:jest.fn(),getAllKeys:jest.fn(async()=>[])}}));

import {REMINDER_BUDGET,ReminderSource,selectReminders} from '../src/services/ReminderPlanner';

const DAY=86400000;
const NOW=1_700_000_000_000;
const at=(days:number)=>NOW+days*DAY;
const person=(id:string,over:Partial<ReminderSource>={}):ReminderSource=>({contactId:id,name:id,...over});

/**
 * iOS keeps only 64 pending notifications and discards the rest without an error, so the planner
 * has to choose. These cover what it must choose.
 */
describe('reminder budget',()=>{
 test('schedules a follow-up and a birthday for the same person independently',()=>{
  const picked=selectReminders([person('a',{followUpAt:at(2),birthday:at(-3000)})],NOW);
  expect(picked.map(x=>x.kind).sort()).toEqual(['birthday','follow-up']);
 });

 test('never exceeds the budget, however many contacts want a reminder',()=>{
  const many=Array.from({length:400},(_,i)=>person(`c${i}`,{followUpAt:at(i+1)}));
  expect(selectReminders(many,NOW)).toHaveLength(REMINDER_BUDGET);
 });

 test('keeps the nearest reminders and drops the far ones',()=>{
  const many=Array.from({length:200},(_,i)=>person(`c${i}`,{followUpAt:at(200-i)}));
  const picked=selectReminders(many,NOW);
  expect(picked[0].at).toBe(at(1));
  expect(Math.max(...picked.map(x=>x.at))).toBe(at(REMINDER_BUDGET));
 });

 test('a follow-up next week outranks a birthday nine months out',()=>{
  const sources=[person('soon',{followUpAt:at(7)}),person('far',{birthday:new Date(NOW+270*DAY).setFullYear(1990)})];
  const picked=selectReminders(sources,NOW,1);
  expect(picked[0].contactId).toBe('soon');
 });

 test('ignores follow-ups already in the past',()=>{
  expect(selectReminders([person('a',{followUpAt:at(-1)})],NOW)).toEqual([]);
 });

 test('ignores contacts with nothing to remind about',()=>{
  expect(selectReminders([person('a'),person('b',{followUpAt:null,birthday:null})],NOW)).toEqual([]);
 });

 test('rolls a birthday that has passed to next year and keeps it inside a year',()=>{
  const lastMonth=new Date(NOW-30*DAY);
  const birthday=new Date(1990,lastMonth.getMonth(),lastMonth.getDate(),12).getTime();
  const [picked]=selectReminders([person('a',{birthday})],NOW);
  expect(picked.at).toBeGreaterThan(NOW);
  expect(picked.at-NOW).toBeLessThanOrEqual(365*DAY);
 });

 test('is deterministic when two reminders land at the same instant',()=>{
  const sources=[person('b',{followUpAt:at(1)}),person('a',{followUpAt:at(1)})];
  expect(selectReminders(sources,NOW).map(x=>x.contactId)).toEqual(['a','b']);
 });

 test('gives each reminder a stable key so re-planning is a no-op',()=>{
  const sources=[person('a',{followUpAt:at(1),birthday:at(-3000)})];
  expect(selectReminders(sources,NOW).map(x=>x.key).sort()).toEqual(['birthday:a','follow-up:a']);
  expect(selectReminders(sources,NOW)).toEqual(selectReminders(sources,NOW));
 });
});
