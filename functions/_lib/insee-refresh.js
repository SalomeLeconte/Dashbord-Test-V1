const LOCK_MS=2*60*60*1000;
export function refreshIsLocked(row,now=Date.now()){return row?.status==='running'&&Number(row.started_at||0)>now-LOCK_MS;}
export async function beginRefresh(db,now=Date.now()){
 const row=await db.prepare('SELECT * FROM commercial_prospect_refresh WHERE id=1').first();
 if(refreshIsLocked(row,now))throw new Error('Une synchronisation INSEE est déjà en cours.');
 await db.prepare("INSERT INTO commercial_prospect_refresh(id,started_at,completed_at,status,establishments_seen,error) VALUES(1,?,NULL,'running',0,NULL) ON CONFLICT(id) DO UPDATE SET started_at=excluded.started_at,completed_at=NULL,status='running',establishments_seen=0,error=NULL").bind(now).run();
 return now;
}
export async function progressRefresh(db,seen){await db.prepare('UPDATE commercial_prospect_refresh SET establishments_seen=? WHERE id=1').bind(Number(seen||0)).run();}
export async function finishRefresh(db,seen,now=Date.now()){await db.prepare("UPDATE commercial_prospect_refresh SET completed_at=?,status='success',establishments_seen=?,error=NULL WHERE id=1").bind(now,Number(seen||0)).run();}
export async function failRefresh(db,error,now=Date.now()){await db.prepare("UPDATE commercial_prospect_refresh SET completed_at=?,status='error',error=? WHERE id=1").bind(now,String(error?.message||error||'Erreur inconnue').slice(0,1000)).run();}
