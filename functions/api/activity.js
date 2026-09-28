import {getSession} from "../_lib/auth.js";

export async function onRequestPost({request,env}){
 const s=await getSession(request,env);
 if(!s)return Response.json({error:"Connexion requise."},{status:401,headers:{"Cache-Control":"no-store"}});
 if(!env.DB)return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
 const now=Date.now();
 try{
  const recent=await env.DB.prepare("SELECT created_at FROM activity_log WHERE event='heartbeat' AND email=? ORDER BY created_at DESC LIMIT 1").bind(s.username).first();
  if(!recent||now-Number(recent.created_at)>=25*60*1000){
   const ua=(request.headers.get("User-Agent")||"").slice(0,500);
   await env.DB.prepare("INSERT INTO activity_log (event,email,role,path,ip_hash,user_agent,details,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind("heartbeat",s.username,s.role,"/dashboard",null,ua,"{}",now).run();
  }
 }catch{}
 return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
}
