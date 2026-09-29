import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchAllSirenePages} from '../functions/_lib/insee-pagination.js';

test('fetchAllSirenePages advances by 100 until total is covered',async()=>{
 const offsets=[];
 const fetchPage=async(_key,_naf,_dept,offset)=>{offsets.push(offset);return{total:250,items:Array.from({length:offset===200?50:100},(_,i)=>({siret:String(offset+i)}))};};
 const result=await fetchAllSirenePages('key','43.12A','78',fetchPage);
 assert.deepEqual(offsets,[0,100,200]);
 assert.equal(result.items.length,250);
 assert.equal(result.total,250);
});

test('fetchAllSirenePages stops after first page when total fits',async()=>{
 let calls=0;
 const fetchPage=async()=>{calls++;return{total:64,items:Array.from({length:64},(_,i)=>({siret:String(i)}))};};
 const result=await fetchAllSirenePages('key','43.12A','78',fetchPage);
 assert.equal(calls,1);
 assert.equal(result.items.length,64);
});
