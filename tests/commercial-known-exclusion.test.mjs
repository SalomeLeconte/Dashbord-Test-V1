import test from 'node:test';import assert from 'node:assert/strict';import {digits,knownIdentity} from '../functions/_lib/commercial-known.js';
test('normalizes French identifiers',()=>assert.equal(digits('123 456 789 00012'),'12345678900012'));
test('matches known establishment by SIRET first',()=>assert.equal(knownIdentity({siret:'12345678900012',siren:'123456789'},new Set(['12345678900012']),new Set()),true));
test('matches known company by SIREN',()=>assert.equal(knownIdentity({siret:'12345678999999',siren:'123456789'},new Set(),new Set(['123456789'])),true));
