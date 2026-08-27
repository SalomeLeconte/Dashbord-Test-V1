import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

function fingerprintFile(context, fileName) {
  const sourcePath = join(context.distDir, 'assets', fileName);
  if (!existsSync(sourcePath)) throw new Error(`P2 asset not found: ${fileName}`);
  const content = readFileSync(sourcePath);
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
  const extension = extname(fileName);
  const stem = basename(fileName, extension).replace(/\.min$/, '');
  const targetName = `${stem}.${hash}.min${extension}`;
  renameSync(sourcePath, join(context.distDir, 'assets', targetName));
  return { source: `assets/${fileName}`, target: `assets/${targetName}`, hash };
}

export function transform(context) {
  const files = [
    'dashboard.min.css',
    'dashboard-inline.min.js',
    'wip-shell.min.css',
    'wip-shell.min.js'
  ];
  const mappings = files.map(file => fingerprintFile(context, file));

  let dashboardHtml = context.dashboardHtml;
  let indexHtml = context.indexHtml;
  for (const mapping of mappings) {
    dashboardHtml = dashboardHtml.split(mapping.source).join(mapping.target);
    indexHtml = indexHtml.split(mapping.source).join(mapping.target);
  }

  writeFileSync(
    join(context.distDir, 'assets', 'manifest.json'),
    JSON.stringify(Object.fromEntries(mappings.map(mapping => [mapping.source, mapping.target]))),
    'utf8'
  );

  return { dashboardHtml, indexHtml };
}
