import test from 'node:test';
import assert from 'node:assert/strict';
import {commercialDepartmentsFromUsers} from '../functions/_lib/commercial-departments.js';

test('collects only departments assigned to commercial users',()=>{
 const users=[
  {role:'COMMERCIAL',scope:{departments:['78','60']}},
  {role:'PSSR',scope:{departments:['75']}},
  {role:'commercial',scope:{departments:['60','91']}}
 ];
 assert.deepEqual(commercialDepartmentsFromUsers(users),['60','78','91']);
});

test('ignores malformed department values',()=>{
 assert.deepEqual(commercialDepartmentsFromUsers([{role:'COMMERCIAL',scope:{departments:['78','FR','']}}]),['78']);
});
