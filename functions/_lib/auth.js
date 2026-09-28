const COOKIE="__Host-dashboard_session";
const MAX_AGE=8*60*60;
const enc=new TextEncoder();
function hex(bytes){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sha256(v){return hex(await crypto.subtle.digest("SHA-256",enc.encode(String(v))))}
function cookie(req){const m=(req.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-dashboard_session=([^;]+)/);return m?.[1]||""}
async function signature(env){return sha256("dashboard:"+env.DASHBOARD_PIN)}
export async function authenticated(request,env){if(!/^\d{6,}$/.test(String(env.DASHBOARD_PIN||"")))return false;const value=cookie(request);return value&&value===await signature(env)}
export async function sessionCookie(env){return `${COOKIE}=${await signature(env)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`}
export function clearCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}
