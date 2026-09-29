import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
function parseCSV(text){const rows=[];let row=[],field='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){field+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(field);if(row.some(v=>String(v).trim()))rows.push(row);row=[];field='';}else field+=c;}if(field.length||row.length){row.push(field);if(row.some(v=>String(v).trim()))rows.push(row);}return rows;}
function siret(v){const d=String(v??'').replace(/\D/g,'');return d.length===14?d:'';}
export async function run(context){
 const rows=parseCSV(readFileSync(join(context.rootDir,'data11.csv'),'utf8'));if(rows.length<2)throw new Error('Known SIRET index: data11.csv empty');
 const headers=rows[0].map(v=>String(v).replace(/^\ufeff/,'').trim());
 const candidates=['SIRET','siret','Siret','N° SIRET','Numero SIRET'];let idx=-1;for(const name of candidates){idx=headers.indexOf(name);if(idx>=0)break;}
 if(idx<0)throw new Error('Known SIRET index: SIRET column not found');
 const values=[...new Set(rows.slice(1).map(r=>siret(r[idx])).filter(Boolean))].sort();
 const dir=join(context.distDir,'_server-data');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'known-sirets.json'),JSON.stringify({version:1,count:values.length,sirets:values}),'utf8');
 console.log(`Known SIRET index: ${values.length} unique values`);
}
