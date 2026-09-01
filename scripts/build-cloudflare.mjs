import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const distDir = join(rootDir, 'dist');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

function copyFileRequired(fileName) {
  const source = join(rootDir, fileName);
  const target = join(distDir, fileName);
  if (!existsSync(source)) throw new Error(`Fichier runtime requis absent: ${fileName}`);
  copyFileSync(source, target);
  console.log(`Copied ${fileName}`);
}

function copyFileIfExists(fileName) {
  const source = join(rootDir, fileName);
  const target = join(distDir, fileName);
  if (!existsSync(source)) return;
  copyFileSync(source, target);
  console.log(`Copied ${fileName}`);
}

function copyDirectoryIfExists(directoryName) {
  const source = join(rootDir, directoryName);
  const target = join(distDir, directoryName);
  if (!existsSync(source)) return;
  cpSync(source, target, { recursive: true });
  console.log(`Copied ${directoryName}/`);
}

// Fichiers indispensables au shell WIP.
[
  'index.html',
  'dashboard-wip.html',
  'wip-runtime.bundle.js',
  'csv-data-worker.js'
].forEach(copyFileRequired);

// Tous les patches WIP racine sont copiés automatiquement. Ainsi, ajouter un
// nouveau patch à index.html ne peut plus créer un 404 silencieux en production.
for (const fileName of readdirSync(rootDir)) {
  if (/^wip-.*\.js$/i.test(fileName)) copyFileIfExists(fileName);
  if (/^[a-z0-9-]+-worker\.js$/i.test(fileName)) copyFileIfExists(fileName);
  if (fileName.toLowerCase().endsWith('.csv')) copyFileIfExists(fileName);
}

// Le hotfix post-merge charge p0-04/p0-05 depuis ce dossier. Il était auparavant
// absent du build Cloudflare, ce qui annulait le correctif de rendu en production.
copyDirectoryIfExists('perf-runtime');
copyDirectoryIfExists('assets');
copyDirectoryIfExists('src');
copyFileIfExists('_headers');
copyFileIfExists('_redirects');

function assertFile(relativePath) {
  if (!existsSync(join(distDir, relativePath))) {
    throw new Error(`Artifact WIP incomplet: ${relativePath}`);
  }
}

// Vérifie chaque patch local déclaré par le shell. On échoue au build plutôt que
// de publier un dashboard qui ne charge qu'un header avec des scripts en 404.
const shellHtml = readFileSync(join(distDir, 'index.html'), 'utf8');
const runtimeArray = shellHtml.match(/const\s+runtimePatches\s*=\s*\[([\s\S]*?)\];/);
if (!runtimeArray) throw new Error('runtimePatches introuvable dans index.html');
const declaredPatches = [...runtimeArray[1].matchAll(/['"]([^'"]+\.js)(?:\?[^'"]*)?['"]/g)].map(match => match[1]);
for (const patch of declaredPatches) assertFile(patch);

[
  'wip-postmerge-performance-hotfix.js',
  'perf-runtime/p0-04-grid-windowing.js',
  'perf-runtime/p0-05-responsive-render.js',
  'wip-city-filter-input-fix-patch.js',
  'wip-shell-recovery-patch.js'
].forEach(assertFile);

console.log(`Cloudflare Pages build complete: dist/ (${declaredPatches.length} runtime patches validated)`);
