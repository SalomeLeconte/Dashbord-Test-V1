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
  'wip-performance-patch.js',
  'wip-followup-patch.js',
  'wip-release-refine-patch.js',
  'wip-marker-novelty-green-patch.js',
  'wip-feedback-patch.js',
  'wip-stability-repair-patch.js',
  'wip-route-ui-refine-patch.js',
  'wip-responsive-device-patch.js',
  'wip-map-terrain-search-patch.js',
  'wip-smart-route-sync-patch.js',
  'wip-route-sector-final-fix-patch.js',
  'wip-route-status-compact-patch.js',
  'wip-table-excel-filters-date-sort-patch.js',
  'wip-undercarriage-filter-patch.js',
  'wip-canton-adaptive-filter-patch.js',
  'wip-filter-placeholder-cleanup-patch.js',
  'wip-siret-dedupe-patch.js',
  'wip-undercarriage-detail-ui-patch.js',
  'wip-release-target-precision-patch.js',
  'wip-undercarriage-modal-clean-patch.js',
  'wip-canton-note-cleanup-patch.js',
  'wip-undercarriage-model-rules-patch.js',
  'wip-undercarriage-smr-filter-patch.js',
  'wip-undercarriage-badge-restore-patch.js',
  'wip-undercarriage-native-visual-final-patch.js',
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
