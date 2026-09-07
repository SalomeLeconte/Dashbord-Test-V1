import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { transform as dedupeTop200BeforeRanking } from './perf-transforms/p0-50-top200-dedupe-before-ranking.mjs';
import { transform as pruneDeadUi } from './perf-transforms/p0-99-prune-dead-ui.mjs';

const rootDir = process.cwd();
const dashboardPath = join(rootDir, 'dashboard-wip.html');
const source = readFileSync(dashboardPath, 'utf8');
let dashboardHtml = dedupeTop200BeforeRanking({ dashboardHtml: source }).dashboardHtml;
dashboardHtml = pruneDeadUi({ dashboardHtml }).dashboardHtml;

const runtimePattern = /<script src="\.\/wip-runtime\.bundle\.js[^\"]*"><\/script>/;
if (!runtimePattern.test(dashboardHtml)) {
  throw new Error('Branch Pages source: runtime bundle marker missing');
}
dashboardHtml = dashboardHtml.replace(
  runtimePattern,
  '<script src="./wip-runtime.bundle.js?v=20260907-branch-pages-v2&fix=dedupe-before-top200-rank-v3"></script>'
);

const forbidden = [
  'f-canton-select',
  'acc-undercarriage',
  'patchCantonInProgress',
  'Menu déroulant canton en cours de développement',
  'Filtre non fonctionnel',
  'Filtre à venir'
];
for (const marker of forbidden) {
  if (dashboardHtml.includes(marker)) throw new Error(`Branch Pages source still contains legacy marker: ${marker}`);
}
if (!dashboardHtml.includes('function dedupeTop200ScopeBeforeRanking(items)')) {
  throw new Error('Branch Pages source: pre-ranking SIRET dedupe helper missing');
}
if (!dashboardHtml.includes('const scope = dedupeTop200ScopeBeforeRanking(')) {
  throw new Error('Branch Pages source: Top 200 still ranks duplicate SIRET rows');
}

writeFileSync(dashboardPath, dashboardHtml, 'utf8');
console.log('Materialized branch-compatible dashboard-wip.html with pre-ranking SIRET dedupe.');
