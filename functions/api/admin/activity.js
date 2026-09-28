import {getSession} from "../../_lib/auth.js";
export async function onRequestGet({request,env}){
 const s=await getSession(request,env);
 if(s?.role!=="admin")return Response.json({error:"Accès administrateur requis."},{status:403,headers:{"Cache-Control":"no-store"}});
 if(!env.DB)return Response.json({error:"Base d'activité non configurée."},{status:503,headers:{"Cache-Control":"no-store"}});
 const url=new URL(request.url),limit=Math.min(Math.max(Number(url.searchParams.get("limit"))||200,1),1000);
 const r=await env.DB.prepare("SELECT id,event,email,role,path,user_agent,details,created_at FROM activity_log ORDER BY created_at DESC LIMIT ?").bind(limit).all();
 return Response.json({events:r.results||[]},{headers:{"Cache-Control":"no-store"}});
}