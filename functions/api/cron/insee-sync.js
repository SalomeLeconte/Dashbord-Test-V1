import {runCommercialInseeRefresh} from '../../_lib/insee-orchestrator.js';
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
export async function onRequestPost({request,env}){
 const supplied=request.headers.get('Authorization')||'';const expected=`Bearer ${env.INSEE_CRON_SECRET||''}`;
 if(!env.INSEE_CRON_SECRET||supplied!==expected)return Response.json({ok:false,error:'Non autorisé.'},{status:401,headers});
 try{return Response.json(await runCommercialInseeRefresh({request,env}),{headers});}catch(error){return Response.json({ok:false,error:String(error?.message||error)},{status:500,headers});}
}
