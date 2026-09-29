import {getSession} from '../../_lib/auth.js';
import {fetchSirenePage} from '../../_lib/insee.js';
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
export async function onRequestGet({request,env}){
 const session=await getSession(request,env);if(!session)return Response.json({ok:false,error:'Authentification requise.'},{status:401,headers});
 if(String(session.role||'').toUpperCase()!=='ADMIN')return Response.json({ok:false,error:'Accès administrateur requis.'},{status:403,headers});
 try{const page=await fetchSirenePage(env.INSEE_API_KEY,'43.12A','78',0);return Response.json({ok:true,message:'Connexion INSEE opérationnelle.',sampleCount:page.items.length,total:page.total},{headers});}
 catch(error){console.error('INSEE connection test failed.',error);return Response.json({ok:false,error:String(error?.message||error)},{status:502,headers});}
}
