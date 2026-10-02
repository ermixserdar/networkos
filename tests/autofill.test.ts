jest.mock('expo-crypto',()=>({randomUUID:()=>'test'}));

import {companyIdForEmail,countryForPhone,emailDomain,hostOf,normalizeEmail,suggestRelationshipType} from '../src/utils/autofill';

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
