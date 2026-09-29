import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSiret,knownSiretsFromRows} from '../functions/_lib/known-companies.js';

test('normalizes French SIRET values to 14 digits',()=>{
 assert.equal(normalizeSiret('732 829 320 00074'),'73282932000074');
 assert.equal(normalizeSiret('FR 73282932000074'),'73282932000074');
 assert.equal(normalizeSiret('123'),'');
});

test('extracts unique known SIRETs from dashboard rows',()=>{
 const rows=[{SIRET:'73282932000074'},{siret:'732 829 320 00074'},{Siret:'55210055400013'}];
 assert.deepEqual([...knownSiretsFromRows(rows)].sort(),['55210055400013','73282932000074']);
});
