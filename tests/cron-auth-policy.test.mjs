import test from 'node:test';
import assert from 'node:assert/strict';
import {isCronAuthorized} from '../functions/_lib/cron-auth.js';
test('accepts matching bearer secret',()=>assert.equal(isCronAuthorized('Bearer abc','abc'),true));
test('rejects missing or wrong bearer secret',()=>{assert.equal(isCronAuthorized('', 'abc'),false);assert.equal(isCronAuthorized('Bearer xyz','abc'),false)});
