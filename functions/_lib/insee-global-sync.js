import {NAF_LIST} from './insee.js';
import {normalizeDepartments,upsertProspects} from './insee-sync.js';
import {fetchAllSirenePages} from './insee-pagination.js';

export function buildSyncScopes(departments,nafs=NAF_LIST){
 const deps=normalizeDepartments(departments);
 const codes=[...new Set((nafs||[]).map(v=>String(v||'').trim().toUpperCase()).filter(v=>NAF_LIST.includes(v)))];
 return deps.flatMap(department=>codes.map(naf=>({department,naf})));
}

export async function syncScopes({db,apiKey,departments,nafs=NAF_LIST,onProgress}){
 const scopes=buildSyncScopes(departments,nafs);let seen=0,written=0,completed=0;
 for(const scope of scopes){
  const result=await fetchAllSirenePages(apiKey,scope.naf,scope.department);
  const items=result.items.filter(p=>p.department===scope.department);
  // Anything previously known in this exact scope is stale until observed again.
  await db.prepare('UPDATE commercial_prospects SET active=0 WHERE department=? AND naf=?').bind(scope.department,scope.naf).run();
  seen+=items.length;written+=await upsertProspects(db,items);completed++;
  if(onProgress)await onProgress({scope,completed,totalScopes:scopes.length,seen,written});
 }
 return{scopes:scopes.length,completed,seen,written};
}
