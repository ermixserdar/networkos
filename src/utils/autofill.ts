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

const EMAIL_RE=/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const LINKEDIN_RE=/linkedin\.com\/in\/([\w-]+)/i;
const PHONE_RE=/\+?[\d()][\d\s().-]{6,}[\d)]/g;

export type ContactGuess={first?:string;last?:string;email?:string;phone?:string;linkedin?:string;jobTitle?:string;companyName?:string};

const capitalize=(word:string)=>word?word[0].toUpperCase()+word.slice(1).toLowerCase():word;

/** `ali-yilmaz-5b1a2c` → Ali Yılmaz; id suffixes are dropped. */
export function nameFromSlug(slug:string):{first:string;last:string}|null{
 // Hash-like suffixes carry digits; real name parts do not.
 const tokens=slug.split('-').filter(t=>t.length>=2&&!/\d/.test(t)).map(capitalize);
 if(tokens.length<2)return null;
 return {first:tokens[0],last:tokens[tokens.length-1]};
}

/** `ali.yilmaz@acme.com` → Ali Yılmaz; single-token or numeric handles give nothing. */
export function nameFromEmail(email:string):{first:string;last:string}|null{
 const local=email.split('@')[0]??'';
 const tokens=local.split(/[._\-+]+/).map(t=>t.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ]/g,'')).filter(t=>t.length>=2);
 if(tokens.length<2)return null;
 return {first:capitalize(tokens[0]),last:capitalize(tokens[tokens.length-1])};
}

/** `https://www.acme-group.com` → Acme Group. */
export function companyNameFromWebsite(website?:string|null):string|null{
 const host=hostOf(website);
 if(!host)return null;
 const name=host.split('.')[0].split(/[-_]+/).map(capitalize).join(' ');
 return name||null;
}

/**
 * Reads a pasted signature block, vCard-ish text or "Title at Company" line and
 * pulls out whatever looks like a contact field. Only ever fills empty fields —
 * the caller decides what is missing.
 */
export function parseContactBlock(text:string):ContactGuess{
 const guess:ContactGuess={};
 const cleaned=text.trim();
 if(!cleaned)return guess;
 const email=cleaned.match(EMAIL_RE)?.[0];
 if(email)guess.email=email;
 const profile=cleaned.match(LINKEDIN_RE);
 if(profile){
  guess.linkedin=`https://linkedin.com/in/${profile[1]}`;
  const slugName=nameFromSlug(profile[1]);
  if(slugName){guess.first=slugName.first;guess.last=slugName.last}
 }
 const phones=[...cleaned.matchAll(PHONE_RE)]
  .map(match=>match[0].trim())
  .filter(phone=>phone.replace(/\D/g,'').length>=10);
 const phone=phones.find(item=>item.startsWith('+'))??phones[0];
 if(phone)guess.phone=phone;
 const lines=cleaned.split('\n').map(line=>line.trim()).filter(Boolean);
 for(const line of lines){
  if(/@|linkedin|\d/.test(line))continue;
  const role=line.match(/^(.+?)\s+(?:at|@|·|\||—|-)\s+(.+)$/);
  if(role&&role[1].split(/\s+/).length<=5&&role[2].split(/\s+/).length<=4){
   guess.jobTitle=role[1].trim();guess.companyName=role[2].trim();break;
  }
 }
 if(!guess.first){
  if(email){
   const mailName=nameFromEmail(email);
   if(mailName){guess.first=mailName.first;guess.last=mailName.last}
  }else{
   const nameLine=lines.find(line=>/^[\p{L} .'-]+$/u.test(line)&&line.split(/\s+/).length>=2&&line.split(/\s+/).length<=4);
   if(nameLine){
    const words=nameLine.split(/\s+/);
    guess.first=capitalize(words[0]);guess.last=capitalize(words[words.length-1]);
   }
  }
 }
 return guess;
}
