import {sessionCookie} from "../_lib/auth.js";
export async function onRequestPost({request,env}){
 let body={};try{body=await request.json()}catch{}
 const pin=String(body.pin||"");
 if(!/^\d{6,}$/.test(pin))return Response.json({error:"PIN invalide."},{status:400});
 if(!/^\d{6,}$/.test(String(env.DASHBOARD_PIN||"")))return Response.json({error:"Configuration du PIN absente."},{status:503});
 if(pin!==String(env.DASHBOARD_PIN))return Response.json({error:"PIN incorrect."},{status:401});
 return new Response(JSON.stringify({ok:true}),{headers:{"Content-Type":"application/json","Set-Cookie":await sessionCookie(env)}});
}
