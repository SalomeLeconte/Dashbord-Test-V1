import {getSession} from '../../_lib/auth.js';
import {runInseeBatch} from '../../_lib/insee-batch-sync.js';
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
export async function onRequestPost({request,env}){
 const session=await getSession(request,env);if(!session)return Response.json({ok:false,error:'Authentification requise.'},{status:401,headers});
 if(String(session.role||'').toLowerCase()!=='admin')return Response.json({ok:false,error:'Accès administrateur requis.'},{status:403,headers});
 try{const url=new URL(request.url);return Response.json(await runInseeBatch({env,forceNew:url.searchParams.get('new')==='1'}),{headers});}
 catch(error){return Response.json({ok:false,error:String(error?.message||error)},{status:409,headers});}
}
