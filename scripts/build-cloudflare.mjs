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

// Main application entry point and WIP runtime files.
copyFileIfExists('index.html');
copyFileIfExists('dashboard-wip.html');
copyFileIfExists('wip-performance-patch.js');
copyFileIfExists('wip-followup-patch.js');
copyFileIfExists('wip-release-refine-patch.js');
copyFileIfExists('wip-marker-novelty-green-patch.js');
copyFileIfExists('wip-feedback-patch.js');
copyFileIfExists('wip-stability-repair-patch.js');
copyFileIfExists('wip-route-ui-refine-patch.js');
copyFileIfExists('wip-responsive-device-patch.js');
copyFileIfExists('wip-map-terrain-search-patch.js');
copyFileIfExists('wip-smart-route-sync-patch.js');
copyFileIfExists('wip-route-sector-final-fix-patch.js');
copyFileIfExists('wip-route-status-compact-patch.js');
copyFileIfExists('wip-table-excel-filters-date-sort-patch.js');
copyFileIfExists('wip-undercarriage-filter-patch.js');
copyFileIfExists('wip-canton-adaptive-filter-patch.js');
copyFileIfExists('wip-filter-placeholder-cleanup-patch.js');
copyFileIfExists('wip-siret-dedupe-patch.js');
copyFileIfExists('wip-undercarriage-detail-ui-patch.js');
copyFileIfExists('wip-release-target-precision-patch.js');
copyFileIfExists('wip-undercarriage-native-style-patch.js');

// Cloudflare Pages configuration files. They must be present in the output directory.
copyFileIfExists('_headers');
copyFileIfExists('_redirects');

// CSV data files used by the dashboard.
for (const fileName of readdirSync(rootDir)) {
  if (fileName.toLowerCase().endsWith('.csv')) {
    copyFileIfExists(fileName);
  }
}

// Static assets and optional modular JS source files.
copyDirectoryIfExists('assets');
copyDirectoryIfExists('src');

console.log('Cloudflare Pages build complete: dist/');