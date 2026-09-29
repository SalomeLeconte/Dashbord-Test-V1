import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSyncRequest} from '../functions/_lib/insee-sync-request.js';

test('controlled sync accepts one valid department and NAF',()=>{
 assert.deepEqual(validateSyncRequest({department:'78',naf:'43.12A'}),{department:'78',naf:'43.12A'});
});

test('controlled sync rejects invalid scope',()=>{
 assert.throws(()=>validateSyncRequest({department:'FR',naf:'*'}));
});
