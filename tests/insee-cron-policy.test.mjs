import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldStartNewDailyCycle} from '../functions/_lib/insee-cron-policy.js';
test('starts new cycle once after Paris midnight',()=>{assert.equal(shouldStartNewDailyCycle(null,new Date('2026-09-29T22:00:00Z')),true)});
test('does not restart same Paris calendar day',()=>{assert.equal(shouldStartNewDailyCycle('2026-09-30',new Date('2026-09-30T10:00:00Z')),false)});
test('starts next Paris calendar day',()=>{assert.equal(shouldStartNewDailyCycle('2026-09-29',new Date('2026-09-29T22:00:00Z')),true)});
