import test from 'node:test';
import assert from 'node:assert/strict';
import {prospectUpsertSql,normalizeDepartments} from '../functions/_lib/insee-sync.js';

test('normalizeDepartments keeps valid unique French department codes',()=>{
 assert.deepEqual(normalizeDepartments(['78','78',' 60 ','x','971']),['60','78','971']);
});

test('prospect upsert preserves first_seen and refreshes mutable INSEE fields',()=>{
 assert.match(prospectUpsertSql,/ON CONFLICT\(siret\) DO UPDATE/);
 assert.doesNotMatch(prospectUpsertSql,/first_seen_at\s*=\s*excluded/i);
 assert.match(prospectUpsertSql,/last_seen_at\s*=\s*excluded\.last_seen_at/i);
});
