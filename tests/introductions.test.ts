jest.mock('expo-crypto',()=>({randomUUID:()=>'test'}));
jest.mock('../src/database/database',()=>({getDatabase:jest.fn()}));
jest.mock('@react-native-async-storage/async-storage',()=>{
 const store=new Map<string,string>();
 return {__esModule:true,default:{
  getItem:jest.fn(async(k:string)=>store.get(k)??null),
  setItem:jest.fn(async(k:string,v:string)=>{store.set(k,v)}),
  removeItem:jest.fn(async(k:string)=>{store.delete(k)}),
 }};
});

import {getDatabase} from '../src/database/database';
import {IntroductionService} from '../src/services/IntroductionService';

type Row=Record<string,unknown>;
const person=(id:string,over:Row={}):Row=>({id,first_name:id,last_name:null,display_name:id,importance:3,relationship_strength:3,city:null,company_id:null,company_name:null,...over});

function mockDatabase({contacts=[] as Row[],edges=[] as Row[],tags=[] as Row[]}){
 (getDatabase as jest.Mock).mockResolvedValue({
  getAllAsync:jest.fn(async(sql:string)=>{
   if(/FROM contacts/.test(sql))return contacts;
   if(/FROM relationships/.test(sql))return edges;
   return tags;
  }),
 });
}

describe('introduction suggestions',()=>{
 beforeEach(async()=>{jest.clearAllMocks();await IntroductionService.clearDismissed()});

 test('suggests two people who share a mutual connection',async()=>{
  mockDatabase({contacts:[person('a'),person('b'),person('hub')],edges:[{contact_a_id:'hub',contact_b_id:'a'},{contact_a_id:'hub',contact_b_id:'b'}]});
  const [suggestion]=await IntroductionService.suggestions();
  expect([suggestion.a.id,suggestion.b.id].sort()).toEqual(['a','b']);
  expect(suggestion.reason.key).toBe('introReasonMutual');
  expect(suggestion.reason.value).toBe('hub');
 });

 test('never suggests a pair that is already connected',async()=>{
  mockDatabase({
   contacts:[person('a'),person('b'),person('hub')],
   edges:[{contact_a_id:'hub',contact_b_id:'a'},{contact_a_id:'hub',contact_b_id:'b'},{contact_a_id:'a',contact_b_id:'b'}],
  });
  await expect(IntroductionService.suggestions()).resolves.toEqual([]);
 });

 test('prefers a mutual connection over a shared employer',async()=>{
  mockDatabase({
   contacts:[person('a',{company_id:'co',company_name:'Acme'}),person('b',{company_id:'co',company_name:'Acme'}),person('hub')],
   edges:[{contact_a_id:'hub',contact_b_id:'a'},{contact_a_id:'hub',contact_b_id:'b'}],
  });
  const [suggestion]=await IntroductionService.suggestions();
  expect(suggestion.reason.key).toBe('introReasonMutual');
 });

 test('falls back to a shared tag',async()=>{
  mockDatabase({
   contacts:[person('a'),person('b')],
   tags:[{contact_id:'a',tag_id:'t1',name:'Investors'},{contact_id:'b',tag_id:'t1',name:'Investors'}],
  });
  const [suggestion]=await IntroductionService.suggestions();
  expect(suggestion.reason).toEqual({key:'introReasonTag',value:'Investors'});
 });

 test('does not pair people on city alone when they already share an employer',async()=>{
  mockDatabase({contacts:[person('a',{city:'Istanbul',company_id:'co',company_name:'Acme'}),person('b',{city:'Istanbul',company_id:'co',company_name:'Acme'})]});
  const [suggestion]=await IntroductionService.suggestions();
  expect(suggestion.reason.key).toBe('introReasonCompany');
 });

 test('honours a dismissal',async()=>{
  mockDatabase({contacts:[person('a'),person('b'),person('hub')],edges:[{contact_a_id:'hub',contact_b_id:'a'},{contact_a_id:'hub',contact_b_id:'b'}]});
  await IntroductionService.dismiss('a','b');
  await expect(IntroductionService.suggestions()).resolves.toEqual([]);
 });

 test('stays quiet on a network too small to say anything',async()=>{
  mockDatabase({contacts:[person('a'),person('b')]});
  await expect(IntroductionService.suggestions()).resolves.toEqual([]);
 });
});
