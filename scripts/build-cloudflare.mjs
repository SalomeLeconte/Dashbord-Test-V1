import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const distDir = join(rootDir, 'dist');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

function copyFileIfExists(fileName) {
  const source = join(rootDir, fileName);
  const target = join(distDir, fileName);

  if (existsSync(source)) {
    copyFileSync(source, target);
    console.log(`Copied ${fileName}`);
  }
}

function copyDirectoryIfExists(directoryName) {
  const source = join(rootDir, directoryName);
  const target = join(distDir, directoryName);

  if (existsSync(source)) {
    cpSync(source, target, { recursive: true });
    console.log(`Copied ${directoryName}/`);
  }
}

const runtimeFiles = [
  'index.html',
  'dashboard-wip.html',
  'wip-runtime.bundle.js',
  'csv-data-worker.js',
  'wip-table-excel-filter-precision-patch.js',
  'wip-final-regression-fixes-patch.js',
  'wip-safe-undercarriage-home-route-patch.js',
  'wip-stack-guard-patch.js'
];

runtimeFiles.forEach(copyFileIfExists);

copyFileIfExists('_headers');
copyFileIfExists('_redirects');

for (const fileName of readdirSync(rootDir)) {
  if (fileName.toLowerCase().endsWith('.csv')) {
    copyFileIfExists(fileName);
  }
}

copyDirectoryIfExists('assets');
copyDirectoryIfExists('src');

console.log('Cloudflare Pages build complete: dist/');