import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { transform as dedupeTop200BeforeRanking } from './perf-transforms/p0-50-top200-dedupe-before-ranking.mjs';
import { transform as removeDetailCommercialPotential } from './perf-transforms/p0-61-remove-detail-commercial-potential.mjs';
import { transform as pruneDeadUi } from './perf-transforms/p0-99-prune-dead-ui.mjs';

const rootDir = process.cwd();
const dashboardPath = join(rootDir, 'dashboard-wip.html');
const source = readFileSync(dashboardPath, 'utf8');
let dashboardHtml = dedupeTop200BeforeRanking({ dashboardHtml: source }).dashboardHtml;
dashboardHtml = removeDetailCommercialPotential({ dashboardHtml }).dashboardHtml;
dashboardHtml = pruneDeadUi({ dashboardHtml }).dashboardHtml;

// Ville v5 : le champ ne doit plus déclencher le pipeline global runFilter() à chaque frappe.
// Le runtime dédié travaille sur un snapshot déjà filtré par les autres critères.
dashboardHtml = dashboardHtml.replace(
  /(<input\s+type="text"\s+id="f-ville")\s+oninput="runFilter\(\)"/,
  '$1'
);

const runtimePattern = /<script src="\.\/wip-runtime\.bundle\.js[^\"]*"><\/script>/;
if (!runtimePattern.test(dashboardHtml)) {
  throw new Error('Branch Pages source: runtime bundle marker missing');
}
dashboardHtml = dashboardHtml.replace(
  runtimePattern,
  '<script src="./wip-runtime.bundle.js?v=20260907-branch-pages-v2&fix=city-local-v5-route-scroll-v2-labels-fr-v1"></script>'
);

const forbidden = [
  'f-canton-select',
  'acc-undercarriage',
  'patchCantonInProgress',
  'Menu déroulant canton en cours de développement',
  'Filtre non fonctionnel',
  'Filtre à venir',
  'title: "Potentiel commercial"',
  "title:'Potentiel commercial'",
  "sectionV25('Potentiel commercial'",
  'sectionV25("Potentiel commercial"'
];
for (const marker of forbidden) {
  if (dashboardHtml.includes(marker)) throw new Error(`Branch Pages source still contains forbidden marker: ${marker}`);
}
if (!dashboardHtml.includes('function dedupeTop200ScopeBeforeRanking(items)')) {
  throw new Error('Branch Pages source: pre-ranking SIRET dedupe helper missing');
}
if (!dashboardHtml.includes('const scope = dedupeTop200ScopeBeforeRanking(')) {
  throw new Error('Branch Pages source: Top 200 still ranks duplicate SIRET rows');
}
if (!dashboardHtml.includes('3. Potentiel commercial')) {
  throw new Error('Branch Pages source: commercial potential filter was removed unexpectedly');
}
if (/id="f-ville"[^>]*oninput="runFilter\(\)"/.test(dashboardHtml)) {
  throw new Error('Branch Pages source: Ville still triggers global runFilter on input');
}

writeFileSync(dashboardPath, dashboardHtml, 'utf8');
console.log('Materialized branch-compatible dashboard with local Ville filtering, route status removed, route panel capped to map height, pre-ranking SIRET dedupe and no commercial-potential Details section.');
