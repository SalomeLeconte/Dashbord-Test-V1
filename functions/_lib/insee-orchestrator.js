import {listUsers} from './auth.js';
import {commercialDepartmentsFromUsers} from './commercial-departments.js';
import {syncScopes} from './insee-global-sync.js';
import {markKnownProspects} from './known-companies.js';
import {beginRefresh,progressRefresh,finishRefresh,failRefresh} from './insee-refresh.js';
async function loadKnownSirets(request,env){
 const url=new URL('/_server-data/known-sirets.json',request.url);
 const res=await env.ASSETS.fetch(new Request(url,{headers:{'X-Internal-INSEE-Sync':'1'}}));
 if(!res.ok)throw new Error('Index SIRET connus indisponible.');
 const data=await res.json();return Array.isArray(data.sirets)?data.sirets:[];
}
export async function runCommercialInseeRefresh({request,env}){
 if(!env.DB||!env.INSEE_API_KEY)throw new Error('Bindings DB/INSEE_API_KEY manquants.');
 await beginRefresh(env.DB);
 try{
  const users=await listUsers(env);const departments=commercialDepartmentsFromUsers(users);
  if(!departments.length)throw new Error('Aucun département attribué à un commercial.');
  const sync=await syncScopes({db:env.DB,apiKey:env.INSEE_API_KEY,departments,onProgress:p=>progressRefresh(env.DB,p.seen)});
  const known=await loadKnownSirets(request,env);const exclusion=await markKnownProspects(env.DB,known);
  await finishRefresh(env.DB,sync.seen);
  return{ok:true,departments,sync,exclusion};
 }catch(error){await failRefresh(env.DB,error);throw error;}
}
