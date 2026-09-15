import nacl from 'tweetnacl';
import {fromBase64,toBase64} from '@/utils/format';

/**
 * Envelope crypto for anything that leaves the device (backups, shares, sync bundles).
 *
 * v1 (`NETWORKOS1`) derived its key from the device database key, which meant a backup could
 * only ever be opened by the phone that wrote it — useless for the case backups exist for.
 * v2 derives from a secret the user holds: the 160-bit recovery key, or a one-time share code.
 * Legacy v1 payloads stay readable so existing backups still restore on the original device.
 */
export const ENVELOPE_V3='NETWORKOS3';
export const ENVELOPE_V2='NETWORKOS2';
export const ENVELOPE_V1='NETWORKOS1';
const SALT_BYTES=16;
/** Cheap stretching. The recovery key already carries 160 bits, so this only blunts weak codes. */
const ITERATIONS=20000;

const utf8=(value:string)=>new TextEncoder().encode(value);
function concat(a:Uint8Array,b:Uint8Array){const out=new Uint8Array(a.length+b.length);out.set(a,0);out.set(b,a.length);return out}

export function deriveKey(secret:string,salt:Uint8Array){
 let digest=nacl.hash(concat(salt,utf8(secret)));
 for(let i=1;i<ITERATIONS;i++)digest=nacl.hash(concat(digest,salt));
 return digest.slice(0,32);
}

/**
 * Secrets are normalised before derivation, so `abcd-efgh` and `ABCDEFGH` open the same file —
 * the user copying a key by hand should never be defeated by a dash.
 */
export function seal(plaintext:Uint8Array,secret:string){
 const salt=nacl.randomBytes(SALT_BYTES);
 const nonce=nacl.randomBytes(nacl.secretbox.nonceLength);
 const box=nacl.secretbox(plaintext,nonce,deriveKey(normalizeSecret(secret),salt));
 return `${ENVELOPE_V2}.${toBase64(salt)}.${toBase64(nonce)}.${toBase64(box)}`;
}

export class EnvelopeError extends Error{constructor(public reason:'format'|'auth'){super(reason==='format'?'Unsupported NetworkOS envelope':'Envelope authentication failed')}}

/** `deviceKey` is only consulted for legacy v1 envelopes. */
export function open(envelope:string,secret:string,deviceKey?:string){
 const parts=envelope.trim().split('.');
 if(parts[0]===ENVELOPE_V2&&parts.length===4){
  const message=nacl.secretbox.open(fromBase64(parts[3]),fromBase64(parts[2]),deriveKey(normalizeSecret(secret),fromBase64(parts[1])));
  if(!message)throw new EnvelopeError('auth');
  return message;
 }
 if(parts[0]===ENVELOPE_V1&&parts.length===3){
  if(!deviceKey)throw new EnvelopeError('auth');
  const legacy=nacl.hash(utf8(deviceKey)).slice(0,32);
  const message=nacl.secretbox.open(fromBase64(parts[2]),fromBase64(parts[1]),legacy);
  if(!message)throw new EnvelopeError('auth');
  return message;
 }
 throw new EnvelopeError('format');
}

/**
 * v3 seals one chunk per table instead of one blob for the whole database. The key is derived
 * once from a shared salt, then each chunk gets its own nonce — so peak memory during an export
 * or restore is a single table rather than several copies of everything.
 *
 * Layout: `NETWORKOS3`, the salt, then one `name.nonce.ciphertext` line per chunk.
 */
export function sealChunks(chunks:Record<string,Uint8Array>,secret:string){
 const salt=nacl.randomBytes(SALT_BYTES);
 const key=deriveKey(normalizeSecret(secret),salt);
 const lines=[ENVELOPE_V3,toBase64(salt)];
 for(const [name,plaintext] of Object.entries(chunks)){
  const nonce=nacl.randomBytes(nacl.secretbox.nonceLength);
  lines.push(`${name}.${toBase64(nonce)}.${toBase64(nacl.secretbox(plaintext,nonce,key))}`);
 }
 return lines.join('\n');
}

export function openChunks(envelope:string,secret:string){
 const lines=envelope.trim().split('\n');
 if(lines[0]!==ENVELOPE_V3||lines.length<2)throw new EnvelopeError('format');
 const key=deriveKey(normalizeSecret(secret),fromBase64(lines[1]));
 const chunks:Record<string,Uint8Array>={};
 for(const line of lines.slice(2)){
  if(!line)continue;
  const index=line.indexOf('.');
  const parts=line.slice(index+1).split('.');
  if(index<0||parts.length!==2)throw new EnvelopeError('format');
  const message=nacl.secretbox.open(fromBase64(parts[1]),fromBase64(parts[0]),key);
  if(!message)throw new EnvelopeError('auth');
  chunks[line.slice(0,index)]=message;
 }
 return chunks;
}

export const isChunked=(envelope:string)=>envelope.trimStart().startsWith(`${ENVELOPE_V3}\n`);

/** Crockford base32 — no I/L/O/U, so a hand-copied key survives the usual transcription slips. */
const ALPHABET='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function encodeRecoveryKey(bytes:Uint8Array){
 let bits=0,value=0,out='';
 for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=ALPHABET[(value>>>(bits-5))&31];bits-=5}}
 if(bits>0)out+=ALPHABET[(value<<(5-bits))&31];
 return out.match(/.{1,4}/g)!.join('-');
}
export function generateRecoveryKey(){return encodeRecoveryKey(nacl.randomBytes(20))}
/** Accepts the key however the user pasted it: lowercase, spaced, with the classic O/0 and I/1 mix-ups. */
export function normalizeSecret(value:string){return value.trim().toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1').replace(/U/g,'V')}
export function isRecoveryKeyShaped(value:string){return /^[0-9A-Z]{32}$/.test(normalizeSecret(value))}
/** Short, spoken-aloud code for one-off contact shares. */
export function generateShareCode(){return encodeRecoveryKey(nacl.randomBytes(10))}
