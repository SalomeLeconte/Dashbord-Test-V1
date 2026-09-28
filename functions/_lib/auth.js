const COOKIE="__Host-dashboard_session";
const MAX_AGE=8*60*60;

function cookie(req){
 const m=(req.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-dashboard_session=([^;]+)/);
 return m?.[1]||"";
}
function randomToken(){
 const bytes=new Uint8Array(32);
 crypto.getRandomValues(bytes);
 return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function sessionKey(token){return "session:"+token}

export async function createSession(env){
 if(!env.LOGIN_RATE_LIMIT)throw new Error("Session storage unavailable");
 const token=randomToken();
 await env.LOGIN_RATE_LIMIT.put(sessionKey(token),JSON.stringify({createdAt:Date.now()}),{expirationTtl:MAX_AGE});
 return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}

export async function authenticated(request,env){
 if(!env.LOGIN_RATE_LIMIT)return false;
 const token=cookie(request);
 if(!/^[a-f0-9]{64}$/.test(token))return false;
 return Boolean(await env.LOGIN_RATE_LIMIT.get(sessionKey(token)));
}

export async function destroySession(request,env){
 const token=cookie(request);
 if(env.LOGIN_RATE_LIMIT&&/^[a-f0-9]{64}$/.test(token))await env.LOGIN_RATE_LIMIT.delete(sessionKey(token));
}

export function clearCookie(){
 return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
