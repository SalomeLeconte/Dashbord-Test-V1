import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { field += '"'; index++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index++;
      row.push(field);
      if (row.some(value => String(value).trim() !== '')) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some(value => String(value).trim() !== '')) rows.push(row);
  }
  return rows;
}

function normalizeDept(value) {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  if (/^\d$/.test(raw)) return `0${raw}`;
  return raw;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function stringifyCSV(rows) {
  return rows.map(row => row.map(csvEscape).join(',')).join('\n') + '\n';
}

export async function run(context) {
  const sourcePath = join(context.rootDir, 'data11.csv');
  const rows = parseCSV(readFileSync(sourcePath, 'utf8'));
  if (rows.length < 2) throw new Error('P0-03: data11.csv is empty');

  const headers = rows[0].map(value => String(value).replace(/^\ufeff/, '').trim());
  const deptIndex = headers.indexOf('Departement');
  if (deptIndex < 0) throw new Error('P0-03: Departement column not found');

  const groups = new Map();
  for (const row of rows.slice(1)) {
    const dept = normalizeDept(row[deptIndex]);
    if (!dept) continue;
    if (!groups.has(dept)) groups.set(dept, []);
    groups.get(dept).push(row);
  }

  const outputDir = join(context.distDir, 'data');
  mkdirSync(outputDir, { recursive: true });
  const manifest = { generatedFrom: 'data11.csv', departments: {} };

  for (const [dept, deptRows] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true }))) {
    const safeDept = dept.replace(/[^0-9A-Z_-]/g, '_');
    const file = `dept-${safeDept}.csv`;
    writeFileSync(join(outputDir, file), stringifyCSV([headers, ...deptRows]), 'utf8');
    manifest.departments[dept] = { file: `data/${file}`, rows: deptRows.length };
  }

  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest), 'utf8');
  console.log(`P0-03: generated ${Object.keys(manifest.departments).length} department chunks`);
}
