import {logActivity} from "../_lib/activity.js";
import {createSession,verifyUser,normalizeUsername} from "../_lib/auth.js";
const MAX_ATTEMPTS=5,BLOCK_SECONDS=15*60;
async function rateKey(request,username){const ip=request.headers.get("CF-Connecting-IP")||"unknown";const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip+":"+normalizeUsername(username)));return "login:"+[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function attempts(env,key){const raw=await env.LOGIN_RATE_LIMIT.get(key);if(!raw)return 0;try{return Number(JSON.parse(raw).count)||0}catch{return 0}}
export async function onRequestPost({request,env}){
 if(!env.LOGIN_RATE_LIMIT)return Response.json({error:"Stockage d'authentification non configuré."},{status:503});
 let body={};try{body=await request.json()}catch{}
 const username=normalizeUsername(body.username||"admin"),pin=String(body.pin||"");
 const key=await rateKey(request,username),count=await attempts(env,key);
 if(count>=MAX_ATTEMPTS)return Response.json({error:"Trop de tentatives. Réessayez dans 15 minutes."},{status:429,headers:{"Retry-After":String(BLOCK_SECONDS),"Cache-Control":"no-store"}});
 if(!/^\d{6,12}$/.test(pin))return Response.json({error:"PIN invalide."},{status:400,headers:{"Cache-Control":"no-store"}});
 const identity=await verifyUser(env,username,pin);
 if(!identity){const next=count+1;await env.LOGIN_RATE_LIMIT.put(key,JSON.stringify({count:next}),{expirationTtl:BLOCK_SECONDS});await logActivity(env,"login_failed",request,{email:username});const remaining=Math.max(0,MAX_ATTEMPTS-next);return Response.json({error:remaining?"Identifiant ou PIN incorrect. "+remaining+" tentative(s) restante(s).":"Trop de tentatives. Réessayez dans 15 minutes."},{status:remaining?401:429,headers:{"Cache-Control":"no-store"}})}
 await env.LOGIN_RATE_LIMIT.delete(key);
 await logActivity(env,"login_success",request,{email:identity.username,role:identity.role});
 return new Response(JSON.stringify({ok:true,role:identity.role}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store","Set-Cookie":await createSession(env,identity)}});
}