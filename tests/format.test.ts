jest.mock('expo-crypto',()=>({randomUUID:()=>'test'}));

import {ageOn,escapeLike,formatDate,nextAnniversary,normalizePhone,parseDateInput,relativeDate,relativeFuture,toDateInput} from '../src/utils/format';

const at=(y:number,m:number,d:number)=>new Date(y,m,d,12,0,0,0).getTime();

describe('date input',()=>{
 test('round-trips YYYY-MM-DD at local noon',()=>{
  const value=parseDateInput('1988-02-29')!;
  expect(toDateInput(value)).toBe('1988-02-29');
  expect(new Date(value).getHours()).toBe(12);
 });
 test('rejects impossible dates instead of rolling them over',()=>{
  expect(parseDateInput('2023-02-30')).toBeNull();
  expect(parseDateInput('2023-13-01')).toBeNull();
  expect(parseDateInput('01/02/2023')).toBeNull();
 });
});

describe('anniversaries',()=>{
 test('clamp 29 February to 28 February in a common year',()=>{
  const birthday=at(1988,1,29);
  const next=nextAnniversary(birthday,at(2023,0,1));
  expect(new Date(next).getMonth()).toBe(1);
  expect(new Date(next).getDate()).toBe(28);
 });
 test('roll to next year once the day has passed',()=>{
  const birthday=at(1990,2,10);
  expect(new Date(nextAnniversary(birthday,at(2024,5,1))).getFullYear()).toBe(2025);
 });
 test('keep today as today',()=>{
  const birthday=at(1990,5,15);
  expect(new Date(nextAnniversary(birthday,at(2024,5,15))).getFullYear()).toBe(2024);
 });
 test('report the age being reached',()=>{
  expect(ageOn(at(1990,0,1),at(2024,0,1))).toBe(34);
 });
});

describe('relative labels',()=>{
 test('speak the selected language',()=>{
  expect(relativeDate(null,'tr')).toBe('Henüz temas yok');
  expect(relativeDate(Date.now()-2*86400000,'en')).toBe('2 days ago');
  expect(relativeFuture(Date.now()+86400000*2,'tr')).toBe('2 gün içinde');
  expect(relativeFuture(Date.now()-86400000*3,'en')).toMatch(/overdue/);
 });
 test('format dates in the matching locale',()=>{
  expect(formatDate(at(2024,0,5),'en')).toMatch(/January/);
  expect(formatDate(null,'en')).toBe('');
 });
});

describe('search and phone normalisation',()=>{
 test('escape LIKE wildcards so a literal % cannot match everything',()=>{
  expect(escapeLike('100%_x')).toBe('100\\%\\_x');
 });
 test('strip formatting and a leading trunk zero',()=>{
  expect(normalizePhone('+90 (532) 111-22-33')).toBe('905321112233');
  expect(normalizePhone('0532 111 22 33')).toBe('5321112233');
  expect(normalizePhone('')).toBeUndefined();
 });
});
