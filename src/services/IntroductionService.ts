import AsyncStorage from '@react-native-async-storage/async-storage';
import {getDatabase} from '@/database/database';
import {Contact} from '@/types';
import {VaultService} from '@/services/VaultService';

export type IntroReason={key:'introReasonMutual'|'introReasonCompany'|'introReasonTag'|'introReasonCity';value:string};
export type IntroSuggestion={a:Contact;b:Contact;score:number;reason:IntroReason};

const DISMISSED='networkos.intro.dismissed';
export const pairKey=(a:string,b:string)=>[a,b].sort().join('|');

async function dismissedSet(){
 try{const raw=await AsyncStorage.getItem(DISMISSED);return new Set<string>(raw?JSON.parse(raw):[])}catch{return new Set<string>()}
}

const displayName=(c:Contact)=>c.display_name||`${c.first_name} ${c.last_name??''}`.trim();

export const IntroductionService={
 dismiss:async(a:string,b:string)=>{
  const set=await dismissedSet();
  set.add(pairKey(a,b));
  await AsyncStorage.setItem(DISMISSED,JSON.stringify([...set]));
 },
 clearDismissed:async()=>{await AsyncStorage.removeItem(DISMISSED)},

 /**
  * Pairs who share context but have no edge between them. A mutual connection outranks a shared
  * company because it means someone can actually vouch for both sides.
  */
 suggestions:async(limit=8,maxContacts=1500):Promise<IntroSuggestion[]>=>{
  const d=await getDatabase();
  const contacts=await d.getAllAsync<Contact>(`SELECT c.*,co.name company_name FROM contacts c LEFT JOIN companies co ON co.id=c.company_id WHERE c.deleted_at IS NULL${VaultService.clause()} ORDER BY c.importance DESC,c.relationship_strength DESC LIMIT ?`,maxContacts);
  if(contacts.length<2)return [];
  const byId=new Map(contacts.map(c=>[c.id,c]));
  const edges=await d.getAllAsync<{contact_a_id:string;contact_b_id:string}>('SELECT contact_a_id,contact_b_id FROM relationships WHERE deleted_at IS NULL');
  const tagRows=await d.getAllAsync<{contact_id:string;tag_id:string;name:string}>('SELECT ct.contact_id,ct.tag_id,t.name FROM contact_tags ct JOIN tags t ON t.id=ct.tag_id WHERE ct.deleted_at IS NULL AND t.deleted_at IS NULL');

  const connected=new Set<string>();
  const neighbours=new Map<string,Set<string>>();
  for(const e of edges){
   if(!byId.has(e.contact_a_id)||!byId.has(e.contact_b_id))continue;
   connected.add(pairKey(e.contact_a_id,e.contact_b_id));
   for(const [from,to] of [[e.contact_a_id,e.contact_b_id],[e.contact_b_id,e.contact_a_id]] as const){
    const set=neighbours.get(from)??new Set<string>();set.add(to);neighbours.set(from,set);
   }
  }
  const dismissed=await dismissedSet();
  const best=new Map<string,IntroSuggestion>();
  const offer=(a:Contact,b:Contact,score:number,reason:IntroReason)=>{
   const key=pairKey(a.id,b.id);
   if(a.id===b.id||connected.has(key)||dismissed.has(key))return;
   const current=best.get(key);
   if(!current||current.score<score)best.set(key,{a,b,score,reason});
  };

  // Mutual connections.
  for(const [hub,set] of neighbours){
   const list=[...set];
   if(list.length<2||list.length>60)continue;
   const hubName=displayName(byId.get(hub)!);
   for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const a=byId.get(list[i]),b=byId.get(list[j]);
    if(a&&b)offer(a,b,3,{key:'introReasonMutual',value:hubName});
   }
  }
  // Shared company.
  const byCompany=new Map<string,Contact[]>();
  for(const c of contacts)if(c.company_id)byCompany.set(c.company_id,[...(byCompany.get(c.company_id)??[]),c]);
  for(const group of byCompany.values())if(group.length>1&&group.length<=40)
   for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)offer(group[i],group[j],2,{key:'introReasonCompany',value:group[i].company_name??''});
  // Shared tag.
  const byTag=new Map<string,{name:string;ids:string[]}>();
  for(const row of tagRows){const entry=byTag.get(row.tag_id)??{name:row.name,ids:[]};entry.ids.push(row.contact_id);byTag.set(row.tag_id,entry)}
  for(const entry of byTag.values())if(entry.ids.length>1&&entry.ids.length<=40)
   for(let i=0;i<entry.ids.length;i++)for(let j=i+1;j<entry.ids.length;j++){
    const a=byId.get(entry.ids[i]),b=byId.get(entry.ids[j]);
    if(a&&b)offer(a,b,2,{key:'introReasonTag',value:entry.name});
   }
  // Same city, only when it is not already explained by a shared employer.
  const byCity=new Map<string,Contact[]>();
  for(const c of contacts)if(c.city?.trim())byCity.set(c.city.trim().toLowerCase(),[...(byCity.get(c.city.trim().toLowerCase())??[]),c]);
  for(const group of byCity.values())if(group.length>1&&group.length<=25)
   for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)
    if(group[i].company_id!==group[j].company_id)offer(group[i],group[j],1,{key:'introReasonCity',value:group[i].city??''});

  return [...best.values()]
   .sort((x,y)=>y.score-x.score||(y.a.importance+y.b.importance)-(x.a.importance+x.b.importance))
   .slice(0,limit);
 },
};
