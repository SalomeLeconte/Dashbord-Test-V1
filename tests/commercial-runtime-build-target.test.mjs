import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../scripts/perf-transforms/p1-production-assets.mjs',import.meta.url),'utf8');

test('commercial runtime is bundled into dashboard iframe asset, not parent shell',()=>{
  assert.match(source,/const bundledDashboardJs=`\$\{dashboardScripts\.js\}\\n;\\n\$\{commercialRuntime\}`/);
  assert.match(source,/dashboard-inline\.min\.js'\),minifyJs\(bundledDashboardJs\)/);
  assert.doesNotMatch(source,/const bundledShellJs=.*commercialRuntime/);
});
