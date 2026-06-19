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

// Main application entry point.
copyFileIfExists('index.html');

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
