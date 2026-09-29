import test from 'node:test';
import assert from 'node:assert/strict';
import {createCursor,advanceCursor} from '../functions/_lib/insee-batch-state.js';
const deps=['60','78'],nafs=['42.11Z','43.12A'];
test('new cursor starts at first scope',()=>{assert.deepEqual(createCursor(deps,nafs),{departmentIndex:0,nafIndex:0,offset:0,seen:0,written:0,requests:0})});
test('non-final page advances offset',()=>{assert.equal(advanceCursor(createCursor(deps,nafs),deps,nafs,250,100).offset,100)});
test('final page advances NAF and resets offset',()=>{const c=advanceCursor(createCursor(deps,nafs),deps,nafs,50,50);assert.equal(c.nafIndex,1);assert.equal(c.offset,0)});
test('last NAF advances department',()=>{const c={...createCursor(deps,nafs),nafIndex:1};const n=advanceCursor(c,deps,nafs,0,0);assert.equal(n.departmentIndex,1);assert.equal(n.nafIndex,0)});
test('last scope marks done',()=>{const c={...createCursor(deps,nafs),departmentIndex:1,nafIndex:1};assert.equal(advanceCursor(c,deps,nafs,0,0).done,true)});
