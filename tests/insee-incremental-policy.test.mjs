import test from 'node:test';
import assert from 'node:assert/strict';
import {incrementalDateFrom} from '../functions/_lib/insee-incremental-policy.js';
test('initial load has no INSEE date filter',()=>assert.equal(incrementalDateFrom(null),''));
test('completed prior cycle resumes incrementally with one-day overlap',()=>assert.equal(incrementalDateFrom('2026-09-30'),'2026-09-29'));
