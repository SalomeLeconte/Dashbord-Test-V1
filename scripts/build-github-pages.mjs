import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const distDir = join(rootDir, 'dist');
const indexPath = join(rootDir, 'index.html');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

let html = readFileSync(indexPath, 'utf8');

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

// P0.1: allow the browser to reuse the 17+ MB dataset between visits/reloads.
replaceRequired(
  'CSV cache policy',
  'const response = await fetch(CSV_FILE, { cache: "no-store" });',
  'const response = await fetch(CSV_FILE, { cache: "force-cache" });'
);

// P0.2: Leaflet is still downloaded early for compatibility, but it no longer blocks HTML parsing.
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

// P0.3: do not create the map or request OSM tiles before the Cartographie tab is opened.
replaceRequired(
  'eager map initialization',
  '            initMap();\n            loadCSVData();',
  '            loadCSVData();'
);
replaceRequired(
  'lazy map initialization',
  `            if (isMap && map) {\n                setTimeout(() => {\n                    map.invalidateSize();\n                    renderMap(currentFilteredData);\n                }, 120);\n            }`,
  `            if (isMap) {\n                if (!map) initMap();\n                if (map) {\n                    setTimeout(() => {\n                        map.invalidateSize();\n                        renderMap(currentFilteredData);\n                    }, 120);\n                }\n            }`
);

// P0.4: render only the responsive representation that is actually visible.
replaceRequired(
  'grid responsive rendering',
  `        function renderGrid(data) {\n            renderMobileGridCards(data);\n            const tbody = document.getElementById("grid-tbody");\n            if (!tbody) return;`,
  `        function renderGrid(data) {\n            const tbody = document.getElementById("grid-tbody");\n            const mobileContainer = document.getElementById("mobile-grid-cards");\n            const isMobile = window.matchMedia("(max-width: 767px)").matches;\n\n            if (isMobile) {\n                if (tbody) tbody.innerHTML = "";\n                renderMobileGridCards(data);\n                return;\n            }\n\n            if (mobileContainer) mobileContainer.innerHTML = "";\n            if (!tbody) return;`
);

// The TOP 200 is hidden by default. Do not build its complete DOM until the user opens the tab.
replaceRequired(
  'top200 lazy rendering',
  `        function renderTop200() {\n            const tbody = document.getElementById("top200-tbody");\n            if (!tbody) return;\n\n            const topData = getTop200Data();`,
  `        function renderTop200() {\n            const tbody = document.getElementById("top200-tbody");\n            if (!tbody || currentTab !== "top200") return;\n\n            const topData = getTop200Data();`
);
replaceRequired(
  'top200 responsive rendering',
  `            setText("oldmachines-count", formatNumber(oldMachinesCount));\n            renderMobileTop200Cards(topData);\n\n            if (!topData.length) {`,
  `            setText("oldmachines-count", formatNumber(oldMachinesCount));\n\n            const isMobile = window.matchMedia("(max-width: 767px)").matches;\n            const mobileContainer = document.getElementById("mobile-top200-cards");\n            if (isMobile) {\n                tbody.innerHTML = "";\n                renderMobileTop200Cards(topData);\n                return;\n            }\n            if (mobileContainer) mobileContainer.innerHTML = "";\n\n            if (!topData.length) {`
);

// P0.5: remove duplicate inline base64 logos from the production HTML.
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

writeFileSync(join(distDir, 'index.html'), html, 'utf8');
writeFileSync(join(distDir, '.nojekyll'), '', 'utf8');

function copyFileIfExists(fileName) {
  const source = join(rootDir, fileName);
  if (existsSync(source)) copyFileSync(source, join(distDir, fileName));
}

function copyDirectoryIfExists(directoryName) {
  const source = join(rootDir, directoryName);
  if (existsSync(source)) cpSync(source, join(distDir, directoryName), { recursive: true });
}

for (const fileName of readdirSync(rootDir)) {
  if (fileName.toLowerCase().endsWith('.csv')) copyFileIfExists(fileName);
}

copyDirectoryIfExists('assets');
copyDirectoryIfExists('src');
copyFileIfExists('CNAME');

const sourceBytes = readFileSync(indexPath).byteLength;
const outputBytes = readFileSync(join(distDir, 'index.html')).byteLength;
console.log(`GitHub Pages build complete: dist/`);
console.log(`index.html: ${sourceBytes} -> ${outputBytes} bytes (${Math.round((1 - outputBytes / sourceBytes) * 100)}% smaller)`);
