jest.mock('expo-crypto',()=>({randomUUID:()=>'test'}));

import {companyIdForEmail,companyNameFromWebsite,countryForPhone,emailDomain,hostOf,nameFromEmail,nameFromSlug,normalizeEmail,parseContactBlock,suggestRelationshipType} from '../src/utils/autofill';

const companies=[
 {id:'acme',website:'https://www.acme.com/about'},
 {id:'none',website:null},
];

describe('email to company',()=>{
 test('matches on the website domain, ignoring www and case',()=>{
  expect(companyIdForEmail('ada@acme.com',companies)).toBe('acme');
  expect(companyIdForEmail('Ada@Sub.Acme.COM',companies)).toBe('acme');
 });
 test('finds nothing without a usable email or a matching company',()=>{
  expect(companyIdForEmail('ada@gmail.com',companies)).toBeNull();
  expect(companyIdForEmail('not-an-email',companies)).toBeNull();
  expect(companyIdForEmail('',companies)).toBeNull();
 });
 test('extracts hosts and domains defensively',()=>{
  expect(emailDomain('  Ada@Acme.COM ')).toBe('acme.com');
  expect(emailDomain('no-at-sign')).toBeNull();
  expect(emailDomain('a@b')).toBeNull();
  expect(hostOf('acme.com')).toBe('acme.com');
  expect(hostOf('http://www.acme.com:8080/x')).toBe('acme.com');
  expect(hostOf('not a host')).toBeNull();
 });
 test('lowercases emails for storage',()=>{
  expect(normalizeEmail(' Ada@Acme.COM ')).toBe('ada@acme.com');
  expect(normalizeEmail('   ')).toBeNull();
 });
});

describe('phone to country',()=>{
 test('reads international prefixes in both notations',()=>{
  expect(countryForPhone('+905321112233','tr')).toBe('Türkiye');
  expect(countryForPhone('0044 20 7946 0018','en')).toBe('United Kingdom');
  expect(countryForPhone('+1 415 555 0100','tr')).toBe('Amerika Birleşik Devletleri');
 });
 test('treats the national trunk-zero format as Türkiye',()=>{
  expect(countryForPhone('0532 111 22 33','en')).toBe('Türkiye');
 });
 test('returns null rather than a wrong country',()=>{
  expect(countryForPhone('555 0100','en')).toBeNull();
  expect(countryForPhone('+9991234567','en')).toBeNull();
  expect(countryForPhone('','en')).toBeNull();
 });
});

describe('relationship suggestion',()=>{
 const ada={company_id:'acme',last_name:'Lovelace'};
 test('same employer suggests colleague',()=>{
  expect(suggestRelationshipType(ada,{company_id:'acme',last_name:'Hopper'})).toBe('colleague');
 });
 test('same surname suggests family',()=>{
  expect(suggestRelationshipType(ada,{company_id:null,last_name:'lovelace'})).toBe('family');
 });
 test('no shared signal means no suggestion',()=>{
  expect(suggestRelationshipType(ada,{company_id:null,last_name:'Hopper'})).toBeNull();
  expect(suggestRelationshipType({company_id:null,last_name:null},{company_id:null,last_name:null})).toBeNull();
 });
});

describe('name guesses',()=>{
 test('linkedin slugs drop the id suffix',()=>{
  expect(nameFromSlug('ali-yilmaz-5b1a2c')).toEqual({first:'Ali',last:'Yilmaz'});
  expect(nameFromSlug('ali')).toBeNull();
 });
 test('email handles split on common separators',()=>{
  expect(nameFromEmail('ali.yilmaz@acme.com')).toEqual({first:'Ali',last:'Yilmaz'});
  expect(nameFromEmail('ali_yilmaz@acme.com')).toEqual({first:'Ali',last:'Yilmaz'});
  expect(nameFromEmail('info@acme.com')).toBeNull();
  expect(nameFromEmail('a1@acme.com')).toBeNull();
 });
 test('websites suggest a company name',()=>{
  expect(companyNameFromWebsite('https://www.acme-group.com/hakkimizda')).toBe('Acme Group');
  expect(companyNameFromWebsite('not a host')).toBeNull();
 });
});

describe('signature block parsing',()=>{
 const block=`Ali Yilmaz
Product Manager at Acme
ali.yilmaz@acme.com
+90 532 111 22 33
https://linkedin.com/in/ali-yilmaz-5b1a2c`;
 test('pulls every field out of a pasted block',()=>{
  expect(parseContactBlock(block)).toMatchObject({
   first:'Ali',last:'Yilmaz',
   jobTitle:'Product Manager',companyName:'Acme',
   email:'ali.yilmaz@acme.com',phone:'+90 532 111 22 33',
   linkedin:'https://linkedin.com/in/ali-yilmaz-5b1a2c',
  });
 });
 test('dates in the text are never mistaken for phones',()=>{
  expect(parseContactBlock('Met on 31.12.2024, call in 2025').phone).toBeUndefined();
 });
 test('empty text guesses nothing',()=>{
  expect(parseContactBlock('   ')).toEqual({});
 });
});
