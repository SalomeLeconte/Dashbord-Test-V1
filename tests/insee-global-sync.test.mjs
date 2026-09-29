import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSyncScopes} from '../functions/_lib/insee-global-sync.js';

test('buildSyncScopes creates each unique department x NAF pair',()=>{
 const scopes=buildSyncScopes(['78','60','78'],['43.12A','42.11Z']);
 assert.equal(scopes.length,4);
 assert.deepEqual(scopes[0],{department:'60',naf:'43.12A'});
 assert.ok(scopes.some(x=>x.department==='78'&&x.naf==='42.11Z'));
});

test('buildSyncScopes ignores invalid departments and duplicate NAF codes',()=>{
 const scopes=buildSyncScopes(['FR','78'],['43.12A','43.12A']);
 assert.deepEqual(scopes,[{department:'78',naf:'43.12A'}]);
});
