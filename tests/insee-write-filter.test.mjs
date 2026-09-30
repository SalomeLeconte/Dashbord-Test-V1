import test from 'node:test';
import assert from 'node:assert/strict';
import {needsInseeWrite} from '../functions/_lib/insee-sync.js';
test('unchanged INSEE row is skipped',()=>{assert.equal(needsInseeWrite({raw_updated_at:'2026-09-30T01:00:00'},{rawUpdatedAt:'2026-09-30T01:00:00'}),false)});
test('changed INSEE row is written',()=>{assert.equal(needsInseeWrite({raw_updated_at:'2026-09-29T01:00:00'},{rawUpdatedAt:'2026-09-30T01:00:00'}),true)});
test('new INSEE row is written',()=>{assert.equal(needsInseeWrite(null,{rawUpdatedAt:'2026-09-30T01:00:00'}),true)});
