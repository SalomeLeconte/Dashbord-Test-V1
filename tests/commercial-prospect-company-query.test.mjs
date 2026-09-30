import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProspectQuery} from '../functions/_lib/commercial-prospect-query.js';

test('new prospects are grouped by SIREN with headquarters preferred',()=>{
 const q=buildProspectQuery(['78'],{page:'1',limit:'50'});
 assert.match(q.sql,/ROW_NUMBER\(\) OVER \(PARTITION BY siren/i);
 assert.match(q.sql,/is_headquarters DESC/i);
 assert.match(q.sql,/establishmentCount/i);
 assert.match(q.countSql,/COUNT\(DISTINCT siren\)/i);
});

test('SIRET search still searches establishments before company deduplication',()=>{
 const q=buildProspectQuery(['78'],{search:'21780498800129'});
 assert.match(q.sql,/siret LIKE \?/i);
 assert.equal(q.params.filter(x=>String(x).includes('21780498800129')).length>0,true);
});
