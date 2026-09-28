import {authenticated} from "./_lib/auth.js";
const PUBLIC=new Set(["/login","/api/login"]);
export async function onRequest(context){
 const url=new URL(context.request.url);
 if(PUBLIC.has(url.pathname)||url.pathname.startsWith("/login-assets/")) return context.next();
 if(await authenticated(context.request,context.env)) return context.next();
 if(url.pathname.startsWith("/api/")) return new Response(JSON.stringify({error:"Connexion requise."}),{status:401,headers:{"Content-Type":"application/json"}});
 return Response.redirect(new URL("/login",url),302);
}
