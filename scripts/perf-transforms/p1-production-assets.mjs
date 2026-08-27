import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { transformSync } from 'esbuild';

function replaceRequired(html, label, search, replacement) {
  if (!html.includes(search)) throw new Error(`P1 marker not found: ${label}`);
  return html.replace(search, replacement);
}

function removeRequired(html, label, pattern) {
  if (!pattern.test(html)) throw new Error(`P1 marker not found: ${label}`);
  return html.replace(pattern, '');
}

function extractStyles(html) {
  const blocks = [];
  const output = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, css) => {
    blocks.push(css);
    return '';
  });
  return { html: output, css: blocks.join('\n') };
}

function extractInlineScripts(html) {
  const blocks = [];
  const output = html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (_match, js) => {
    if (String(js).trim()) blocks.push(js);
    return '';
  });
  return { html: output, js: blocks.join('\n;\n') };
}

function minifyJs(source) {
  return transformSync(source, {
    loader: 'js',
    target: 'es2020',
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: false,
    legalComments: 'none'
  }).code;
}

function minifyCss(source) {
  return transformSync(source, { loader: 'css', minify: true, legalComments: 'none' }).code;
}

function buildTailwind(context, customCss) {
  const assetsDir = join(context.distDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });
  const input = join(context.distDir, '.p1-tailwind-input.css');
  writeFileSync(input, `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n${customCss}`, 'utf8');

  const cli = join(context.rootDir, 'node_modules', '.bin', 'tailwindcss');
  if (!existsSync(cli)) throw new Error('P1: Tailwind CLI is not installed');
  const result = spawnSync(cli, [
    '-c', join(context.rootDir, 'tailwind.config.cjs'),
    '-i', input,
    '-o', join(assetsDir, 'dashboard.min.css'),
    '--minify'
  ], { cwd: context.rootDir, encoding: 'utf8' });
  rmSync(input, { force: true });
  if (result.status !== 0) throw new Error(`P1 Tailwind build failed: ${result.stderr || result.stdout}`);
}

export async function transform(context) {
  let dashboard = context.dashboardHtml;

  dashboard = dashboard.replace(/\s*<link rel="preconnect" href="https:\/\/cdn\.tailwindcss\.com" crossorigin>\s*/i, '\n');
  dashboard = dashboard.replace(/\s*<link rel="preconnect" href="https:\/\/unpkg\.com" crossorigin>\s*/i, '\n');
  dashboard = removeRequired(dashboard, 'Tailwind Play CDN', /\s*<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/i);
  dashboard = removeRequired(dashboard, 'Tailwind runtime config', /\s*<script>\s*tailwind\.config\s*=\s*\{[\s\S]*?<\/script>\s*/i);
  dashboard = removeRequired(dashboard, 'Leaflet CSS', /\s*<link rel="stylesheet" href="https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css"\s*\/?>\s*/i);
  dashboard = removeRequired(dashboard, 'Leaflet JS', /\s*<script src="https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js"><\/script>\s*/i);
  dashboard = removeRequired(dashboard, 'Leaflet Routing CSS', /\s*<link rel="stylesheet" href="https:\/\/unpkg\.com\/leaflet-routing-machine@3\.2\.12\/dist\/leaflet-routing-machine\.css"\s*\/?>\s*/i);
  dashboard = removeRequired(dashboard, 'Leaflet Routing JS', /\s*<script src="https:\/\/unpkg\.com\/leaflet-routing-machine@3\.2\.12\/dist\/leaflet-routing-machine\.js"><\/script>\s*/i);

  dashboard = replaceRequired(
    dashboard,
    'lazy map loader insertion',
    '        function initMap() {',
    `        let mapLibrariesPromise = null;\n\n        function ensureStylesheet(id, href) {\n            if (document.getElementById(id)) return;\n            const link = document.createElement("link");\n            link.id = id;\n            link.rel = "stylesheet";\n            link.href = href;\n            document.head.appendChild(link);\n        }\n\n        function ensureScript(id, src) {\n            const existing = document.getElementById(id);\n            if (existing?.dataset.loaded === "true") return Promise.resolve();\n            return new Promise((resolve, reject) => {\n                const script = existing || document.createElement("script");\n                script.id = id;\n                script.src = src;\n                script.async = false;\n                script.addEventListener("load", () => { script.dataset.loaded = "true"; resolve(); }, { once: true });\n                script.addEventListener("error", () => reject(new Error("Chargement impossible: " + src)), { once: true });\n                if (!existing) document.head.appendChild(script);\n            });\n        }\n\n        async function ensureMapLibraries() {\n            if (typeof L !== "undefined" && L.Routing) return true;\n            if (!mapLibrariesPromise) {\n                mapLibrariesPromise = (async () => {\n                    ensureStylesheet("leaflet-css-lazy", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");\n                    await ensureScript("leaflet-js-lazy", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");\n                    ensureStylesheet("leaflet-routing-css-lazy", "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css");\n                    await ensureScript("leaflet-routing-js-lazy", "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js");\n                    return true;\n                })().catch(error => { mapLibrariesPromise = null; throw error; });\n            }\n            return mapLibrariesPromise;\n        }\n\n        function initMap() {`
  );

  dashboard = replaceRequired(
    dashboard,
    'remove eager map initialization',
    `        document.addEventListener("DOMContentLoaded", () => {\n            updateDataTabLabel();\n            renderCollaboratorGrid();\n            initMap();\n        });`,
    `        document.addEventListener("DOMContentLoaded", () => {\n            updateDataTabLabel();\n            renderCollaboratorGrid();\n        });`
  );

  dashboard = replaceRequired(dashboard, 'async setTab', '        function setTab(tab) {', '        async function setTab(tab) {');
  dashboard = replaceRequired(
    dashboard,
    'lazy map tab',
    `            if (isMap && map) {\n                setTimeout(() => {\n                    map.invalidateSize();\n                    renderMap(currentFilteredData);\n                }, 120);\n            }`,
    `            if (isMap) {\n                try {\n                    await ensureMapLibraries();\n                    if (!map) initMap();\n                    if (map) {\n                        setTimeout(() => {\n                            map.invalidateSize();\n                            renderMap(currentFilteredData);\n                        }, 120);\n                    }\n                } catch (error) {\n                    console.error("Chargement de la cartographie impossible.", error);\n                }\n            }`
  );

  const dashboardStyles = extractStyles(dashboard);
  dashboard = dashboardStyles.html;
  buildTailwind(context, dashboardStyles.css);

  const dashboardScripts = extractInlineScripts(dashboard);
  dashboard = dashboardScripts.html;
  const assetsDir = join(context.distDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(join(assetsDir, 'dashboard-inline.min.js'), minifyJs(dashboardScripts.js), 'utf8');
  dashboard = dashboard.replace('</head>', '    <link rel="stylesheet" href="assets/dashboard.min.css">\n</head>');
  dashboard = dashboard.replace('</body>', '    <script src="assets/dashboard-inline.min.js"></script>\n</body>');

  let shell = context.indexHtml;
  const shellStyles = extractStyles(shell);
  shell = shellStyles.html;
  writeFileSync(join(assetsDir, 'wip-shell.min.css'), minifyCss(shellStyles.css), 'utf8');
  const shellScripts = extractInlineScripts(shell);
  shell = shellScripts.html;
  writeFileSync(join(assetsDir, 'wip-shell.min.js'), minifyJs(shellScripts.js), 'utf8');
  shell = shell.replace('</head>', '  <link rel="stylesheet" href="assets/wip-shell.min.css">\n</head>');
  shell = shell.replace('</body>', '  <script src="assets/wip-shell.min.js"></script>\n</body>');

  return { indexHtml: shell, dashboardHtml: dashboard };
}
