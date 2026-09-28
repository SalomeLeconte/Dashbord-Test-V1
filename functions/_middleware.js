import {getSession} from "./_lib/auth.js";
const PUBLIC=new Set(["/login","/api/login"]);

function normalizeDept(value){
 const raw=String(value||"").trim().toUpperCase();
 return /^\d$/.test(raw)?"0"+raw:raw;
}
function requestedDepartment(pathname){
 let m=pathname.match(/^\/data\/dept-([^/]+)\.csv$/i);
 if(m)return normalizeDept(decodeURIComponent(m[1]));
 m=pathname.match(/^\/data\/prepared\/dept-([^/.]+)(?:\.[a-f0-9]+)?\.json$/i);
 return m?normalizeDept(decodeURIComponent(m[1])):"";
}
function forbidden(){
 return new Response(JSON.stringify({error:"Département non autorisé."}),{
  status:403,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store"}
 });
}

export async function onRequest(context){
 const url=new URL(context.request.url);
 if(PUBLIC.has(url.pathname)||url.pathname.startsWith("/login-assets/"))return context.next();

 const session=await getSession(context.request,context.env);
 if(!session){
  if(url.pathname.startsWith("/api/"))return new Response(JSON.stringify({error:"Connexion requise."}),{status:401,headers:{"Content-Type":"application/json"}});
  return Response.redirect(new URL("/login",url),302);
 }

 const isCsv=url.pathname==="/data11.csv"||/^\/data\/dept-[^/]+\.csv$/i.test(url.pathname);
 // CSV files are application data, never downloadable documents. Dashboard fetch/worker requests use non-document destinations.
 if(isCsv){
  const dest=(context.request.headers.get("Sec-Fetch-Dest")||"").toLowerCase();
  if(["document","iframe"].includes(dest))return new Response("Téléchargement CSV désactivé.",{status:403,headers:{"Cache-Control":"private, no-store","Content-Type":"text/plain; charset=utf-8"}});
 }

 const dept=requestedDepartment(url.pathname);
 if(dept&&session.role!=="admin"){
  const allowed=new Set((Array.isArray(session.scope?.departments)?session.scope.departments:[]).map(normalizeDept).filter(Boolean));
  if(!allowed.has(dept))return forbidden();
 }

 // The monolithic source contains every department and is admin-only.
 if(url.pathname==="/data11.csv"&&session.role!=="admin")return forbidden();

 return context.next();
}
