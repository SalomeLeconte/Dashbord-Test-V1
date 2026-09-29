import {getSession} from '../../_lib/auth.js';
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
export async function onRequestGet({request,env}){
 const s=await getSession(request,env);if(!s)return Response.json({error:'Authentification requise.'},{status:401,headers});if(String(s.role||'').toLowerCase()!=='admin')return Response.json({error:'Accès administrateur requis.'},{status:403,headers});
 const row=await env.DB.prepare('SELECT * FROM commercial_prospect_refresh WHERE id=1').first();return Response.json({ok:true,refresh:row||null},{headers});
}
