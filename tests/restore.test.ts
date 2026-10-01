jest.mock('expo-crypto',()=>({randomUUID:()=>'test-id'}));
jest.mock('../src/database/database',()=>({getDatabase:jest.fn(),SyncState:{get:jest.fn(async()=>null),set:jest.fn(async()=>{})}}));
jest.mock('react-native',()=>({AppState:{addEventListener:()=>({remove(){}})}}));

import type {DatabaseSync} from 'node:sqlite';
import {getDatabase} from '../src/database/database';
import {ContactRepository} from '../src/repositories/ContactRepository';
import {asyncAdapter,insertContact,migratedDatabase,TEST_NOW} from './helpers/realDatabase';

/**
 * `remove` buries the graph and event links alongside the contact; `restore` used to leave them
 * buried, so a trip through the trash silently amputated the network. These pin the symmetry.
 */
let db:DatabaseSync;
const alive=(table:string,where:string)=>((db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE deleted_at IS NULL AND ${where}`).get() as {n:number}).n);

beforeEach(()=>{
 db=migratedDatabase();
 (getDatabase as jest.Mock).mockResolvedValue(asyncAdapter(db));
 insertContact(db,'a','Ada');
 insertContact(db,'b','Grace');
 db.exec(`INSERT INTO relationships(id,contact_a_id,contact_b_id,strength,created_at,updated_at) VALUES('r1','a','b',5,${TEST_NOW},${TEST_NOW})`);
 db.exec(`INSERT INTO events(id,name,event_at,created_at,updated_at) VALUES('e1','Dinner',${TEST_NOW},${TEST_NOW},${TEST_NOW})`);
 db.exec(`INSERT INTO event_contacts(event_id,contact_id,created_at,updated_at) VALUES('e1','a',${TEST_NOW},${TEST_NOW})`);
});

test('restore brings back the relationships and event links remove took',async()=>{
 await ContactRepository.remove('a');
 expect(alive('relationships',`id='r1'`)).toBe(0);
 expect(alive('event_contacts',`contact_id='a'`)).toBe(0);

 await ContactRepository.restore('a');
 expect(alive('relationships',`id='r1'`)).toBe(1);
 expect(alive('event_contacts',`contact_id='a'`)).toBe(1);
 expect(alive('contacts',`id='a'`)).toBe(1);
});

test('restoring one person does not resurrect edges to someone still in the trash',async()=>{
 await ContactRepository.remove('a');
 await ContactRepository.remove('b');
 await ContactRepository.restore('a');
 expect(alive('relationships',`id='r1'`)).toBe(0);
 await ContactRepository.restore('b');
 expect(alive('relationships',`id='r1'`)).toBe(1);
});

test('met-date anniversaries only consider the past',async()=>{
 insertContact(db,'c','Past',{met_date:TEST_NOW-400*86400000});
 insertContact(db,'d','Future',{met_date:Date.now()+10*86400000});
 const rows=await ContactRepository.withMetDate();
 expect(rows.map(r=>r.id).sort()).toEqual(['c']);
});
