import {getSession} from "../_lib/auth.js";
export async function onRequestGet({request,env}){
 const s=await getSession(request,env);
 if(!s)return Response.json({error:"Connexion requise."},{status:401,headers:{"Cache-Control":"no-store"}});
 return Response.json({email:s.username,role:s.role,scope:s.scope||{}},{headers:{"Cache-Control":"no-store"}});
}