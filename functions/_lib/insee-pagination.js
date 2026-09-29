import {fetchSirenePage,PAGE_SIZE} from './insee.js';
export async function fetchAllSirenePages(apiKey,naf,department,fetchPage=fetchSirenePage,dateFrom=''){
 const call=offset=>fetchPage===fetchSirenePage?fetchPage(apiKey,naf,department,offset,fetch,dateFrom):fetchPage(apiKey,naf,department,offset,dateFrom);
 const first=await call(0);const items=[...first.items];const total=Number(first.total||0);
 for(let offset=PAGE_SIZE;offset<total;offset+=PAGE_SIZE){const page=await call(offset);items.push(...page.items);}
 const unique=[...new Map(items.map(item=>[item.siret,item])).values()];return{total,items:unique,pages:Math.max(1,Math.ceil(total/PAGE_SIZE))};
}
