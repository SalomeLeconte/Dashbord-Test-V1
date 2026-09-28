const COOKIE="__Host-dashboard_session";
const MAX_AGE=8*60*60;
const enc=new TextEncoder();

function cookie(req){const m=(req.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-dashboard_session=([^;]+)/);return m?.[1]||""}
function randomHex(bytes=32){const b=new Uint8Array(bytes);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,"0")).join("")}
function sessionKey(token){return "session:"+token}
export function normalizeUsername(v){return String(v||"").trim().toLowerCase()}
export function validUsername(v){return /^[a-z0-9._-]{3,40}$/.test(normalizeUsername(v))}
function userKey(v){return "user:"+normalizeUsername(v)}
function hex(bytes){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function pbkdf2(pin,salt){
 const key=await crypto.subtle.importKey("raw",enc.encode(pin),"PBKDF2",false,["deriveBits"]);
 return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(salt),iterations:150000},key,256));
}
export async function createUser(env,username,pin){
 username=normalizeUsername(username);
 if(!validUsername(username))throw new Error("Identifiant invalide.");
 if(!/^\d{6,12}$/.test(String(pin||"")))throw new Error("Le PIN doit contenir 6 à 12 chiffres.");
 if(username==="admin")throw new Error("Identifiant réservé.");
 if(await env.LOGIN_RATE_LIMIT.get(userKey(username)))throw new Error("Cet utilisateur existe déjà.");
 const salt=randomHex(16),hash=await pbkdf2(String(pin),salt);
 await env.LOGIN_RATE_LIMIT.put(userKey(username),JSON.stringify({username,salt,hash,role:"user",createdAt:Date.now()}));
 return {username,role:"user"};
}
export async function verifyUser(env,username,pin){
 username=normalizeUsername(username);
 if(username==="admin")return String(pin)===String(env.DASHBOARD_PIN||"")?{username:"admin",role:"admin"}:null;
 if(!validUsername(username))return null;
 const raw=await env.LOGIN_RATE_LIMIT.get(userKey(username));if(!raw)return null;
 try{const u=JSON.parse(raw);return (await pbkdf2(String(pin),u.salt))===u.hash?{username:u.username,role:u.role||"user"}:null}catch{return null}
}
export async function listUsers(env){
 const out=[];let cursor;
 do{const r=await env.LOGIN_RATE_LIMIT.list({prefix:"user:",cursor});for(const k of r.keys){const raw=await env.LOGIN_RATE_LIMIT.get(k.name);if(raw)try{const u=JSON.parse(raw);out.push({username:u.username,role:u.role||"user",createdAt:u.createdAt||null})}catch{}}cursor=r.list_complete?undefined:r.cursor}while(cursor);
 return out.sort((a,b)=>a.username.localeCompare(b.username));
}
export async function deleteUser(env,username){username=normalizeUsername(username);if(username==="admin")throw new Error("Le compte admin ne peut pas être supprimé.");await env.LOGIN_RATE_LIMIT.delete(userKey(username))}
export async function resetUserPin(env,username,pin){
 username=normalizeUsername(username);if(username==="admin")throw new Error("Modifiez DASHBOARD_PIN dans Cloudflare pour le compte admin.");
 const raw=await env.LOGIN_RATE_LIMIT.get(userKey(username));if(!raw)throw new Error("Utilisateur introuvable.");
 if(!/^\d{6,12}$/.test(String(pin||"")))throw new Error("Le PIN doit contenir 6 à 12 chiffres.");
 const u=JSON.parse(raw),salt=randomHex(16);u.salt=salt;u.hash=await pbkdf2(String(pin),salt);u.pinChangedAt=Date.now();
 await env.LOGIN_RATE_LIMIT.put(userKey(username),JSON.stringify(u));
}
export async function createSession(env,identity){
 const token=randomHex(32);await env.LOGIN_RATE_LIMIT.put(sessionKey(token),JSON.stringify({createdAt:Date.now(),username:identity.username,role:identity.role}),{expirationTtl:MAX_AGE});
 return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}
export async function getSession(request,env){
 if(!env.LOGIN_RATE_LIMIT)return null;const token=cookie(request);if(!/^[a-f0-9]{64}$/.test(token))return null;
 const raw=await env.LOGIN_RATE_LIMIT.get(sessionKey(token));if(!raw)return null;try{return JSON.parse(raw)}catch{return null}
}
export async function authenticated(request,env){return Boolean(await getSession(request,env))}
export async function destroySession(request,env){const token=cookie(request);if(env.LOGIN_RATE_LIMIT&&/^[a-f0-9]{64}$/.test(token))await env.LOGIN_RATE_LIMIT.delete(sessionKey(token))}
export function clearCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}
