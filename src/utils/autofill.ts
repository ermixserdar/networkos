import type {Language} from '@/i18n';

/**
 * Small, pure guesses that remove typing without ever deciding for the user: every
 * result is a pre-selection the user can still change, never a silent write.
 */

/** `user@Sub.Example.com` → `example.com`. Anything unparsable is not a domain. */
export function emailDomain(email?:string|null):string|null{
 const clean=email?.trim().toLowerCase();
 if(!clean)return null;
 const at=clean.lastIndexOf('@');
 if(at<=0||at===clean.length-1)return null;
 const domain=clean.slice(at+1);
 return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)?domain:null;
}

/** `https://www.example.com/hakkimizda` → `example.com`. Accepts a bare host too. */
export function hostOf(urlOrHost?:string|null):string|null{
 const raw=urlOrHost?.trim().toLowerCase();
 if(!raw)return null;
 const host=raw.replace(/^[a-z][a-z0-9+.-]*:\/\//,'').split('/')[0].split(':')[0].replace(/^www\./,'');
 return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)?host:null;
}

/** The company whose website lives on the email's domain, subdomains included. */
export function companyIdForEmail(email:string,companies:{id:string;website?:string|null}[]):string|null{
 const domain=emailDomain(email);
 if(!domain)return null;
 return companies.find(company=>{
  const host=hostOf(company.website);
  return host!==null&&(domain===host||domain.endsWith(`.${host}`));
 })?.id??null;
}

/** E-postaları küçük harfe indirger; boş girdi `null` olur. */
export function normalizeEmail(email?:string|null):string|null{
 const clean=email?.trim().toLowerCase();
 return clean||null;
}

const CALLING_COUNTRY:Record<string,{en:string;tr:string}>={
 '1':{en:'United States',tr:'Amerika Birleşik Devletleri'},
 '7':{en:'Russia',tr:'Rusya'},
 '30':{en:'Greece',tr:'Yunanistan'},
 '31':{en:'Netherlands',tr:'Hollanda'},
 '32':{en:'Belgium',tr:'Belçika'},
 '33':{en:'France',tr:'Fransa'},
 '34':{en:'Spain',tr:'İspanya'},
 '39':{en:'Italy',tr:'İtalya'},
 '41':{en:'Switzerland',tr:'İsviçre'},
 '43':{en:'Austria',tr:'Avusturya'},
 '44':{en:'United Kingdom',tr:'Birleşik Krallık'},
 '49':{en:'Germany',tr:'Almanya'},
 '90':{en:'Türkiye',tr:'Türkiye'},
 '966':{en:'Saudi Arabia',tr:'Suudi Arabistan'},
 '971':{en:'United Arab Emirates',tr:'Birleşik Arap Emirlikleri'},
};

/**
 * Country guess from an international prefix (`+90…`, `0044…`) or the national
 * trunk-zero format the app already normalises (`0532…` → Türkiye). Unknown
 * prefixes return `null` rather than a wrong country.
 */
export function countryForPhone(phone?:string|null,language:Language='en'):string|null{
 const raw=phone?.trim();
 if(!raw)return null;
 let digits:string;
 if(raw.startsWith('+'))digits=raw.slice(1).replace(/\D/g,'');
 else if(/^00/.test(raw))digits=raw.slice(2).replace(/\D/g,'');
 else{
  const local=raw.replace(/\D/g,'');
  if(/^0\d{10}$/.test(local))return 'Türkiye';
  return null;
 }
 for(let len=4;len>=1;len--){
  const entry=CALLING_COUNTRY[digits.slice(0,len)];
  if(entry)return language==='tr'?entry.tr:entry.en;
 }
 return null;
}

/** Same employer → colleague, same surname → family. Everything else stays manual. */
export function suggestRelationshipType(
 a:{company_id?:string|null;last_name?:string|null},
 b:{company_id?:string|null;last_name?:string|null},
):'colleague'|'family'|null{
 if(a.company_id&&b.company_id&&a.company_id===b.company_id)return 'colleague';
 const lastA=a.last_name?.trim().toLocaleLowerCase();
 const lastB=b.last_name?.trim().toLocaleLowerCase();
 if(lastA&&lastB&&lastA===lastB)return 'family';
 return null;
}
