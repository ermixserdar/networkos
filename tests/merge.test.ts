jest.mock('expo-crypto',()=>({randomUUID:()=>`gen-${Math.random().toString(36).slice(2)}`}));
jest.mock('../src/database/database',()=>({getDatabase:jest.fn(),SyncState:{get:jest.fn(),set:jest.fn()}}));
jest.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})}}));

import type {DatabaseSync} from 'node:sqlite';
import {getDatabase} from '../src/database/database';
import {MergeService} from '../src/services/MergeService';
import {VaultService} from '../src/services/VaultService';
import {TEST_NOW,asyncAdapter,insertContact,migratedDatabase} from './helpers/realDatabase';

let db:DatabaseSync;
const count=(sql:string)=>(db.prepare(sql).get() as {n:number}).n;

beforeEach(()=>{
 db=migratedDatabase();
 (getDatabase as jest.Mock).mockResolvedValue(asyncAdapter(db));
 VaultService.lock();
});

describe('duplicate detection',()=>{
 test('groups contacts that share a normalised phone number',async()=>{
  insertContact(db,'a','Ada',{phone_norm:'5321112233'});
  insertContact(db,'b','Ada L.',{phone_norm:'5321112233'});
  insertContact(db,'c','Grace',{phone_norm:'5559998877'});
  const groups=await MergeService.duplicates();
  expect(groups).toHaveLength(1);
  expect(groups[0].reason).toBe('phone');
  expect(groups[0].contacts.map(x=>x.id).sort()).toEqual(['a','b']);
 });

 test('groups on email and on an identical full name',async()=>{
  insertContact(db,'a','Ada',{email:'ada@example.com'});
  insertContact(db,'b','Different',{email:'ADA@example.com'});
  insertContact(db,'c','Grace',{last_name:'Hopper',display_name:'Grace Hopper'});
  insertContact(db,'d','Grace',{last_name:'Hopper',display_name:'grace hopper'});
  const reasons=(await MergeService.duplicates()).map(x=>x.reason);
  expect(reasons).toContain('email');
  expect(reasons).toContain('name');
 });

 test('says nothing when everyone is distinct',async()=>{
  insertContact(db,'a','Ada',{phone_norm:'1'});
  insertContact(db,'b','Grace',{phone_norm:'2'});
  await expect(MergeService.duplicates()).resolves.toEqual([]);
 });

 test('leaves private contacts out while the vault is locked',async()=>{
  insertContact(db,'a','Ada',{phone_norm:'5321112233',private:1});
  insertContact(db,'b','Ada L.',{phone_norm:'5321112233',private:1});
  await expect(MergeService.duplicates()).resolves.toEqual([]);
  VaultService.unlock();
  expect((await MergeService.duplicates())).toHaveLength(1);
 });
});

describe('merging two contacts',()=>{
 beforeEach(()=>{
  insertContact(db,'winner','Ada',{email:null,notes:'Met at a talk'});
  insertContact(db,'loser','Ada',{email:'ada@example.com',job_title:'Engineer',notes:'Likes long walks'});
 });

 test('fills the gaps in the surviving record',async()=>{
  await MergeService.merge('winner','loser');
  const row=db.prepare("SELECT email,job_title,notes FROM contacts WHERE id='winner'").get() as Record<string,string>;
  expect(row.email).toBe('ada@example.com');
  expect(row.job_title).toBe('Engineer');
  expect(row.notes).toBe('Met at a talk\n\nLikes long walks');
 });

 test('never overwrites a value the survivor already had',async()=>{
  db.exec("UPDATE contacts SET job_title='Founder' WHERE id='winner'");
  await MergeService.merge('winner','loser');
  expect((db.prepare("SELECT job_title FROM contacts WHERE id='winner'").get() as {job_title:string}).job_title).toBe('Founder');
 });

 test('moves interactions and promises across',async()=>{
  db.exec(`INSERT INTO interactions(id,contact_id,type,interaction_at,created_at,updated_at) VALUES('i1','loser','meeting',${TEST_NOW},${TEST_NOW},${TEST_NOW})`);
  db.exec(`INSERT INTO commitments(id,contact_id,text,created_at,updated_at) VALUES('p1','loser','Send deck',${TEST_NOW},${TEST_NOW})`);
  await MergeService.merge('winner','loser');
  expect(count("SELECT COUNT(*) n FROM interactions WHERE contact_id='winner'")).toBe(1);
  expect(count("SELECT COUNT(*) n FROM commitments WHERE contact_id='winner'")).toBe(1);
 });

 test('keeps the strongest rating and the most recent contact date',async()=>{
  db.exec(`UPDATE contacts SET relationship_strength=2,importance=5,last_contact_at=${TEST_NOW} WHERE id='winner'`);
  db.exec(`UPDATE contacts SET relationship_strength=5,importance=1,last_contact_at=${TEST_NOW+5000},favorite=1 WHERE id='loser'`);
  await MergeService.merge('winner','loser');
  const row=db.prepare("SELECT relationship_strength,importance,last_contact_at,favorite FROM contacts WHERE id='winner'").get() as Record<string,number>;
  expect(row.relationship_strength).toBe(5);
  expect(row.importance).toBe(5);
  expect(row.last_contact_at).toBe(TEST_NOW+5000);
  expect(row.favorite).toBe(1);
 });

 test('repoints an edge and drops the one that would become a self-link',async()=>{
  insertContact(db,'other','Grace');
  db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r1','loser','other',3,${TEST_NOW},${TEST_NOW})`);
  db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r2','loser','winner',3,${TEST_NOW},${TEST_NOW})`);
  await MergeService.merge('winner','loser');
  expect(count("SELECT COUNT(*) n FROM relationships WHERE deleted_at IS NULL AND (contact_a_id='winner' OR contact_b_id='winner')")).toBe(1);
  expect(count("SELECT COUNT(*) n FROM relationships WHERE id='r2' AND deleted_at IS NOT NULL")).toBe(1);
 });

 test('does not create a duplicate edge the survivor already had',async()=>{
  insertContact(db,'other','Grace');
  db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r1','loser','other',3,${TEST_NOW},${TEST_NOW})`);
  db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r2','other','winner',4,${TEST_NOW},${TEST_NOW})`);
  await MergeService.merge('winner','loser');
  expect(count("SELECT COUNT(*) n FROM relationships WHERE deleted_at IS NULL")).toBe(1);
 });

 test('moves only the tags the survivor was missing',async()=>{
  db.exec(`INSERT INTO tags(id,name,created_at,updated_at) VALUES('t1','Investors',${TEST_NOW},${TEST_NOW}),('t2','Design',${TEST_NOW},${TEST_NOW})`);
  db.exec(`INSERT INTO contact_tags(contact_id,tag_id,created_at,updated_at) VALUES('winner','t1',${TEST_NOW},${TEST_NOW})`);
  db.exec(`INSERT INTO contact_tags(contact_id,tag_id,created_at,updated_at) VALUES('loser','t1',${TEST_NOW},${TEST_NOW}),('loser','t2',${TEST_NOW},${TEST_NOW})`);
  await MergeService.merge('winner','loser');
  expect(count("SELECT COUNT(*) n FROM contact_tags WHERE contact_id='winner'")).toBe(2);
  expect(count("SELECT COUNT(*) n FROM contact_tags WHERE contact_id='loser'")).toBe(0);
 });

 test('sends the loser to the trash rather than deleting it',async()=>{
  await MergeService.merge('winner','loser');
  expect(count("SELECT COUNT(*) n FROM contacts WHERE id='loser' AND deleted_at IS NOT NULL")).toBe(1);
 });

 test('refuses to merge a contact into itself',async()=>{
  await expect(MergeService.merge('winner','winner')).rejects.toThrow(/itself/);
 });
});
