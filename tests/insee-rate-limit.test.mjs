import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchSirenePage} from '../functions/_lib/insee.js';

test('fetchSirenePage retries a 429 response and then succeeds',async()=>{
 let calls=0;
 const fetchImpl=async()=>{
  calls++;
  if(calls===1)return new Response(JSON.stringify({message:'Rate limit exceeded!'}),{status:429,headers:{'Retry-After':'0'}});
  return new Response(JSON.stringify({header:{total:0},etablissements:[]}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const result=await fetchSirenePage('key','43.12A','78',0,fetchImpl,'',async()=>{});
 assert.equal(calls,2);
 assert.deepEqual(result,{total:0,items:[]});
});
