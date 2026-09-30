import {getSession} from '../../../_lib/auth.js';
import {markKnownProspects,digits} from '../../../_lib/commercial-known.js';
const headers={'Cache-Control':'private, no-store','Content-Type':'application/json; charset=utf-8'};
const out=(body,status=200)=>Response.json(body,{status,headers});
export async function onRequestPost({request,env}){
 const session=await getSession(request,env);if(!session)return out({error:'Authentification requise.'},401);
 if(String(session.role||'').toUpperCase()!=='COMMERCIAL')return out({error:'Accès commercial requis.'},403);
 if(!env.DB)return out({error:'Base de données indisponible.'},503);
 let body;try{body=await request.json()}catch{return out({error:'JSON invalide.'},400)}
 const raw=Array.isArray(body?.identities)?body.identities:[];if(raw.length>10000)return out({error:'Trop d’identifiants dans une seule synchronisation.'},413);
 const identities=raw.map(x=>({siret:digits(x?.siret),siren:digits(x?.siren)})).filter(x=>x.siret.length===14||x.siren.length===9);
 try{const changed=await markKnownProspects(env.DB,identities);return out({ok:true,received:identities.length,excluded:changed})}catch(error){console.error('Known commercial companies sync failed.',error);return out({error:'Synchronisation des entreprises connues impossible.'},500)}
}
