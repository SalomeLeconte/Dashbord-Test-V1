import {getSession} from "./_lib/auth.js";
import {isCronAuthorized} from './_lib/cron-auth.js';
const PUBLIC=new Set(["/login","/api/login"]);
function normalizeDept(value){const raw=String(value||"").trim().toUpperCase();return /^\d$/.test(raw)?"0"+raw:raw;}
function requestedDepartment(pathname){let m=pathname.match(/^\/data\/dept-([^/]+)\.csv$/i);if(m)return normalizeDept(decodeURIComponent(m[1]));m=pathname.match(/^\/data\/prepared\/dept-([^/.]+)(?:\.[a-f0-9]+)?\.json$/i);return m?normalizeDept(decodeURIComponent(m[1])):"";}
function forbidden(){return new Response(JSON.stringify({error:"Département non autorisé."}),{status:403,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store"}});}
export async function onRequest(context){
 const url=new URL(context.request.url);
 if(url.pathname==='/api/cron/insee-sync'&&isCronAuthorized(context.request.headers.get('Authorization'),context.env.INSEE_CRON_SECRET))return context.next();
 if(url.pathname.startsWith('/_server-data/')){const supplied=context.request.headers.get('X-Internal-Sync')||'';if(context.env.INSEE_CRON_SECRET&&supplied===context.env.INSEE_CRON_SECRET)return context.next();return new Response('Accès interdit.',{status:403,headers:{'Cache-Control':'private, no-store','Content-Type':'text/plain; charset=utf-8'}});}
 if(PUBLIC.has(url.pathname)||url.pathname.startsWith("/login-assets/"))return context.next();const session=await getSession(context.request,context.env);if(!session){if(url.pathname.startsWith("/api/"))return new Response(JSON.stringify({error:"Connexion requise."}),{status:401,headers:{"Content-Type":"application/json"}});return Response.redirect(new URL("/login",url),302);}
 const isCsv=url.pathname==="/data11.csv"||/^\/data\/dept-[^/]+\.csv$/i.test(url.pathname);if(isCsv)return new Response("Accès CSV désactivé.",{status:403,headers:{"Cache-Control":"private, no-store","Content-Type":"text/plain; charset=utf-8"}});
 if(url.pathname==="/data/prepared/manifest.json"&&session.role!=="admin"){const assetResponse=await context.next();if(!assetResponse.ok)return assetResponse;try{const manifest=await assetResponse.json();const allowed=new Set((Array.isArray(session.scope?.departments)?session.scope.departments:[]).map(normalizeDept).filter(Boolean));const departments={};for(const [key,value] of Object.entries(manifest.departments||{}))if(allowed.has(normalizeDept(key)))departments[key]=value;return Response.json({...manifest,departments},{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}catch{return forbidden()}}
 const dept=requestedDepartment(url.pathname);if(dept&&session.role!=="admin"){const allowed=new Set((Array.isArray(session.scope?.departments)?session.scope.departments:[]).map(normalizeDept).filter(Boolean));if(!allowed.has(dept))return forbidden();}return context.next();
}
