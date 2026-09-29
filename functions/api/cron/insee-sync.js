import {runInseeBatch} from '../../_lib/insee-batch-sync.js';
import {parisDate,shouldStartNewDailyCycle} from '../../_lib/insee-cron-policy.js';
const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
async function ensureMeta(db){await db.prepare(`CREATE TABLE IF NOT EXISTS commercial_insee_cron (id INTEGER PRIMARY KEY,last_cycle_date TEXT,updated_at INTEGER NOT NULL)`).run();}
export async function onRequestPost({request,env}){
 const supplied=request.headers.get('Authorization')||'';const expected=`Bearer ${env.INSEE_CRON_SECRET||''}`;
 if(!env.INSEE_CRON_SECRET||supplied!==expected)return Response.json({ok:false,error:'Non autorisé.'},{status:401,headers});
 try{
  await ensureMeta(env.DB);const meta=await env.DB.prepare('SELECT * FROM commercial_insee_cron WHERE id=1').first();const now=new Date();const forceNew=shouldStartNewDailyCycle(meta?.last_cycle_date,now);
  const result=await runInseeBatch({env,forceNew});
  if(forceNew)await env.DB.prepare(`INSERT INTO commercial_insee_cron(id,last_cycle_date,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET last_cycle_date=excluded.last_cycle_date,updated_at=excluded.updated_at`).bind(parisDate(now),Date.now()).run();
  return Response.json({...result,cycleDate:parisDate(now),newCycle:forceNew},{headers});
 }catch(error){return Response.json({ok:false,error:String(error?.message||error)},{status:500,headers});}
}
