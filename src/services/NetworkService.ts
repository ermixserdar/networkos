import {getDatabase} from '@/database/database';
import {Contact,Relationship,now,uuid} from '@/types';
import {VaultService} from '@/services/VaultService';

export function relationshipScore(c:{relationship_strength:number;importance:number;last_contact_at?:number|null;next_follow_up_at?:number|null}){
 const days=c.last_contact_at?Math.max(0,(Date.now()-c.last_contact_at)/86400000):365;
 const recency=Math.max(0,Math.min(30,30-days/12));
 const followUp=c.next_follow_up_at&&c.next_follow_up_at>Date.now()?10:0;
 return Math.round(c.relationship_strength/5*35+c.importance/5*25+recency+followUp);
}

export type GraphEdge=Pick<Relationship,'id'|'contact_a_id'|'contact_b_id'|'strength'|'relationship_type'>;
export type NetworkGraph={nodes:Record<string,unknown>[];edges:GraphEdge[]};
/** Synthetic node id for the owner; it is not a row in `contacts`. */
export const OWNER_ID='owner';

export type Insight=
 |{kind:'bridge';contactId:string;name:string;count:number;evidence:string[]}
 |{kind:'cluster';a:string;b:string;sizeA:number;sizeB:number;evidence:string[]}
 |{kind:'concentration';name:string;percent:number;evidence:string[]}
 |{kind:'dormant';count:number;evidence:string[]};

/** Relationship rows the current vault state allows the app to traverse. */
function visibleEdges(){
 const base='SELECT r.contact_a_id,r.contact_b_id FROM relationships r WHERE r.deleted_at IS NULL';
 return VaultService.isUnlocked()?base
  :`${base} AND NOT EXISTS(SELECT 1 FROM contacts p WHERE p.private=1 AND (p.id=r.contact_a_id OR p.id=r.contact_b_id))`;
}

function adjacency(edges:{contact_a_id:string;contact_b_id:string}[]){
 const adj=new Map<string,Set<string>>();
 const link=(a:string,b:string)=>{const set=adj.get(a)??new Set<string>();set.add(b);adj.set(a,set)};
 for(const e of edges){link(e.contact_a_id,e.contact_b_id);link(e.contact_b_id,e.contact_a_id)}
 return new Map<string,string[]>([...adj].map(([k,v])=>[k,[...v]]));
}

/**
 * Tarjan articulation points, iterative so a long chain of contacts cannot blow the JS stack.
 * Returns, per cut vertex, how many people would become unreachable without them.
 */
export function separationCounts(adj:Map<string,string[]>){
 const disc=new Map<string,number>(),low=new Map<string,number>(),sub=new Map<string,number>();
 const separated=new Map<string,number>();
 let timer=0;
 for(const root of adj.keys()){
  if(disc.has(root))continue;
  disc.set(root,timer);low.set(root,timer);sub.set(root,1);timer++;
  const rootChildSizes:number[]=[];
  const stack:{node:string;parent:string|null;i:number}[]=[{node:root,parent:null,i:0}];
  while(stack.length){
   const frame=stack[stack.length-1];
   const neighbours=adj.get(frame.node)??[];
   if(frame.i<neighbours.length){
    const next=neighbours[frame.i++];
    if(next===frame.parent)continue;
    if(disc.has(next)){low.set(frame.node,Math.min(low.get(frame.node)!,disc.get(next)!));continue}
    disc.set(next,timer);low.set(next,timer);sub.set(next,1);timer++;
    stack.push({node:next,parent:frame.node,i:0});
   }else{
    stack.pop();
    const parent=frame.parent;
    if(parent===null)continue;
    low.set(parent,Math.min(low.get(parent)!,low.get(frame.node)!));
    sub.set(parent,sub.get(parent)!+sub.get(frame.node)!);
    if(parent===root)rootChildSizes.push(sub.get(frame.node)!);
    else if(low.get(frame.node)!>=disc.get(parent)!)separated.set(parent,(separated.get(parent)??0)+sub.get(frame.node)!);
   }
  }
  if(rootChildSizes.length>1){
   const componentSize=rootChildSizes.reduce((a,b)=>a+b,0);
   separated.set(root,componentSize-Math.max(...rootChildSizes));
  }
 }
 return separated;
}

/** The people who become unreachable without `cut` — the claim behind a bridge insight. */
export function separatedBy(adj:Map<string,string[]>,cut:string){
 const reachable=new Set<string>();
 const start=[...adj.keys()].find(id=>id!==cut);
 if(!start)return [];
 const queue=[start];reachable.add(start);
 while(queue.length){
  const node=queue.shift()!;
  for(const next of adj.get(node)??[])if(next!==cut&&!reachable.has(next)){reachable.add(next);queue.push(next)}
 }
 return [...adj.keys()].filter(id=>id!==cut&&!reachable.has(id));
}

export function components(adj:Map<string,string[]>,allIds:string[]){
 const seen=new Set<string>();const out:string[][]=[];
 for(const id of allIds){
  if(seen.has(id))continue;
  const queue=[id];seen.add(id);const group:string[]=[];
  while(queue.length){const node=queue.shift()!;group.push(node);for(const next of adj.get(node)??[])if(!seen.has(next)){seen.add(next);queue.push(next)}}
  out.push(group);
 }
 return out.sort((a,b)=>b.length-a.length);
}

export const NetworkService={
 upsert:async(a:string,b:string,type='other',strength=3)=>{
  if(a===b)throw Error('A person cannot be connected to themselves');
  const d=await getDatabase(),t=now();
  const [x,y]=[a,b].sort();
  // The unique index is on the (min,max) pair, not on `id`, so a fresh uuid can never conflict —
  // the existing row has to be found first or the insert violates the index.
  const existing=await d.getFirstAsync<{id:string}>('SELECT id FROM relationships WHERE min(contact_a_id,contact_b_id)=? AND max(contact_a_id,contact_b_id)=? AND deleted_at IS NULL',x,y);
  if(existing){await d.runAsync('UPDATE relationships SET strength=?,relationship_type=?,updated_at=?,version=version+1 WHERE id=?',strength,type,t,existing.id);return existing.id}
  const id=uuid();
  await d.runAsync('INSERT INTO relationships(id,contact_a_id,contact_b_id,relationship_type,strength,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',id,x,y,type,strength,t,t);
  return id;
 },

 shortestPath:async(fromId:string,toId:string,maxDepth=6)=>{
  const d=await getDatabase();
  // A locked vault must not let a path route through — or reveal — a private contact.
  const rows=await d.getAllAsync<{contact_a_id:string;contact_b_id:string}>(visibleEdges());
  const adj=adjacency(rows);
  const queue=[{id:fromId,path:[fromId]}],seen=new Set([fromId]);
  while(queue.length){
   const n=queue.shift()!;
   if(n.id===toId)return n.path;
   if(n.path.length-1>=maxDepth)continue;
   for(const next of adj.get(n.id)??[])if(!seen.has(next)){seen.add(next);queue.push({id:next,path:[...n.path,next]})}
  }
  return null;
 },

 /**
  * `asOf` rewinds the map: rows created after that instant are excluded, so the same screen can
  * show what the network looked like a year ago. Nothing extra is stored — `created_at` was
  * already there on every row.
  */
 graph:async(id:string,depth=2,maxNodes=150,asOf?:number):Promise<NetworkGraph>=>{
  const d=await getDatabase();
  const horizon=asOf??Number.MAX_SAFE_INTEGER;
  const nodes=await d.getAllAsync<Record<string,unknown>>('WITH RECURSIVE reach(id,depth) AS (SELECT ?,0 UNION SELECT CASE WHEN r.contact_a_id=reach.id THEN r.contact_b_id ELSE r.contact_a_id END,reach.depth+1 FROM relationships r JOIN reach ON (r.contact_a_id=reach.id OR r.contact_b_id=reach.id) WHERE r.deleted_at IS NULL AND r.created_at<=? AND reach.depth<?) SELECT c.*,co.name company_name FROM reach JOIN contacts c ON c.id=reach.id LEFT JOIN companies co ON co.id=c.company_id WHERE c.deleted_at IS NULL AND c.private=0 AND c.created_at<=? ORDER BY reach.depth,c.first_name LIMIT ?',id,horizon,depth,horizon,maxNodes);
  const ids=nodes.map(n=>String(n.id));
  if(!ids.length)return {nodes:[],edges:[]};
  const placeholders=ids.map(()=>'?').join(',');
  const edges=await d.getAllAsync<GraphEdge>(`SELECT id,contact_a_id,contact_b_id,strength,relationship_type FROM relationships WHERE deleted_at IS NULL AND created_at<=? AND contact_a_id IN (${placeholders}) AND contact_b_id IN (${placeholders})`,horizon,...ids,...ids);
  return {nodes,edges};
 },

 /**
  * The owner is not stored in `contacts`, so their view of the network is assembled here:
  * everyone they know directly, plus the relationships between those people.
  */
 ownerGraph:async(maxNodes=150,asOf?:number):Promise<NetworkGraph>=>{
  const d=await getDatabase();
  const horizon=asOf??Number.MAX_SAFE_INTEGER;
  const nodes=await d.getAllAsync<Record<string,unknown>>(`SELECT c.*,co.name company_name FROM contacts c LEFT JOIN companies co ON co.id=c.company_id WHERE c.deleted_at IS NULL${VaultService.clause()} AND c.created_at<=? ORDER BY c.favorite DESC,c.relationship_strength DESC,c.importance DESC LIMIT ?`,horizon,maxNodes);
  const ids=nodes.map(n=>String(n.id));
  if(!ids.length)return {nodes:[],edges:[]};
  const placeholders=ids.map(()=>'?').join(',');
  const real=await d.getAllAsync<GraphEdge>(`SELECT id,contact_a_id,contact_b_id,strength,relationship_type FROM relationships WHERE deleted_at IS NULL AND created_at<=? AND contact_a_id IN (${placeholders}) AND contact_b_id IN (${placeholders})`,horizon,...ids,...ids);
  const ownerEdges:GraphEdge[]=nodes.map(n=>({id:`owner-${n.id}`,contact_a_id:OWNER_ID,contact_b_id:String(n.id),strength:Number(n.relationship_strength??3),relationship_type:'owner'}));
  return {nodes,edges:[...real,...ownerEdges]};
 },

 /** Path nodes are often outside whatever page the screen has loaded, so names are fetched by id. */
 namesFor:async(ids:string[])=>{
  if(!ids.length)return {} as Record<string,string>;
  const d=await getDatabase();
  const rows=await d.getAllAsync<{id:string;display_name:string|null;first_name:string;last_name:string|null}>(
   `SELECT id,display_name,first_name,last_name FROM contacts c WHERE id IN (${ids.map(()=>'?').join(',')})${VaultService.clause()}`,...ids);
  return Object.fromEntries(rows.map(row=>[row.id,row.display_name||`${row.first_name} ${row.last_name??''}`.trim()]));
 },

 connections:async(id:string,depth=2)=>{const graph=await NetworkService.graph(id,depth);return graph.nodes.filter(c=>c.id!==id)},

 health:(c:{relationship_strength:number;importance:number;last_contact_at?:number|null})=>{
  const days=c.last_contact_at?Math.floor((Date.now()-c.last_contact_at)/86400000):999;
  return c.relationship_strength>=4&&c.importance>=4&&days>90?'Dormant':days>180||c.relationship_strength<=2?'Dormant':days>60?'Cooling':'Healthy';
 },

 /** Structural read of the whole network — the part a picture alone cannot tell you. */
 insights:async():Promise<Insight[]>=>{
  const d=await getDatabase();
  const contacts=await d.getAllAsync<Contact>(`SELECT c.id,c.first_name,c.last_name,c.display_name,c.company_id,c.relationship_strength,c.importance,c.last_contact_at,co.name company_name FROM contacts c LEFT JOIN companies co ON co.id=c.company_id WHERE c.deleted_at IS NULL${VaultService.clause()}`);
  if(contacts.length<4)return [];
  const edges=await d.getAllAsync<{contact_a_id:string;contact_b_id:string}>(visibleEdges());
  const byId=new Map(contacts.map(c=>[c.id,c]));
  const name=(id:string)=>{const c=byId.get(id);return c?(c.display_name||`${c.first_name} ${c.last_name??''}`.trim()):id};
  const adj=adjacency(edges.filter(e=>byId.has(e.contact_a_id)&&byId.has(e.contact_b_id)));
  const out:Insight[]=[];

  for(const [id,count] of [...separationCounts(adj)].sort((a,b)=>b[1]-a[1]).slice(0,3))
   if(count>=2)out.push({kind:'bridge',contactId:id,name:name(id),count,evidence:separatedBy(adj,id)});

  const groups=components(adj,contacts.map(c=>c.id)).filter(g=>g.length>=3);
  if(groups.length>=2){
   const label=(group:string[])=>{
    const counts=new Map<string,number>();
    for(const id of group){const company=byId.get(id)?.company_name;if(company)counts.set(company,(counts.get(company)??0)+1)}
    const top=[...counts].sort((a,b)=>b[1]-a[1])[0];
    return top&&top[1]>1?top[0]:name([...group].sort((a,b)=>(adj.get(b)?.length??0)-(adj.get(a)?.length??0))[0]);
   };
   out.push({kind:'cluster',a:label(groups[0]),b:label(groups[1]),sizeA:groups[0].length,sizeB:groups[1].length,evidence:[...groups[0].slice(0,6),...groups[1].slice(0,6)]});
  }

  if(contacts.length>=8){
   const counts=new Map<string,number>();
   for(const c of contacts)if(c.company_name)counts.set(c.company_name,(counts.get(c.company_name)??0)+1);
   const top=[...counts].sort((a,b)=>b[1]-a[1])[0];
   if(top){const percent=Math.round(top[1]/contacts.length*100);if(percent>=35)out.push({kind:'concentration',name:top[0],percent,evidence:contacts.filter(x=>x.company_name===top[0]).map(x=>x.id)})}
  }

  const dormant=contacts.filter(c=>c.relationship_strength>=4&&(!c.last_contact_at||Date.now()-c.last_contact_at>90*86400000));
  if(dormant.length)out.push({kind:'dormant',count:dormant.length,evidence:dormant.map(c=>c.id)});

  return out;
 },
};
