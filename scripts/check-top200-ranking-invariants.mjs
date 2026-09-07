import { readFileSync } from 'node:fs';

const dashboard = readFileSync('dashboard-wip.html', 'utf8');
const stackGuard = readFileSync('wip-stack-guard-patch.js', 'utf8');

if (!dashboard.includes('function dedupeTop200ScopeBeforeRanking(items)')) {
  throw new Error('Top 200 invariant: pre-ranking SIRET dedupe helper missing from branch-served dashboard');
}
if (!dashboard.includes('const scope = dedupeTop200ScopeBeforeRanking(')) {
  throw new Error('Top 200 invariant: ranking still starts from duplicate raw rows');
}
if (stackGuard.includes('__wipTopNFromFinalTop200')) {
  throw new Error('Top 200 invariant: legacy post-ranking Top N workaround must stay removed');
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && next === '\n') index++;
      row.push(field);
      if (row.some(value => String(value).trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some(value => String(value).trim())) rows.push(row);
  }
  return rows;
}

const normalizeHeader = value => String(value ?? '')
  .replace(/^\ufeff/, '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const rows = parseCSV(readFileSync('data11.csv', 'utf8'));
if (rows.length < 2) throw new Error('Top 200 invariant: data11.csv is empty');
const headers = rows[0].map(normalizeHeader);
const siretIndex = headers.findIndex(header => header === 'siret' || header.endsWith('.siret') || header.includes('client_irium.siret'));
const deptIndex = headers.findIndex(header => header === 'departement' || header.endsWith('.departement') || header.includes('code departement') || header.includes('code_departement') || header.includes('dep_code'));
if (siretIndex < 0 || deptIndex < 0) throw new Error('Top 200 invariant: SIRET or department column missing');

const ludovicDepartments = new Set(['04', '05', '13', '84']);
const normalizeDept = value => {
  const raw = String(value ?? '').trim().toUpperCase();
  const digits = raw.replace(/\D/g, '');
  return digits ? digits.padStart(2, '0').slice(-2) : raw;
};

let scopedRows = 0;
const uniqueSirets = new Set();
for (const row of rows.slice(1)) {
  if (!ludovicDepartments.has(normalizeDept(row[deptIndex]))) continue;
  scopedRows++;
  const digits = String(row[siretIndex] ?? '').replace(/\D/g, '');
  if (digits.length >= 9) uniqueSirets.add(digits.length >= 14 ? digits.slice(0, 14) : digits);
}

if (uniqueSirets.size < 10) {
  throw new Error(`Top 200 invariant: Ludovic scope has only ${uniqueSirets.size} unique SIRET`);
}

console.log(`Top 200 invariant OK — Ludovic: ${scopedRows} rows, ${uniqueSirets.size} unique SIRET, ${scopedRows - uniqueSirets.size} duplicate rows removed before ranking.`);
