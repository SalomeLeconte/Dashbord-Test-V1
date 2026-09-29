import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSireneUrl,normalizeEstablishment} from '../functions/_lib/insee.js';
test('incremental query adds last-treatment date range',()=>{const u=new URL(buildSireneUrl('43.12A','78',0,100,'2026-09-28'));assert.match(u.searchParams.get('q'),/dateDernierTraitementEtablissement:\[2026-09-28T00:00:00 TO \*\]/)});
test('closed establishment remains syncable but inactive',()=>{const p=normalizeEstablishment({siret:'12345678901234',siren:'123456789',etatAdministratifEtablissement:'F',uniteLegale:{etatAdministratifUniteLegale:'A',activitePrincipaleUniteLegale:'43.12A'},adresseEtablissement:{codePostalEtablissement:'78000'}});assert.equal(p.active,0)});
