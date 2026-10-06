import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Cloudflare Pages build emits an advanced-mode worker from Pages Functions', () => {
  const build = readFileSync(new URL('../scripts/build-pages-optimized.mjs', import.meta.url), 'utf8');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.ok(pkg.devDependencies?.wrangler, 'wrangler must be installed for Pages Functions compilation');
  assert.match(build, /pages['"]?\s*,\s*['"]functions['"]?\s*,\s*['"]build/, 'build must compile functions/');
  assert.match(build, /_worker\.js/, 'compiled Pages Functions worker must be written to dist/_worker.js');
  assert.match(build, /output-routes-path/, 'Pages Functions routes must be emitted with the worker');
  assert.match(build, /fallback-service['"]?\s*,\s*['"]ASSETS/, 'worker must fall back to Pages static assets');
});
