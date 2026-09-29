import {NAF_LIST} from './insee.js';
import {normalizeDepartments} from './insee-sync.js';
export function validateSyncRequest(input={}){
 const department=normalizeDepartments([input.department])[0];
 const naf=String(input.naf||'').trim().toUpperCase();
 if(!department)throw new Error('Département invalide.');
 if(!NAF_LIST.includes(naf))throw new Error('Code NAF non autorisé.');
 return{department,naf};
}
