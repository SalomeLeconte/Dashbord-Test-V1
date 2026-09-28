import {clearCookie,destroySession} from "../_lib/auth.js";

export async function onRequestPost({request,env}){
 await destroySession(request,env);
 return new Response(JSON.stringify({ok:true}),{
  headers:{
   "Content-Type":"application/json",
   "Cache-Control":"no-store",
   "Set-Cookie":clearCookie()
  }
 });
}
