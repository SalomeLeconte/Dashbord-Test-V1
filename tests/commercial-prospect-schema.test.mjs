import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../migrations/0002_commercial_prospects.sql',import.meta.url),'utf8');

test('commercial prospect migration contains security and refresh fields',()=>{
 for(const field of ['siret TEXT PRIMARY KEY','department TEXT NOT NULL','excluded_known INTEGER NOT NULL','first_seen_at INTEGER NOT NULL','last_seen_at INTEGER NOT NULL','commercial_prospect_refresh']){
  assert.ok(sql.includes(field),`missing ${field}`);
 }
});
