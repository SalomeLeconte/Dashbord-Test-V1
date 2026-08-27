import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const distDir = join(rootDir, 'dist');
const indexPath = join(rootDir, 'index.html');
const dashboardPath = join(rootDir, 'dashboard-wip.html');

if (!existsSync(dashboardPath)) {
  throw new Error('WIP dashboard source not found: dashboard-wip.html');
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

// WIP uses index.html as a lightweight iframe shell. Keep that shell unchanged and
// optimize the actual dashboard loaded inside it.
copyFileSync(indexPath, join(distDir, 'index.html'));
let html = readFileSync(dashboardPath, 'utf8');

function replaceRequired(label, search, replacement) {
  if (!html.includes(search)) {
    throw new Error(`Optimization marker not found: ${label}`);
  }
  html = html.replace(search, replacement);
}

function replaceRegexRequired(label, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error(`Optimization marker not found: ${label}`);
  }
  html = html.replace(pattern, replacement);
}

// P0.1: WIP already parses the CSV in a Web Worker. Allow repeat visits/reloads to
// reuse the large CSV instead of forcing browser revalidation on every load.
replaceRequired(
  'CSV cache policy',
  'const response = await fetch(CSV_FILE, { cache: "no-cache" });',
  'const response = await fetch(CSV_FILE, { cache: "force-cache" });'
);

// P0.2: Leaflet remains available to the existing WIP code but no longer blocks HTML parsing.
replaceRequired(
  'Leaflet defer',
  '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
  '<script defer src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
);
replaceRequired(
  'Leaflet routing defer',
  '<script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>',
  '<script defer src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>'
);

// P0.3: do not initialize Leaflet or request OSM tiles while the user is still on
// the nominative/table views. Initialize the map only when Cartographie is opened.
replaceRequired(
  'eager map initialization',
  '            loadCSVData();\n            initMap();',
  '            loadCSVData();'
);
replaceRequired(
  'lazy map initialization',
  `            if (isMap && map) {\n                setTimeout(() => {\n                    map.invalidateSize();\n                    renderMap(currentFilteredData);\n                }, 120);\n            }`,
  `            if (isMap) {\n                if (!map) initMap();\n                if (map) {\n                    setTimeout(() => {\n                        map.invalidateSize();\n                        renderMap(currentFilteredData);\n                    }, 120);\n                }\n            }`
);

// P0.4: remove the two large duplicated inline PNG logos from the production HTML.
replaceRegexRequired(
  'large inline logo',
  /<img src="data:image\/png;base64,[^"]+" alt="Komatsu" class="brand-logo-large">/,
  '<img src="assets/komatsu-logo.svg" alt="Komatsu" class="brand-logo-large">'
);
replaceRegexRequired(
  'header inline logo',
  /<img src="data:image\/png;base64,[^"]+" alt="Komatsu" class="brand-logo">/,
  '<img src="assets/komatsu-logo.svg" alt="Komatsu" class="brand-logo">'
);

writeFileSync(join(distDir, 'dashboard-wip.html'), html, 'utf8');
writeFileSync(join(distDir, '.nojekyll'), '', 'utf8');

function copyFileIfExists(fileName) {
  const source = join(rootDir, fileName);
  if (existsSync(source)) copyFileSync(source, join(distDir, fileName));
}

function copyDirectoryIfExists(directoryName) {
  const source = join(rootDir, directoryName);
  if (existsSync(source)) cpSync(source, join(distDir, directoryName), { recursive: true });
}

// WIP loads the CSV worker and several runtime patches from repository-root JS files.
for (const fileName of readdirSync(rootDir)) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.js')) copyFileIfExists(fileName);
}

copyDirectoryIfExists('assets');
copyDirectoryIfExists('src');
copyFileIfExists('CNAME');

const sourceBytes = readFileSync(dashboardPath).byteLength;
const outputBytes = readFileSync(join(distDir, 'dashboard-wip.html')).byteLength;
console.log('GitHub Pages WIP build complete: dist/');
console.log(`dashboard-wip.html: ${sourceBytes} -> ${outputBytes} bytes (${Math.round((1 - outputBytes / sourceBytes) * 100)}% smaller)`);
