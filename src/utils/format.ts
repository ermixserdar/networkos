import type {Language} from '@/i18n';

export function relativeDate(value?:number|null,language:Language='en'){const tr=language==='tr';if(!value)return tr?'Henüz temas yok':'No contact yet';const days=Math.floor((Date.now()-value)/86400000);if(days<=0)return tr?'Bugün':'Today';if(days===1)return tr?'Dün':'Yesterday';if(days<30)return tr?`${days} gün önce`:`${days} days ago`;if(days<365)return tr?`${Math.floor(days/30)} ay önce`:`${Math.floor(days/30)} months ago`;return tr?`${Math.floor(days/365)} yıl önce`:`${Math.floor(days/365)} years ago`}

export function relativeFuture(value?:number|null,language:Language='en'){const tr=language==='tr';if(!value)return '';const days=Math.ceil((value-Date.now())/86400000);if(days<0)return tr?`${Math.abs(days)} gün gecikti`:`${Math.abs(days)} days overdue`;if(days===0)return tr?'Bugün':'Today';if(days===1)return tr?'Yarın':'Tomorrow';if(days<30)return tr?`${days} gün içinde`:`in ${days} days`;return tr?`${Math.round(days/30)} ay içinde`:`in ${Math.round(days/30)} months`}

export const localeOf=(language:Language)=>language==='tr'?'tr-TR':'en-US';
export function formatDate(value?:number|null,language:Language='en'){return value?new Date(value).toLocaleDateString(localeOf(language),{day:'numeric',month:'long',year:'numeric'}):''}
export function formatDayMonth(value:number,language:Language='en'){return new Date(value).toLocaleDateString(localeOf(language),{day:'numeric',month:'long'})}

/** `YYYY-MM-DD` in and out, anchored at local noon so timezone shifts never move the day. */
export function parseDateInput(value:string){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());if(!match)return null;const [,y,m,d]=match;const date=new Date(Number(y),Number(m)-1,Number(d),12,0,0,0);if(date.getMonth()!==Number(m)-1||date.getDate()!==Number(d))return null;return date.getTime()}
export function toDateInput(value?:number|null){if(!value)return '';const date=new Date(value);const pad=(n:number)=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}

/** Next occurrence of a birthday, clamped so 29 Feb never lands on 1 March. */
export function nextAnniversary(birthday:number,from=Date.now()){const b=new Date(birthday);const build=(year:number)=>{const date=new Date(year,b.getMonth(),1,12,0,0,0);const lastDay=new Date(year,b.getMonth()+1,0).getDate();date.setDate(Math.min(b.getDate(),lastDay));return date.getTime()};const start=new Date(from);let at=build(start.getFullYear());if(at<from-86400000)at=build(start.getFullYear()+1);return at}
export function ageOn(birthday:number,at:number){return new Date(at).getFullYear()-new Date(birthday).getFullYear()}

export function normalizePhone(value?:string|null){if(!value)return undefined;const digits=value.replace(/\D/g,'');if(!digits)return undefined;return digits.length>10&&digits.startsWith('0')?digits.slice(1):digits;}
export function escapeLike(value:string){return value.replace(/[\\%_]/g,m=>`\\${m}`);}

/** Chunked so large payloads never blow the argument limit of `String.fromCharCode`. */
const CHUNK=8192;
export function toBase64(bytes:Uint8Array){let s='';for(let i=0;i<bytes.length;i+=CHUNK)s+=String.fromCharCode(...bytes.subarray(i,i+CHUNK));return btoa(s);}
export function fromBase64(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
