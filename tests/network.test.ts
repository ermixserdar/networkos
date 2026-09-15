jest.mock('expo-crypto',()=>({randomUUID:()=>`test-${Math.random()}`}));
jest.mock('../src/database/database',()=>({getDatabase:jest.fn()}));

import {getDatabase} from '../src/database/database';
import {NetworkService,components,relationshipScore,separationCounts} from '../src/services/NetworkService';

const db=()=>({getAllAsync:jest.fn(),getFirstAsync:jest.fn(),runAsync:jest.fn()});
const adjacency=(pairs:[string,string][])=>{
 const map=new Map<string,string[]>();
 const link=(a:string,b:string)=>map.set(a,[...(map.get(a)??[]),b]);
 for(const [a,b] of pairs){link(a,b);link(b,a)}
 return map;
};

describe('NetworkService',()=>{
 beforeEach(()=>jest.clearAllMocks());

 test('returns the shortest path and terminates on cycles',async()=>{
  const mock=db();
  mock.getAllAsync.mockResolvedValue([{contact_a_id:'A',contact_b_id:'B'},{contact_a_id:'B',contact_b_id:'C'},{contact_a_id:'C',contact_b_id:'A'},{contact_a_id:'A',contact_b_id:'E'},{contact_a_id:'E',contact_b_id:'C'}]);
  (getDatabase as jest.Mock).mockResolvedValue(mock);
  await expect(NetworkService.shortestPath('A','C')).resolves.toEqual(['A','C']);
 });

 test('respects maximum traversal depth',async()=>{
  const mock=db();
  mock.getAllAsync.mockResolvedValue([{contact_a_id:'A',contact_b_id:'B'},{contact_a_id:'B',contact_b_id:'C'},{contact_a_id:'C',contact_b_id:'D'}]);
  (getDatabase as jest.Mock).mockResolvedValue(mock);
  await expect(NetworkService.shortestPath('A','D',2)).resolves.toBeNull();
  await expect(NetworkService.shortestPath('A','D',3)).resolves.toEqual(['A','B','C','D']);
 });

 test('blocks self relationships before touching storage',async()=>{
  const mock=db();
  (getDatabase as jest.Mock).mockResolvedValue(mock);
  await expect(NetworkService.upsert('A','A')).rejects.toThrow('themselves');
  expect(getDatabase).not.toHaveBeenCalled();
 });

 test('upserts an existing pair by looking it up, not by id conflict',async()=>{
  // `ON CONFLICT(id)` could never fire: the unique index is on the ordered pair.
  const mock=db();
  mock.getFirstAsync.mockResolvedValue({id:'existing'});
  (getDatabase as jest.Mock).mockResolvedValue(mock);
  await expect(NetworkService.upsert('B','A','friend',5)).resolves.toBe('existing');
  const [sql,...args]=mock.runAsync.mock.calls[0];
  expect(sql).toMatch(/^UPDATE relationships/);
  expect(args).toContain('existing');
  expect(mock.runAsync).toHaveBeenCalledTimes(1);
 });

 test('orders the pair so the same edge is never stored twice',async()=>{
  const mock=db();
  mock.getFirstAsync.mockResolvedValue(null);
  (getDatabase as jest.Mock).mockResolvedValue(mock);
  await NetworkService.upsert('zed','alice');
  const args=mock.runAsync.mock.calls[0].slice(1);
  expect(args[1]).toBe('alice');
  expect(args[2]).toBe('zed');
 });

 test('classifies relationship health deterministically',()=>{
  expect(NetworkService.health({relationship_strength:5,importance:5,last_contact_at:Date.now()-100*86400000})).toBe('Dormant');
  expect(NetworkService.health({relationship_strength:4,importance:3,last_contact_at:Date.now()-70*86400000})).toBe('Cooling');
  expect(NetworkService.health({relationship_strength:4,importance:4,last_contact_at:Date.now()-10*86400000})).toBe('Healthy');
 });

 test('scores a warm, important, recently contacted person highest',()=>{
  const warm=relationshipScore({relationship_strength:5,importance:5,last_contact_at:Date.now()});
  const cold=relationshipScore({relationship_strength:1,importance:1,last_contact_at:null});
  expect(warm).toBeGreaterThan(cold);
  expect(warm).toBeLessThanOrEqual(100);
  expect(cold).toBeGreaterThanOrEqual(0);
 });
});

describe('structural analysis',()=>{
 test('finds the cut vertex in a chain and counts who it separates',()=>{
  // A — B — C — D : B and C are both bridges.
  const counts=separationCounts(adjacency([['A','B'],['B','C'],['C','D']]));
  expect(counts.get('B')).toBe(2);
  expect(counts.get('C')).toBe(1);
  expect(counts.has('A')).toBe(false);
 });

 test('reports no cut vertex in a cycle',()=>{
  expect([...separationCounts(adjacency([['A','B'],['B','C'],['C','A']])).keys()]).toEqual([]);
 });

 test('counts the hub of a star as separating everyone else',()=>{
  const counts=separationCounts(adjacency([['H','A'],['H','B'],['H','C']]));
  expect(counts.get('H')).toBe(2);
 });

 test('groups disconnected clusters largest first',()=>{
  const ids=['A','B','C','D','E'];
  const groups=components(adjacency([['A','B'],['B','C'],['D','E']]),ids);
  expect(groups.map(g=>g.length)).toEqual([3,2]);
 });

 test('treats an isolated person as their own cluster',()=>{
  const groups=components(adjacency([['A','B']]),['A','B','Z']);
  expect(groups).toContainEqual(['Z']);
 });
});
