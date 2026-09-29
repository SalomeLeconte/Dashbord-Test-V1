import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSireneUrl,normalizeEstablishment} from '../functions/_lib/insee.js';

test('buildSireneUrl scopes one NAF and department with pagination',()=>{
 const url=new URL(buildSireneUrl('43.12A','78',100,100));
 assert.equal(url.origin+url.pathname,'https://api.insee.fr/api-sirene/3.11/siret');
 assert.equal(url.searchParams.get('q'),'activitePrincipaleUniteLegale:43.12A AND codePostalEtablissement:78*');
 assert.equal(url.searchParams.get('nombre'),'100');
 assert.equal(url.searchParams.get('debut'),'100');
});

test('normalizeEstablishment keeps only active units and maps prospect fields',()=>{
 const row=normalizeEstablishment({siret:'12345678901234',siren:'123456789',etablissementSiege:true,uniteLegale:{etatAdministratifUniteLegale:'A',denominationUniteLegale:'TEST TP',activitePrincipaleUniteLegale:'43.12A',categorieEntreprise:'PME'},adresseEtablissement:{numeroVoieEtablissement:'12',typeVoieEtablissement:'RUE',libelleVoieEtablissement:'DES TESTS',codePostalEtablissement:'78100',libelleCommuneEtablissement:'TESTVILLE'}});
 assert.equal(row.siret,'12345678901234');
 assert.equal(row.department,'78');
 assert.equal(row.name,'TEST TP');
 assert.equal(row.active,1);
 assert.match(row.address,/78100/);
});
