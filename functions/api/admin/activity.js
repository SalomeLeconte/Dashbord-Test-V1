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

function parisDateKey(ms){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(ms));
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day;
}
function summarize(logins,days){
 const keys=new Set();const now=new Date();
 for(let i=0;i<days;i++)keys.add(parisDateKey(now.getTime()-i*86400000));
 const byUser=new Map();
 for(const e of logins){if(!keys.has(parisDateKey(Number(e.created_at))))continue;const email=e.email||"—",x=byUser.get(email)||{email,role:e.role||"—",count:0,lastLogin:0};x.count++;x.lastLogin=Math.max(x.lastLogin,Number(e.created_at));byUser.set(email,x)}
 return [...byUser.values()].sort((a,b)=>b.lastLogin-a.lastLogin);
}

function dailyInsights(logins,days=30){
 const keys=[];const now=Date.now();
 for(let i=days-1;i>=0;i--)keys.push(parisDateKey(now-i*86400000));
 const map=new Map(keys.map(key=>[key,{date:key,connections:0,users:new Map()}]));
 for(const e of logins){const day=map.get(parisDateKey(Number(e.created_at)));if(!day)continue;day.connections++;const email=e.email||"—",u=day.users.get(email)||{email,role:e.role||"—",count:0,lastLogin:0};u.count++;u.lastLogin=Math.max(u.lastLogin,Number(e.created_at));day.users.set(email,u)}
 return keys.map(key=>{const d=map.get(key),users=[...d.users.values()].sort((a,b)=>b.lastLogin-a.lastLogin);return{date:key,connections:d.connections,uniqueUsers:users.length,users}});
}

export async function onRequestGet({request,env}){
 const s=await getSession(request,env);
 if(s?.role!=="admin")return Response.json({error:"Accès administrateur requis."},{status:403,headers:{"Cache-Control":"no-store"}});
 if(!env.DB)return Response.json({error:"Base d'activité non configurée."},{status:503,headers:{"Cache-Control":"no-store"}});
 const url=new URL(request.url),limit=Math.min(Math.max(Number(url.searchParams.get("limit"))||200,1),1000);
 const r=await env.DB.prepare("SELECT id,event,email,role,path,user_agent,details,created_at FROM activity_log ORDER BY created_at DESC LIMIT ?").bind(limit).all();
 const events=r.results||[];
 const since=Date.now()-31*86400000;
 const lr=await env.DB.prepare("SELECT email,role,created_at FROM activity_log WHERE event = 'login_success' AND created_at >= ? ORDER BY created_at DESC").bind(since).all();
 const logins=lr.results||[];
 return Response.json({events,sessions:buildSessions(events),loginSummary:{today:summarize(logins,1),week:summarize(logins,7),month:summarize(logins,30)},dailyInsights:dailyInsights(logins,30)},{headers:{"Cache-Control":"no-store"}});
}
