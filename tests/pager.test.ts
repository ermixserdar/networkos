import {createPager} from '../src/hooks/pager';

const PAGE=3;
const row=(n:number)=>`r${n}`;

/** A fetcher whose promises can be resolved by hand, so overlapping calls are reproducible. */
function deferredFetcher(total=10){
 const pending:{offset:number;resolve:()=>void}[]=[];
 const calls:number[]=[];
 const fetch=(offset:number)=>{
  calls.push(offset);
  return new Promise<{rows:string[];total:number}>(resolve=>{
   pending.push({offset,resolve:()=>resolve({rows:Array.from({length:Math.max(0,Math.min(PAGE,total-offset))},(_,i)=>row(offset+i)),total})});
  });
 };
 return {fetch,calls,flush(){const queued=[...pending];pending.length=0;queued.forEach(x=>x.resolve())}};
}

describe('pager',()=>{
 test('reads the first page and reports more to come',async()=>{
  const {fetch,flush}=deferredFetcher(10);
  const pager=createPager(fetch,PAGE);
  const load=pager.load(true);
  flush();
  const result=await load;
  expect(result).toEqual({rows:['r0','r1','r2'],total:10,append:false,exhausted:false});
 });

 test('advances the offset across pages',async()=>{
  const {fetch,flush}=deferredFetcher(10);
  const pager=createPager(fetch,PAGE);
  let load=pager.load(true);flush();await load;
  load=pager.load(false);flush();
  const second=await load;
  expect(second!.rows).toEqual(['r3','r4','r5']);
  expect(second!.append).toBe(true);
 });

 test('a second request while one is in flight is skipped, not duplicated',async()=>{
  // This is the bug: onEndReached fires twice before offset moves, and the same page lands twice.
  const {fetch,calls,flush}=deferredFetcher(10);
  const pager=createPager(fetch,PAGE);
  let load=pager.load(true);flush();await load;

  const first=pager.load(false);
  const second=pager.load(false);
  flush();
  expect(await second).toBeNull();
  expect((await first)!.rows).toEqual(['r3','r4','r5']);
  expect(calls).toEqual([0,3]);
 });

 test('a page that arrives after a reset is discarded',async()=>{
  const {fetch,flush}=deferredFetcher(10);
  const pager=createPager(fetch,PAGE);
  const stale=pager.load(true);
  pager.reset();
  flush();
  expect(await stale).toBeNull();
 });

 test('a reset lets the next request through even while one is still pending',async()=>{
  const {fetch,flush}=deferredFetcher(10);
  const pager=createPager(fetch,PAGE);
  const stale=pager.load(true);
  pager.reset();
  const fresh=pager.load(true);
  flush();
  expect(await stale).toBeNull();
  expect((await fresh)!.rows).toEqual(['r0','r1','r2']);
 });

 test('a reset sends the next read back to the first page',async()=>{
  const {fetch,calls,flush}=deferredFetcher(10);
  const pager=createPager(fetch,PAGE);
  let load=pager.load(true);flush();await load;
  load=pager.load(false);flush();await load;
  pager.reset();
  load=pager.load(true);flush();await load;
  expect(calls).toEqual([0,3,0]);
  expect(pager.offset).toBe(3);
 });

 test('a short page marks the list exhausted',async()=>{
  const {fetch,flush}=deferredFetcher(4);
  const pager=createPager(fetch,PAGE);
  let load=pager.load(true);flush();await load;
  load=pager.load(false);flush();
  const second=await load;
  expect(second!.rows).toEqual(['r3']);
  expect(second!.exhausted).toBe(true);
 });

 test('releases the in-flight lock when the fetch rejects',async()=>{
  const pager=createPager(()=>Promise.reject(new Error('offline')),PAGE);
  await expect(pager.load(true)).rejects.toThrow('offline');
  expect(pager.inFlight).toBe(false);
 });
});
