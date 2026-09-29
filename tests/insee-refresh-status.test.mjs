import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshIsLocked} from '../functions/_lib/insee-refresh.js';
test('running refresh is locked while recent',()=>{assert.equal(refreshIsLocked({status:'running',started_at:1000},1000+10*60*1000),true)});
test('stale running refresh can recover',()=>{assert.equal(refreshIsLocked({status:'running',started_at:1000},1000+3*60*60*1000),false)});
test('completed refresh is not locked',()=>{assert.equal(refreshIsLocked({status:'success',started_at:1000},2000),false)});
