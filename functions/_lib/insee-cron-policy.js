export function parisDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function shouldStartNewDailyCycle(lastCycleDate,now=new Date()){return String(lastCycleDate||'')!==parisDate(now);}
