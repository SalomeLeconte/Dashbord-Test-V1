import {getSession} from '../../_lib/auth.js';
import {fetchAllSirenePages} from '../../_lib/insee-pagination.js';
import {upsertProspects} from '../../_lib/insee-sync.js';
import {validateSyncRequest} from '../../_lib/insee-sync-request.js';
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
export async function onRequestPost({request,env}){
 const session=await getSession(request,env);
 if(!session)return Response.json({ok:false,error:'Authentification requise.'},{status:401,headers});
 if(String(session.role||'').toLowerCase()!=='admin')return Response.json({ok:false,error:'Accès administrateur requis.'},{status:403,headers});
 try{
  const scope=validateSyncRequest(await request.json());
  const result=await fetchAllSirenePages(env.INSEE_API_KEY,scope.naf,scope.department);
  const scoped=result.items.filter(p=>p.department===scope.department);
  const written=await upsertProspects(env.DB,scoped);
  return Response.json({ok:true,mode:'controlled-full-pagination',department:scope.department,naf:scope.naf,totalInsee:result.total,pages:result.pages,received:result.items.length,written},{headers});
 }catch(error){console.error('Controlled INSEE sync failed.',error);return Response.json({ok:false,error:String(error?.message||error)},{status:400,headers});}
}
