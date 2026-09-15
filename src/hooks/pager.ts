export type Page<T>={rows:T[];total:number};
export type PageFetcher<T>=(offset:number)=>Promise<Page<T>>;
export type PageResult<T>=Page<T>&{append:boolean;exhausted:boolean};

/**
 * The offset bookkeeping behind a paged list, kept out of React so it can be tested directly.
 *
 * Two guarantees matter and both were missing when list paging first shipped: only one request
 * may be in flight, or `onEndReached` fires again before `offset` has moved and the same rows are
 * appended twice; and a response that arrives after `reset()` must be discarded rather than mixed
 * into results for a different query.
 */
export function createPager<T>(fetchPage:PageFetcher<T>,pageSize:number){
 let offset=0,generation=0,fetching=false;
 return {
  reset(){generation++;fetching=false;offset=0},
  get inFlight(){return fetching},
  get offset(){return offset},
  /** Resolves to null when the call was skipped or superseded — callers then leave state alone. */
  async load(startOver:boolean):Promise<PageResult<T>|null>{
   if(fetching)return null;
   fetching=true;
   const mine=generation;
   try{
    const from=startOver?0:offset;
    const {rows,total}=await fetchPage(from);
    if(mine!==generation)return null;
    offset=from+rows.length;
    return {rows,total,append:from>0,exhausted:rows.length<pageSize};
   }finally{if(mine===generation)fetching=false}
  },
 };
}
