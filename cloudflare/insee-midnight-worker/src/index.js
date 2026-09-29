function parisParts(date){const parts=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
export default{
 async scheduled(controller,env,ctx){
  const p=parisParts(new Date(controller.scheduledTime));
  if(p.hour!=='00')return;
  ctx.waitUntil(fetch(env.SYNC_URL,{method:'POST',headers:{Authorization:`Bearer ${env.INSEE_CRON_SECRET}`,'Content-Type':'application/json'}}).then(async r=>{if(!r.ok)throw new Error(`INSEE sync ${r.status}: ${await r.text()}`);}));
 }
};
