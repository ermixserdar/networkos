import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {Contact} from '@/types';
import {ContactQuery,ContactRepository} from '@/repositories/ContactRepository';
import {PageResult,createPager} from '@/hooks/pager';

const PAGE=60;

/**
 * Paged contact list. Counts come from SQL and pages are fetched on demand, so nothing is hidden
 * past an arbitrary limit. The offset bookkeeping lives in `createPager`, which is where the
 * duplicate-append and stale-response guarantees are tested.
 */
export function useContacts({q='',tagId,order='name',pageSize=PAGE}:{q?:string;tagId?:string;order?:ContactQuery['order'];pageSize?:number}={}){
 const [contacts,setContacts]=useState<Contact[]>([]);
 const [total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [exhausted,setExhausted]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);

 const pager=useMemo(()=>createPager<Contact>(async offset=>{
  const [rows,count]=await Promise.all([
   ContactRepository.list({q,tagId,order,limit:pageSize,offset}),
   ContactRepository.count({q,tagId}),
  ]);
  return {rows,total:count};
 },pageSize),[q,tagId,order,pageSize]);

 const apply=useCallback((result:PageResult<Contact>|null)=>{
  if(!result)return;
  setTotal(result.total);
  setExhausted(result.exhausted);
  setContacts(previous=>result.append?[...previous,...result.rows]:result.rows);
 },[]);

 const refresh=useCallback(async()=>{
  pager.reset();
  setLoading(true);setError(null);
  try{apply(await pager.load(true))}catch{setError('load-failed')}finally{setLoading(false)}
 },[pager,apply]);

 const loadMore=useCallback(async()=>{
  if(loading||exhausted)return;
  try{apply(await pager.load(false))}catch{setError('load-failed')}
 },[pager,apply,loading,exhausted]);

 // Debounced while the query changes. The first run is skipped because focus already loads once.
 const mounted=useRef(false);
 useEffect(()=>{
  if(!mounted.current){mounted.current=true;return}
  if(timer.current)clearTimeout(timer.current);
  timer.current=setTimeout(()=>{void refresh()},q?250:0);
  return()=>{if(timer.current)clearTimeout(timer.current)};
 },[refresh,q]);

 // Deliberately stable: tying this to `refresh` made every keystroke fire an extra undebounced read.
 const latest=useRef(refresh);
 latest.current=refresh;
 useFocusEffect(useCallback(()=>{void latest.current();},[]));

 return {contacts,total,refresh,loadMore,loading,error,hasMore:!exhausted&&contacts.length<total};
}
