import {getSession} from "../../_lib/auth.js";

const headers={"Cache-Control":"private, no-store","Content-Type":"application/json; charset=utf-8"};
const normalizeDept=v=>String(v||"").trim().toUpperCase();

export async function onRequestGet({request,env}){
 const session=await getSession(request,env);
 if(!session)return Response.json({error:"Authentification requise."},{status:401,headers});
 if(String(session.role||"").toUpperCase()!=="COMMERCIAL")return Response.json({error:"Accès commercial requis."},{status:403,headers});
 const departments=[...new Set((Array.isArray(session.scope?.departments)?session.scope.departments:[]).map(normalizeDept).filter(Boolean))];
 if(!departments.length)return Response.json({departments:[],prospects:[],refreshStatus:"no_scope"},{headers});
 if(!env.DB)return Response.json({departments,prospects:[],refreshStatus:"database_not_configured"},{headers});
 try{
  const placeholders=departments.map(()=>"?").join(",");
  const sql=`SELECT siret,siren,name,naf,activity_group AS activityGroup,company_category AS companyCategory,department,city,workforce_label AS workforceLabel,first_seen_at AS firstSeenAt,is_headquarters AS isHeadquarters FROM commercial_prospects WHERE active=1 AND department IN (${placeholders}) AND excluded_known=0 ORDER BY first_seen_at DESC,name ASC LIMIT 10000`;
  const result=await env.DB.prepare(sql).bind(...departments).all();
  return Response.json({departments,prospects:result.results||[],refreshStatus:"ready"},{headers});
 }catch(error){
  console.error("Commercial prospects dataset unavailable.",error);
  return Response.json({departments,prospects:[],refreshStatus:"not_initialized"},{headers});
 }
}
