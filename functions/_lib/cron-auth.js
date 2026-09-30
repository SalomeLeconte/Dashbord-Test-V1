export function isCronAuthorized(authorization,secret){return Boolean(secret)&&String(authorization||'')===`Bearer ${secret}`;}
