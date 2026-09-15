import {AppState} from 'react-native';

/**
 * Contacts marked private are hidden everywhere — lists, search, the graph, insights, CSV and
 * selective shares — until the vault is unlocked for the session.
 *
 * The gate is a module-level default-deny rather than a parameter threaded through every call
 * site: forgetting to pass a flag in one place would leak the very thing this exists to hide,
 * so the safe state is the one you get by doing nothing.
 */
let unlocked=false;
const listeners=new Set<(value:boolean)=>void>();

AppState.addEventListener('change',state=>{if(state==='background')VaultService.lock()});

export const VaultService={
 isUnlocked:()=>unlocked,
 unlock(){if(!unlocked){unlocked=true;listeners.forEach(fn=>fn(true))}},
 lock(){if(unlocked){unlocked=false;listeners.forEach(fn=>fn(false))}},
 subscribe(fn:(value:boolean)=>void){listeners.add(fn);return()=>{listeners.delete(fn)}},
 /** `AND c.private=0` unless the vault is open. Prefixed so it can be dropped into any query. */
 clause(alias='c'){return unlocked?'':` AND ${alias}.private=0`},
};
