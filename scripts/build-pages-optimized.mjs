import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();
const distDir = join(rootDir, 'dist');
const indexPath = join(rootDir, 'index.html');
const dashboardPath = join(rootDir, 'dashboard-wip.html');

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

await runModules('scripts/perf-prebuild', 'run');
await runModules('scripts/perf-transforms', 'transform');

const runtimeDir = join(rootDir, 'perf-runtime');
if (existsSync(runtimeDir)) {
  const runtimeFiles = readdirSync(runtimeDir).filter(name => name.endsWith('.js')).sort();
  if (runtimeFiles.length) {
    const startMarker = 'const runtimePatches=[';
    const start = context.indexHtml.indexOf(startMarker);
    if (start < 0) throw new Error('WIP runtimePatches array not found in index.html');
    const end = context.indexHtml.indexOf('];', start);
    if (end < 0) throw new Error('WIP runtimePatches array closing marker not found');
    const additions = runtimeFiles.map(file => `        'perf-runtime/${file}'`).join(',\n');
    const before = context.indexHtml.slice(0, end).replace(/\s*$/, '');
    const needsComma = !before.endsWith('[') && !before.endsWith(',');
    context.indexHtml = `${before}${needsComma ? ',' : ''}\n${additions}\n      ${context.indexHtml.slice(end)}`;
    context.indexHtml = context.indexHtml.replace('script.defer=true;', 'script.async=false;script.defer=false;');
  }
}

const excluded = new Set(['.git', '.github', 'dist', 'node_modules', 'scripts', 'perf-runtime']);
for (const name of readdirSync(rootDir)) {
  if (excluded.has(name) || name === 'index.html' || name === 'dashboard-wip.html') continue;
  const source = join(rootDir, name);
  const target = join(distDir, name);
  if (statSync(source).isDirectory()) cpSync(source, target, { recursive: true });
  else cpSync(source, target);
}

if (existsSync(runtimeDir)) cpSync(runtimeDir, join(distDir, 'perf-runtime'), { recursive: true });
writeFileSync(join(distDir, 'index.html'), context.indexHtml, 'utf8');
writeFileSync(join(distDir, 'dashboard-wip.html'), context.dashboardHtml, 'utf8');
writeFileSync(join(distDir, '.nojekyll'), '', 'utf8');

const sourceBytes = readFileSync(dashboardPath).byteLength;
const outputBytes = readFileSync(join(distDir, 'dashboard-wip.html')).byteLength;
console.log(`Optimized Pages build complete: dist/`);
console.log(`dashboard-wip.html: ${sourceBytes} -> ${outputBytes} bytes`);
