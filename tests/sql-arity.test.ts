import {readFileSync,readdirSync,statSync} from 'fs';
import {join} from 'path';

/**
 * `TagRepository.create` shipped with five placeholders and four arguments, so creating a tag
 * failed at runtime for every user. Nothing in typecheck or lint catches that, so this walks the
 * static SQL in the source and asserts placeholders and bound arguments agree.
 */
const ROOT=join(__dirname,'..','src');
const CALL=/\.(runAsync|getFirstAsync|getAllAsync)\s*(?:<[^>]*>)?\s*\(/g;

function sources(dir:string):string[]{
 return readdirSync(dir).flatMap(entry=>{
  const path=join(dir,entry);
  if(statSync(path).isDirectory())return sources(path);
  return path.endsWith('.ts')?[path]:[];
 });
}

/** Splits a call's argument list on top-level commas, respecting quotes, template literals and nesting. */
function splitArguments(source:string,start:number){
 const args:string[]=[];
 let depth=0,current='',quote:string|null=null,template=0,i=start;
 for(;i<source.length;i++){
  const ch=source[i],previous=source[i-1];
  if(quote){
   current+=ch;
   if(ch===quote&&previous!=='\\')quote=null;
   continue;
  }
  if(ch==='\''||ch==='"'||ch==='`'){quote=ch;current+=ch;continue}
  if(ch==='$'&&source[i+1]==='{'){template++;current+=ch;continue}
  if(template&&ch==='}'){template--;current+=ch;continue}
  if('([{'.includes(ch))depth++;
  if(')]}'.includes(ch)){
   if(ch===')'&&depth===0){args.push(current);return {args,end:i}}
   depth--;
  }
  if(ch===','&&depth===0&&!template){args.push(current);current='';continue}
  current+=ch;
 }
 return {args,end:i};
}

/** Counts `?` outside string literals so a question mark inside SQL text is not miscounted. */
function countPlaceholders(sql:string){
 let count=0,quote:string|null=null;
 for(let i=0;i<sql.length;i++){
  const ch=sql[i];
  if(quote){if(ch===quote)quote=null;continue}
  if(ch==='\''||ch==='"'){quote=ch;continue}
  if(ch==='?')count++;
 }
 return count;
}

type Finding={file:string;sql:string;placeholders:number;bound:number};

function scan(path:string):Finding[]{
 const source=readFileSync(path,'utf8');
 const findings:Finding[]=[];
 CALL.lastIndex=0;
 let match:RegExpExecArray|null;
 while((match=CALL.exec(source))){
  const {args}=splitArguments(source,match.index+match[0].length);
  const [first,...rest]=args.map(x=>x.trim());
  if(!first)continue;
  // Only literal SQL with a literal argument list can be checked statically.
  const literal=(first.startsWith("'")&&first.endsWith("'"))||(first.startsWith('`')&&first.endsWith('`')&&!first.includes('${'));
  if(!literal)continue;
  if(rest.some(arg=>arg.startsWith('...')||arg===''))continue;
  const sql=first.slice(1,-1);
  const placeholders=countPlaceholders(sql);
  if(placeholders!==rest.length)findings.push({file:path.replace(`${ROOT}/`,''),sql:sql.slice(0,80),placeholders,bound:rest.length});
 }
 return findings;
}

describe('SQL parameter binding',()=>{
 test('every statically checkable statement binds exactly as many arguments as it has placeholders',()=>{
  const findings=sources(ROOT).flatMap(scan);
  expect(findings).toEqual([]);
 });

 test('the checker itself catches a mismatch',()=>{
  // Guards against the scan silently matching nothing and passing for the wrong reason.
  const sql="'INSERT INTO tags(id,name,created_at,updated_at) VALUES(?,?,?,?,?)'";
  expect(countPlaceholders(sql.slice(1,-1))).toBe(5);
 });
});
