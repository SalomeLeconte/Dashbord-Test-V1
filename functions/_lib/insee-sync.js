export function normalizeDepartments(values=[]){return [...new Set(values.map(v=>String(v||'').trim().toUpperCase()).filter(v=>/^(?:\d{2}|2A|2B|97\d)$/.test(v)))].sort();}
export const prospectUpsertSql=`INSERT INTO commercial_prospects
(siret,siren,name,naf,activity_group,company_category,department,postal_code,city,address,workforce_code,workforce_label,is_headquarters,active,excluded_known,first_seen_at,last_seen_at,insee_updated_at,raw_updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(siret) DO UPDATE SET siren=excluded.siren,name=excluded.name,naf=excluded.naf,company_category=excluded.company_category,department=excluded.department,postal_code=excluded.postal_code,city=excluded.city,address=excluded.address,workforce_code=excluded.workforce_code,is_headquarters=excluded.is_headquarters,active=excluded.active,last_seen_at=excluded.last_seen_at,insee_updated_at=excluded.insee_updated_at,raw_updated_at=excluded.raw_updated_at`;
export async function upsertProspects(db,items,now=Date.now()){
 if(!db)throw new Error('Binding D1 DB manquant.');if(!items?.length)return 0;
 const statements=items.map(p=>db.prepare(prospectUpsertSql).bind(p.siret,p.siren||'',p.name||p.siret,p.naf||'',p.activityGroup||'',p.companyCategory||'',p.department||'',p.postalCode||'',p.city||'',p.address||'',p.workforceCode||'',p.workforceLabel||'',Number(p.isHeadquarters||0),Number(p.active!==0),0,now,now,now,p.rawUpdatedAt||''));
 for(let i=0;i<statements.length;i+=50)await db.batch(statements.slice(i,i+50));return statements.length;
}
