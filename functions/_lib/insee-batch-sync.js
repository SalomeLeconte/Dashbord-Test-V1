import {listUsers} from './auth.js';
import {commercialDepartmentsFromUsers} from './commercial-departments.js';
import {NAF_LIST,fetchSirenePage} from './insee.js';
import {upsertProspects} from './insee-sync.js';
import {createCursor,currentScope,advanceCursor} from './insee-batch-state.js';
import {MAX_BATCH_REQUESTS} from './insee-batch-config.js';
async function ensureTable(db){await db.prepare(`CREATE TABLE IF NOT EXISTS commercial_insee_batch (id INTEGER PRIMARY KEY, departments TEXT NOT NULL, nafs TEXT NOT NULL, cursor TEXT NOT NULL, status TEXT NOT NULL, updated_at INTEGER NOT NULL)`).run();}
async function loadState(db){await ensureTable(db);return db.prepare('SELECT * FROM commercial_insee_batch WHERE id=1').first();}
async function saveState(db,departments,nafs,cursor,status){await db.prepare(`INSERT INTO commercial_insee_batch(id,departments,nafs,cursor,status,updated_at) VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET departments=excluded.departments,nafs=excluded.nafs,cursor=excluded.cursor,status=excluded.status,updated_at=excluded.updated_at`).bind(JSON.stringify(departments),JSON.stringify(nafs),JSON.stringify(cursor),status,Date.now()).run();}
function isUpstreamPause(error){const message=String(error?.message||error);return /INSEE (429|500|502|503|504|520|521|522|523|524|525|526):/i.test(message)||/fetch failed|network|timeout/i.test(message);}
export async function runInseeBatch({env,forceNew=false}){
 const db=env.DB;if(!db||!env.INSEE_API_KEY)throw new Error('Bindings DB/INSEE_API_KEY manquants.');
 let state=await loadState(db),departments,nafs,cursor;
 if(forceNew||!state||state.status==='success'){
  departments=commercialDepartmentsFromUsers(await listUsers(env));if(!departments.length)throw new Error('Aucun département attribué à un commercial.');nafs=NAF_LIST;cursor=createCursor();await saveState(db,departments,nafs,cursor,'running');
 }else{departments=JSON.parse(state.departments);nafs=JSON.parse(state.nafs);cursor=JSON.parse(state.cursor);}
 let calls=0,writtenThisBatch=0;
 while(!cursor.done&&calls<MAX_BATCH_REQUESTS){
  const scope=currentScope(cursor,departments,nafs);if(!scope){cursor.done=true;break;}
  let page;
  try{page=await fetchSirenePage(env.INSEE_API_KEY,scope.naf,scope.department,scope.offset);}catch(error){if(isUpstreamPause(error)){await saveState(db,departments,nafs,cursor,'running');return{ok:true,status:'paused_upstream',hasMore:true,calls,written:writtenThisBatch,cursor,reason:String(error?.message||error)};}throw error;}
  const valid=page.items.filter(x=>x.department===scope.department);const written=await upsertProspects(db,valid);writtenThisBatch+=written;
  cursor=advanceCursor({...cursor,written:Number(cursor.written||0)+written},departments,nafs,page.total,valid.length);calls++;
  await saveState(db,departments,nafs,cursor,cursor.done?'success':'running');
 }
 return{ok:true,status:cursor.done?'success':'running',hasMore:!cursor.done,calls,written:writtenThisBatch,cursor,department:departments[cursor.departmentIndex]||null,naf:nafs[cursor.nafIndex]||null};
}
