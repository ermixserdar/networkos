jest.mock('expo-crypto',()=>({randomUUID:()=>`gen-${Math.random().toString(36).slice(2)}`}));
jest.mock('../src/database/database',()=>({getDatabase:jest.fn(),SyncState:{get:jest.fn(),set:jest.fn()}}));
jest.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})},Platform:{OS:'ios'}}));
jest.mock('expo-contacts',()=>({
 Fields:new Proxy({},{get:(_target,key)=>String(key)}),
 getContactsAsync:jest.fn(),
 getContactByIdAsync:jest.fn(),
 getPermissionsAsync:jest.fn(),
 requestPermissionsAsync:jest.fn(),
 presentAccessPickerAsync:jest.fn(),
 addContactsChangeListener:jest.fn(),
}));
jest.mock('../src/services/PhotoService',()=>({PhotoService:{thumbnail:jest.fn(async()=>'data:image/jpeg;base64,zz')}}));
jest.mock('../src/services/ReminderPlanner',()=>({ReminderPlanner:{reconcile:jest.fn(async()=>({scheduled:0,cancelled:0}))}}));

const mockStore=new Map<string,string>();
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{
 getItem:jest.fn(async(key:string)=>mockStore.get(key)??null),
 setItem:jest.fn(async(key:string,value:string)=>{mockStore.set(key,value)}),
 removeItem:jest.fn(async(key:string)=>{mockStore.delete(key)}),
}}));

import type {DatabaseSync} from 'node:sqlite';
import * as Contacts from 'expo-contacts';
import {getDatabase} from '../src/database/database';
import {AddressBookSyncService,THROTTLE_MS,fillableFields} from '../src/services/AddressBookSyncService';
import {ContactsImportService} from '../src/services/ContactsImportService';
import {asyncAdapter,insertContact,migratedDatabase} from './helpers/realDatabase';

let db:DatabaseSync;
const row=(id:string)=>db.prepare('SELECT * FROM contacts WHERE id=?').get(id) as Record<string,unknown>;
const device=(over:Record<string,unknown>={})=>({id:'d1',contactType:'person',name:'Ada Lovelace',...over} as never);

const permit=(granted=true)=>(Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({granted,accessPrivileges:granted?'all':'none'});
const phoneBook=(...contacts:unknown[])=>(Contacts.getContactsAsync as jest.Mock).mockResolvedValue({data:contacts});

beforeEach(async()=>{
 jest.clearAllMocks();
 mockStore.clear();
 db=migratedDatabase();
 (getDatabase as jest.Mock).mockResolvedValue(asyncAdapter(db));
 (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(null);
 permit();
 phoneBook();
 await AddressBookSyncService.setEnabled(false);
 mockStore.set('networkos.addressbook.enabled','1');
});

/** The app is the author of its own data; the phone book may only fill in what was left blank. */
describe('fillableFields',()=>{
 test('fills an empty column from the device',()=>{
  const patch=fillableFields({email:null,phone:null,job_title:null,city:null,country:null,linkedin_url:null,website:null,birthday:null,photo:null},
   device({emails:[{email:'ada@example.com'}],jobTitle:'Analyst'}));
  expect(patch.email).toBe('ada@example.com');
  expect(patch.job_title).toBe('Analyst');
 });

 test('never overwrites a column the user filled in', ()=>{
  const patch=fillableFields({email:'mine@example.com',phone:null,job_title:'Founder',city:null,country:null,linkedin_url:null,website:null,birthday:null,photo:null},
   device({emails:[{email:'ada@example.com'}],jobTitle:'Analyst'}));
  expect(patch.email).toBeUndefined();
  expect(patch.job_title).toBeUndefined();
 });

 test('writes phone_norm alongside phone so search and duplicates keep working',()=>{
  const patch=fillableFields({email:null,phone:null,job_title:null,city:null,country:null,linkedin_url:null,website:null,birthday:null,photo:null},
   device({phoneNumbers:[{number:'+90 (532) 111 22 33'}]}));
  expect(patch.phone).toBe('+90 (532) 111 22 33');
  expect(patch.phone_norm).toBe('905321112233');
 });

 test('proposes nothing when the device has nothing to add',()=>{
  expect(fillableFields({email:'a@b.c',phone:null,job_title:null,city:null,country:null,linkedin_url:null,website:null,birthday:null,photo:null},device())).toEqual({});
 });
});

describe('reconcile gates',()=>{
 test('does nothing while the feature is off',async()=>{
  mockStore.set('networkos.addressbook.enabled','0');
  expect(await AddressBookSyncService.reconcile()).toBeNull();
  expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
 });

 test('does nothing inside the throttle window, and runs again when forced',async()=>{
  insertContact(db,'a','Ada',{phone_norm:'5321112233'});
  mockStore.set('networkos.addressbook.lastRunAt',String(Date.now()-THROTTLE_MS/2));
  expect(await AddressBookSyncService.reconcile()).toBeNull();
  expect(await AddressBookSyncService.reconcile({force:true})).not.toBeNull();
 });

 test('never asks for the contacts permission on its own',async()=>{
  permit(false);
  expect(await AddressBookSyncService.reconcile()).toBeNull();
  expect(Contacts.getPermissionsAsync).toHaveBeenCalled();
  expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
 });

 test('reads the phone book once per run, however many contacts are linked',async()=>{
  insertContact(db,'a','Ada',{phone_norm:'5321112233',photo:'data:x'});
  insertContact(db,'b','Grace',{phone_norm:'5559998877',photo:'data:x'});
  phoneBook(device({id:'d1',phoneNumbers:[{number:'0532 111 22 33'}]}),device({id:'d2',phoneNumbers:[{number:'0555 999 88 77'}]}));
  await AddressBookSyncService.reconcile();
  expect(Contacts.getContactsAsync).toHaveBeenCalledTimes(1);
 });
});

describe('linking', ()=>{
 test('claims the matching phone-book entry for an already imported contact',async()=>{
  insertContact(db,'a','Ada',{phone:'0532 111 22 33',phone_norm:'5321112233',photo:'data:x'});
  phoneBook(device({id:'d1',phoneNumbers:[{number:'0532 111 22 33'}]}));
  const outcome=await AddressBookSyncService.reconcile();
  expect(outcome).toEqual({linked:1,updated:0});
  expect(row('a').device_contact_id).toBe('d1');
 });

 test('matches on email when the phone does not match',async()=>{
  insertContact(db,'a','Ada',{email:'Ada@Example.com',photo:'data:x'});
  phoneBook(device({id:'d1',emails:[{email:'ada@example.com'}]}));
  await AddressBookSyncService.reconcile();
  expect(row('a').device_contact_id).toBe('d1');
 });

 test('gives one phone-book entry to one contact only',async()=>{
  insertContact(db,'a','Ada',{phone_norm:'5321112233',photo:'data:x'});
  insertContact(db,'b','Ada again',{phone_norm:'5321112233',photo:'data:x'});
  phoneBook(device({id:'d1',phoneNumbers:[{number:'0532 111 22 33'}]}));
  const outcome=await AddressBookSyncService.reconcile();
  expect(outcome?.linked).toBe(1);
  expect([row('a').device_contact_id,row('b').device_contact_id].filter(Boolean)).toHaveLength(1);
 });

 test('keeps going when a vault contact already holds the matching phone-book entry',async()=>{
  insertContact(db,'secret','Ada',{phone:'0532 111 22 33',phone_norm:'5321112233',private:1,device_contact_id:'d1'});
  insertContact(db,'a','Ada again',{phone:'0532 111 22 33',phone_norm:'5321112233',photo:'data:x'});
  insertContact(db,'b','Grace',{device_contact_id:'d2',photo:'data:x'});
  phoneBook(device({id:'d1',phoneNumbers:[{number:'0532 111 22 33'}]}),device({id:'d2',jobTitle:'Admiral'}));
  const outcome=await AddressBookSyncService.reconcile();
  // The duplicate cannot take a claimed entry, but the contacts after it still get their turn.
  expect(row('a').device_contact_id).toBeNull();
  expect(row('b').job_title).toBe('Admiral');
  expect(outcome).toEqual({linked:0,updated:1});
 });

 test('leaves private contacts out of the run entirely',async()=>{
  insertContact(db,'a','Ada',{phone_norm:'5321112233',private:1});
  phoneBook(device({id:'d1',phoneNumbers:[{number:'0532 111 22 33'}],jobTitle:'Analyst'}));
  await AddressBookSyncService.reconcile();
  expect(row('a').device_contact_id).toBeNull();
  expect(row('a').job_title).toBeNull();
 });

 test('linking alone does not mark the row as newer for device-to-device sync',async()=>{
  insertContact(db,'a','Ada',{phone:'0532 111 22 33',phone_norm:'5321112233',photo:'data:x'});
  const before=row('a');
  phoneBook(device({id:'d1',phoneNumbers:[{number:'0532 111 22 33'}]}));
  await AddressBookSyncService.reconcile();
  expect(row('a').updated_at).toBe(before.updated_at);
  expect(row('a').version).toBe(before.version);
 });
});

describe('refreshing linked contacts',()=>{
 test('fills the blanks and leaves everything else alone',async()=>{
  insertContact(db,'a','Ada',{device_contact_id:'d1',job_title:'Founder',photo:'data:x'});
  phoneBook(device({id:'d1',jobTitle:'Analyst',emails:[{email:'ada@example.com'}],addresses:[{city:'İstanbul'}]}));
  const outcome=await AddressBookSyncService.reconcile();
  expect(outcome).toEqual({linked:0,updated:1});
  expect(row('a').job_title).toBe('Founder');
  expect(row('a').email).toBe('ada@example.com');
  expect(row('a').city).toBe('İstanbul');
 });

 test('fetches a photo only for a contact that has none',async()=>{
  insertContact(db,'a','Ada',{device_contact_id:'d1',photo:'data:x'});
  insertContact(db,'b','Grace',{device_contact_id:'d2'});
  (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue({id:'d2',image:{uri:'file://face.jpg'}});
  phoneBook(device({id:'d1'}),device({id:'d2'}));
  await AddressBookSyncService.reconcile();
  expect(Contacts.getContactByIdAsync).toHaveBeenCalledTimes(1);
  expect(row('b').photo).toBe('data:image/jpeg;base64,zz');
 });

 test('a contact deleted from the phone book is left untouched',async()=>{
  insertContact(db,'a','Ada',{device_contact_id:'gone',job_title:'Founder',photo:'data:x'});
  phoneBook(device({id:'d1'}));
  const outcome=await AddressBookSyncService.reconcile();
  expect(outcome).toEqual({linked:0,updated:0});
  expect(row('a').deleted_at).toBeNull();
  expect(row('a').job_title).toBe('Founder');
 });

 test('records what the last run did',async()=>{
  insertContact(db,'a','Ada',{device_contact_id:'d1',photo:'data:x'});
  phoneBook(device({id:'d1',jobTitle:'Analyst'}));
  await AddressBookSyncService.reconcile();
  const last=await AddressBookSyncService.lastRun();
  expect(last.updated).toBe(1);
  expect(last.at).toBeGreaterThan(0);
 });
});

describe('import screen support',()=>{
 test('reports which phone-book entries are already represented',async()=>{
  insertContact(db,'a','Ada',{device_contact_id:'d1'});
  insertContact(db,'b','Grace',{device_contact_id:'d2',deleted_at:1});
  expect(await ContactsImportService.linkedDeviceIds()).toEqual(new Set(['d1']));
 });
});
