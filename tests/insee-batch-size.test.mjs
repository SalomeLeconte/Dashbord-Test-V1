import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_BATCH_REQUESTS} from '../functions/_lib/insee-batch-config.js';
test('scheduled INSEE batch stays small enough for Cloudflare free runtime',()=>{assert.equal(MAX_BATCH_REQUESTS,10);});
