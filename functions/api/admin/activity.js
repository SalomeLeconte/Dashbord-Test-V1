import {getSession} from "../../_lib/auth.js";

function buildSessions(events){
 const open=new Map(),sessions=[];
 for(const e of [...events].sort((a,b)=>Number(a.created_at)-Number(b.created_at))){
  const key=String(e.email||"");
  if(e.event==="login_success"){
   const previous=open.get(key);
   if(previous)sessions.push({...previous,end:null,durationMs:null,status:"active_or_expired"});
   open.set(key,{email:e.email,role:e.role,start:Number(e.created_at),lastActivity:Number(e.created_at),user_agent:e.user_agent});
  }else if(e.event==="heartbeat"&&open.has(key)){
   open.get(key).lastActivity=Number(e.created_at);
  }else if(e.event==="logout"&&open.has(key)){
   const start=open.get(key);open.delete(key);
   sessions.push({...start,end:Number(e.created_at),lastActivity:Number(e.created_at),durationMs:Math.max(0,Number(e.created_at)-start.start),status:"closed"});
  }
 }
 for(const start of open.values()){const active=Date.now()-Number(start.lastActivity||start.start)<=10*60*1000;sessions.push({...start,end:null,durationMs:Math.max(0,Number(start.lastActivity||start.start)-start.start),status:active?"active":"expired"});}
 return sessions.sort((a,b)=>b.start-a.start);
}

export async function onRequestGet({request,env}){
 const s=await getSession(request,env);
 if(s?.role!=="admin")return Response.json({error:"Accès administrateur requis."},{status:403,headers:{"Cache-Control":"no-store"}});
 if(!env.DB)return Response.json({error:"Base d'activité non configurée."},{status:503,headers:{"Cache-Control":"no-store"}});
 const url=new URL(request.url),limit=Math.min(Math.max(Number(url.searchParams.get("limit"))||200,1),1000);
 const r=await env.DB.prepare("SELECT id,event,email,role,path,user_agent,details,created_at FROM activity_log ORDER BY created_at DESC LIMIT ?").bind(limit).all();
 const events=r.results||[];
 return Response.json({events,sessions:buildSessions(events)},{headers:{"Cache-Control":"no-store"}});
}
