export function relativeDate(value?:number|null,language:'en'|'tr'='en'){const tr=language==='tr';if(!value)return tr?'Henüz temas yok':'No contact yet';const days=Math.floor((Date.now()-value)/86400000);if(days<=0)return tr?'Bugün':'Today';if(days===1)return tr?'Dün':'Yesterday';if(days<30)return tr?`${days} gün önce`:`${days} days ago`;if(days<365)return tr?`${Math.floor(days/30)} ay önce`:`${Math.floor(days/30)} months ago`;return tr?`${Math.floor(days/365)} yıl önce`:`${Math.floor(days/365)} years ago`}

export function normalizePhone(value?:string|null){if(!value)return undefined;const digits=value.replace(/\D/g,'');if(!digits)return undefined;return digits.length>10&&digits.startsWith('0')?digits.slice(1):digits;}

export function escapeLike(value:string){return value.replace(/[\\%_]/g,m=>`\\${m}`);}
