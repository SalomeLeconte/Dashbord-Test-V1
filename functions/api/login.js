import {createSession} from "../_lib/auth.js";
const MAX_ATTEMPTS=5, BLOCK_SECONDS=15*60;
async function rateKey(request){
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip));
 return "login:"+[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function attempts(env,key){
 const raw=await env.LOGIN_RATE_LIMIT.get(key);
 if(!raw)return 0;
 try{return Number(JSON.parse(raw).count)||0}catch{return 0}
}
export async function onRequestPost({request,env}){
 if(!env.LOGIN_RATE_LIMIT)return Response.json({error:"Protection anti-bruteforce non configurée."},{status:503});
 const key=await rateKey(request), count=await attempts(env,key);
 if(count>=MAX_ATTEMPTS)return Response.json({error:"Trop de tentatives. Réessayez dans 15 minutes."},{status:429,headers:{"Retry-After":String(BLOCK_SECONDS),"Cache-Control":"no-store"}});
 let body={};try{body=await request.json()}catch{}
 const pin=String(body.pin||"");
 if(!/^\d{6,}$/.test(pin))return Response.json({error:"PIN invalide."},{status:400});
 if(!/^\d{6,}$/.test(String(env.DASHBOARD_PIN||"")))return Response.json({error:"Configuration du PIN absente."},{status:503});
 if(pin!==String(env.DASHBOARD_PIN)){
  const next=count+1;
  await env.LOGIN_RATE_LIMIT.put(key,JSON.stringify({count:next}),{expirationTtl:BLOCK_SECONDS});
  const remaining=Math.max(0,MAX_ATTEMPTS-next);
  return Response.json({error:remaining?"PIN incorrect. "+remaining+" tentative(s) restante(s).":"Trop de tentatives. Réessayez dans 15 minutes."},{status:remaining?401:429,headers:{"Cache-Control":"no-store"}});
 }
 await env.LOGIN_RATE_LIMIT.delete(key);
 return new Response(JSON.stringify({ok:true}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store","Set-Cookie":await createSession(env)}});
}
