export function normalizeSiret(value){
 const digits=String(value??'').replace(/\D/g,'');
 return digits.length===14?digits:'';
}
export function knownSiretsFromRows(rows=[]){
 const out=new Set();
 for(const row of rows){
  const value=row?.SIRET??row?.siret??row?.Siret??row?.['N° SIRET']??row?.['Numero SIRET'];
  const siret=normalizeSiret(value);if(siret)out.add(siret);
 }
 return out;
}
export async function markKnownProspects(db,sirets=[]){
 const values=[...new Set([...sirets].map(normalizeSiret).filter(Boolean))];
 await db.prepare('UPDATE commercial_prospects SET excluded_known=0').run();
 let marked=0;
 for(let i=0;i<values.length;i+=50){
  const batch=values.slice(i,i+50).map(siret=>db.prepare('UPDATE commercial_prospects SET excluded_known=1 WHERE siret=?').bind(siret));
  const result=await db.batch(batch);marked+=result.reduce((n,r)=>n+Number(r?.meta?.changes||0),0);
 }
 return{known:values.length,marked};
}
