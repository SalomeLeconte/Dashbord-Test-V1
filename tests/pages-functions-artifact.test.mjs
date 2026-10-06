import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Cloudflare Pages build emits a JavaScript advanced-mode worker from Pages Functions', () => {
  const build = readFileSync(new URL('../scripts/build-pages-optimized.mjs', import.meta.url), 'utf8');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.ok(pkg.devDependencies?.['@cloudflare/pages-functions'], '@cloudflare/pages-functions must compile functions/');
  assert.match(build, /buildPagesFunctions/, 'build must use the Pages Functions compiler API');
  assert.match(build, /entryPointPath/, 'compiled JavaScript entry point must be copied to dist/_worker.js');
  assert.match(build, /_worker\.js/, 'compiled Pages Functions worker must be written to dist/_worker.js');
  assert.match(build, /routesJSON/, 'Pages Functions routes must be written to dist/_routes.json');
  assert.doesNotMatch(build, /pages['"]?\s*,\s*['"]functions['"]?\s*,\s*['"]build/, 'do not generate _worker.js through Wrangler multipart bundling');
});
