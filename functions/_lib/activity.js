import {getSession} from "./auth.js";
export async function logActivity(env,event,request,details={}){
 if(!env.DB)return;
 let session=null;try{session=await getSession(request,env)}catch{}
 const email=session?.username||details.email||null;
 const role=session?.role||details.role||null;
 const ua=(request.headers.get("User-Agent")||"").slice(0,500);
 const ip=request.headers.get("CF-Connecting-IP")||"";
 let ipHash=null;
 if(ip){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip));ipHash=[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
 await env.DB.prepare("INSERT INTO activity_log (event,email,role,path,ip_hash,user_agent,details,created_at) VALUES (?,?,?,?,?,?,?,?)")
  .bind(event,email,role,new URL(request.url).pathname,ipHash,ua,JSON.stringify(details||{}),Date.now()).run();
}
