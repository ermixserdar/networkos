jest.mock('expo-crypto',()=>({randomUUID:()=>`test-${Math.random()}`}));

import {EnvelopeError,encodeRecoveryKey,generateRecoveryKey,generateShareCode,isChunked,isRecoveryKeyShaped,normalizeSecret,open,openChunks,seal,sealChunks} from '../src/utils/crypto';
import {fromBase64,toBase64} from '../src/utils/format';

const bytes=(text:string)=>new TextEncoder().encode(text);
const text=(value:Uint8Array)=>new TextDecoder().decode(value);

describe('envelope crypto',()=>{
 test('round-trips with the same secret',()=>{
  const key=generateRecoveryKey();
  const envelope=seal(bytes('{"hello":"world"}'),key);
  expect(envelope.startsWith('NETWORKOS2.')).toBe(true);
  expect(text(open(envelope,key))).toBe('{"hello":"world"}');
 });

 test('rejects a wrong secret without leaking plaintext',()=>{
  const envelope=seal(bytes('secret'),generateRecoveryKey());
  expect(()=>open(envelope,generateRecoveryKey())).toThrow(EnvelopeError);
  try{open(envelope,generateRecoveryKey())}catch(error){expect((error as EnvelopeError).reason).toBe('auth')}
 });

 test('rejects anything that is not a NetworkOS envelope',()=>{
  expect(()=>open('not-an-envelope','key')).toThrow(/Unsupported/);
 });

 test('a differently formatted key still opens the file',()=>{
  const key=generateRecoveryKey();
  const envelope=seal(bytes('payload'),key);
  expect(text(open(envelope,key.replace(/-/g,'').toLowerCase()))).toBe('payload');
 });

 test('uses a fresh salt and nonce per envelope',()=>{
  const key=generateRecoveryKey();
  expect(seal(bytes('same'),key)).not.toBe(seal(bytes('same'),key));
 });

 test('a legacy v1 envelope is unreadable without the device key',()=>{
  expect(()=>open('NETWORKOS1.AAAA.BBBB','anything')).toThrow(EnvelopeError);
 });
});

describe('recovery keys',()=>{
 test('are 160 bits in Crockford base32',()=>{
  const key=generateRecoveryKey();
  expect(key).toMatch(/^([0-9A-HJ-KM-NP-TV-Z]{4}-){7}[0-9A-HJ-KM-NP-TV-Z]{4}$/);
  expect(isRecoveryKeyShaped(key)).toBe(true);
 });
 test('normalise the characters people confuse when copying by hand',()=>{
  expect(normalizeSecret('o0-il1-u v')).toBe('00111VV');
 });
 test('encode deterministically',()=>{
  expect(encodeRecoveryKey(new Uint8Array([0,0,0,0,0]))).toBe('0000-0000');
 });
 test('share codes are shorter than recovery keys',()=>{
  expect(normalizeSecret(generateShareCode()).length).toBeLessThan(normalizeSecret(generateRecoveryKey()).length);
 });
});

describe('base64 helpers',()=>{
 test('survive payloads larger than the argument limit of String.fromCharCode',()=>{
  // The selective-share path used a plain spread here and blew the stack on real exports.
  const large=new Uint8Array(300_000).map((_,i)=>i%256);
  expect(fromBase64(toBase64(large))).toEqual(large);
 });
});

describe('chunked envelopes',()=>{
 test('seal and open each table independently',()=>{
  const key=generateRecoveryKey();
  const envelope=sealChunks({__meta:bytes('{"version":3}'),contacts:bytes('[1,2]'),tags:bytes('[]')},key);
  expect(isChunked(envelope)).toBe(true);
  const chunks=openChunks(envelope,key);
  expect(text(chunks.contacts)).toBe('[1,2]');
  expect(text(chunks.__meta)).toBe('{"version":3}');
 });

 test('reject the wrong secret',()=>{
  const envelope=sealChunks({contacts:bytes('[]')},generateRecoveryKey());
  expect(()=>openChunks(envelope,generateRecoveryKey())).toThrow(EnvelopeError);
 });

 test('are distinguishable from the single-blob format',()=>{
  expect(isChunked(seal(bytes('x'),'ABCD-EFGH'))).toBe(false);
 });

 test('give every chunk its own nonce',()=>{
  const envelope=sealChunks({a:bytes('same'),b:bytes('same')},'ABCD-EFGH');
  const [,,first,second]=envelope.split('\n');
  expect(first.split('.')[2]).not.toBe(second.split('.')[2]);
 });
});
