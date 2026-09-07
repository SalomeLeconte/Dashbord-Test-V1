import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { transform } from './perf-transforms/p0-99-prune-dead-ui.mjs';

const rootDir = process.cwd();
const dashboardPath = join(rootDir, 'dashboard-wip.html');
const source = readFileSync(dashboardPath, 'utf8');
const result = transform({ dashboardHtml: source });
let dashboardHtml = result.dashboardHtml;

const runtimePattern = /<script src="\.\/wip-runtime\.bundle\.js[^\"]*"><\/script>/;
if (!runtimePattern.test(dashboardHtml)) {
  throw new Error('Branch Pages source: runtime bundle marker missing');
}
dashboardHtml = dashboardHtml.replace(
  runtimePattern,
  '<script src="./wip-runtime.bundle.js?v=20260907-branch-pages-v2&fix=topn-final-top200-v2"></script>'
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

writeFileSync(dashboardPath, dashboardHtml, 'utf8');
console.log('Materialized branch-compatible dashboard-wip.html.');
