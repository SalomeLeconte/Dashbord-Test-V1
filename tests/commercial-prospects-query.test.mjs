import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProspectQuery} from '../functions/_lib/commercial-prospect-query.js';
test('commercial query is department scoped and paginated',()=>{const q=buildProspectQuery(['78'],{page:'2',limit:'50',search:'Mantes',city:'MANTES-LA-JOLIE'});assert.match(q.sql,/department IN \(\?\)/);assert.match(q.sql,/LIMIT \? OFFSET \?/);assert.deepEqual(q.params.slice(-2),[50,50]);});
test('limit is capped',()=>{const q=buildProspectQuery(['78'],{limit:'9999'});assert.equal(q.limit,100);});
