import { createHash } from 'node:crypto';
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = join(rootDir, 'dist');
const indexPath = join(rootDir, 'index.html');
const dashboardPath = join(rootDir, 'dashboard-wip.html');
const runtimeBundlePath = join(rootDir, 'wip-runtime.bundle.js');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const context = {
  rootDir,
  distDir,
  indexHtml: readFileSync(indexPath, 'utf8'),
  dashboardHtml: readFileSync(dashboardPath, 'utf8')
};

async function runModules(directoryName, exportName) {
  const directory = join(rootDir, directoryName);
  if (!existsSync(directory)) return;
  const files = readdirSync(directory).filter(name => name.endsWith('.mjs')).sort();
  for (const file of files) {
    const module = await import(`${pathToFileURL(join(directory, file)).href}?build=${Date.now()}`);
    const runner = module[exportName];
    if (typeof runner !== 'function') throw new Error(`${directoryName}/${file} must export ${exportName}()`);
    const result = await runner(context);
    if (result?.indexHtml !== undefined) context.indexHtml = result.indexHtml;
    if (result?.dashboardHtml !== undefined) context.dashboardHtml = result.dashboardHtml;
  }
}

function buildPagesFunctionsArtifact() {
  const wrangler = join(rootDir, 'node_modules', '.bin', 'wrangler');
  if (!existsSync(wrangler)) {
    throw new Error('Wrangler is required to compile Cloudflare Pages Functions.');
  }

  const workerPath = join(distDir, '_worker.js');
  const routesPath = join(distDir, '_routes.json');
  const result = spawnSync(
    wrangler,
    [
      'pages', 'functions', 'build',
      join(rootDir, 'functions'),
      '--outfile', workerPath,
      '--output-routes-path', routesPath,
      '--fallback-service', 'ASSETS',
      '--minify'
    ],
    { cwd: rootDir, encoding: 'utf8' }
  );

  if (result.status !== 0) {
    throw new Error(`Pages Functions build failed: ${result.stderr || result.stdout || 'unknown error'}`);
  }
  if (!existsSync(workerPath)) {
    throw new Error('Pages Functions build completed without dist/_worker.js.');
  }
  if (!existsSync(routesPath)) {
    throw new Error('Pages Functions build completed without dist/_routes.json.');
  }
}

function fingerprintRuntimeBundle() {
  if (!existsSync(runtimeBundlePath)) throw new Error('Runtime bundle missing: run npm run bundle first');
  const content = readFileSync(runtimeBundlePath);
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
  const assetsDir = join(distDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });
  const targetName = `wip-runtime.${hash}.js`;
  copyFileSync(runtimeBundlePath, join(assetsDir, targetName));

  const runtimePattern = /<script src="\.\/wip-runtime\.bundle\.js[^\"]*"><\/script>/;
  if (!runtimePattern.test(context.dashboardHtml)) {
    throw new Error('Runtime bundle marker missing from dashboard-wip.html');
  }
  context.dashboardHtml = context.dashboardHtml.replace(runtimePattern, `<script src="assets/${targetName}"></script>`);
  return targetName;
}

// Pré-calculs et transformations identiques pour toutes les cibles de publication.
await runModules('scripts/perf-prebuild', 'run');
await runModules('scripts/perf-transforms', 'transform');

const runtimeDir = join(rootDir, 'perf-runtime');
const excluded = new Set(['.git', '.github', 'dist', 'node_modules', 'scripts', 'perf-runtime', 'functions']);
for (const name of readdirSync(rootDir)) {
  if (excluded.has(name) || name === 'index.html' || name === 'dashboard-wip.html' || name === 'wip-runtime.bundle.js') continue;
  const source = join(rootDir, name);
  const target = join(distDir, name);
  if (statSync(source).isDirectory()) cpSync(source, target, { recursive: true });
  else cpSync(source, target);
}

// Conservé dans l'artefact pour diagnostic, mais aucun fichier perf-runtime n'est
// désormais chargé séparément au démarrage : le runtime utile est dans le bundle.
if (existsSync(runtimeDir)) cpSync(runtimeDir, join(distDir, 'perf-runtime'), { recursive: true });
const runtimeAsset = fingerprintRuntimeBundle();

writeFileSync(join(distDir, 'index.html'), context.indexHtml, 'utf8');
writeFileSync(join(distDir, 'dashboard-wip.html'), context.dashboardHtml, 'utf8');
writeFileSync(join(distDir, '.nojekyll'), '', 'utf8');

// Compile Pages Functions into Advanced Mode so the deployed dist/ artifact
// always carries the authentication middleware and API routes with it.
buildPagesFunctionsArtifact();

const sourceBytes = readFileSync(dashboardPath).byteLength;
const outputBytes = readFileSync(join(distDir, 'dashboard-wip.html')).byteLength;
console.log('Optimized unified build complete: dist/');
console.log(`dashboard-wip.html: ${sourceBytes} -> ${outputBytes} bytes`);
console.log(`runtime: assets/${runtimeAsset}`);
console.log('pages functions: dist/_worker.js');
