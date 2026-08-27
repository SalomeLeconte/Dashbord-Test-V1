import { createHash } from 'node:crypto';
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

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDept(value) {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return '';
  return /^\d$/.test(raw) ? `0${raw}` : raw;
}

function normalizePssrName(value) {
  return normalizeText(value).replace(/\s+/g, ' ').trim().toUpperCase();
}

function parsePssrNames(value) {
  return String(value ?? '').split(/[;,]/).map(normalizePssrName).filter(Boolean);
}

function parseNumber(value) {
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.+-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstNumeric(row, headers, names) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index < 0) continue;
    const value = parseNumber(row[index]);
    if (Number.isFinite(value) && value !== 0) return value;
  }
  return null;
}

function hashText(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

export async function run(context) {
  const rows = parseCSV(readFileSync(join(context.rootDir, 'data11.csv'), 'utf8'));
  if (rows.length < 2) throw new Error('P2: data11.csv is empty');

  const headers = rows[0].map(value => String(value).replace(/^\ufeff/, '').trim());
  const indexOf = name => headers.indexOf(name);
  const idx = {
    dept: indexOf('Departement'),
    pssr: indexOf('.PSSR'),
    nom: indexOf('denominationUniteLegale'),
    ville: indexOf('libelleCommuneEtablissement'),
    naf: indexOf('NAF'),
    machines: indexOf('Liste Machines'),
    series: indexOf('Liste Num serie Machines'),
    age: indexOf('Age machine all'),
    adresse: indexOf('Adresse complète'),
    ca2025: indexOf('CA FY 2025'),
    caGlobal: indexOf('CA Global'),
    pcs2026: indexOf('Total Montant Facturé PDR FY 2026'),
    sav2026: indexOf('Total Montant Facturé SERVICE FY 2026'),
    eligibleA: indexOf('.Client éligible'),
    eligibleB: indexOf('Somme de .Client éligible'),
    newA: indexOf('.Machines récentes/client'),
    newB: indexOf('Machines récentes par client')
  };
  if (idx.dept < 0) throw new Error('P2: Departement column not found');

  const cantonIndices = ['Canton', 'Canton (Nom)', 'Client_Irium.Canton', 'Client_Irium.Canton (Nom)', 'canton', 'canton_nom']
    .map(indexOf).filter(index => index >= 0);
  const machineIndices = ['Liste Machines', 'Liste machine', 'Liste machines', 'LISTE MACHINE', 'LISTE MACHINES', 'datav2.Liste Machines', 'datav2.Liste machine']
    .map(indexOf).filter(index => index >= 0);
  const seriesIndices = ['Liste Num serie Machines', 'datav2.Liste Num serie Machines']
    .map(indexOf).filter(index => index >= 0);

  const grouped = new Map();
  rows.slice(1).forEach((row, rowIndex) => {
    const dept = normalizeDept(row[idx.dept]);
    if (!dept) return;
    const pssrNorms = idx.pssr >= 0 ? parsePssrNames(row[idx.pssr]) : [];
    const ville = idx.ville >= 0 ? row[idx.ville] : '';
    const adresse = idx.adresse >= 0 ? row[idx.adresse] : '';
    const pcs2026 = idx.pcs2026 >= 0 ? parseNumber(row[idx.pcs2026]) : 0;
    const sav2026 = idx.sav2026 >= 0 ? parseNumber(row[idx.sav2026]) : 0;
    const eligible = parseNumber(idx.eligibleA >= 0 ? row[idx.eligibleA] : '') === 1 || parseNumber(idx.eligibleB >= 0 ? row[idx.eligibleB] : '') === 1;
    const newValue = normalizeText([idx.newA >= 0 ? row[idx.newA] : '', idx.newB >= 0 ? row[idx.newB] : ''].filter(Boolean).join(' '));

    const meta = [
      rowIndex,
      dept,
      pssrNorms,
      firstNumeric(row, headers, ['Latitude', 'latitude', 'lat', 'LAT', 'Coordonnée Latitude', 'Coordonnee Latitude']),
      firstNumeric(row, headers, ['Longitude', 'longitude', 'lng', 'lon', 'LONG', 'Coordonnée Longitude', 'Coordonnee Longitude']),
      normalizeText(idx.nom >= 0 ? row[idx.nom] : ''),
      normalizeText(ville),
      normalizeText(cantonIndices.map(index => row[index]).filter(Boolean).join(' ')),
      normalizeText(machineIndices.map(index => row[index]).filter(Boolean).join(' ')),
      normalizeText(seriesIndices.map(index => row[index]).filter(Boolean).join(' ')),
      normalizeText(idx.naf >= 0 ? row[idx.naf] : ''),
      normalizeText(idx.age >= 0 ? row[idx.age] : ''),
      [adresse, ville, dept, 'France'].filter(Boolean).join(', '),
      idx.ca2025 >= 0 ? parseNumber(row[idx.ca2025]) : 0,
      pcs2026 + sav2026,
      idx.caGlobal >= 0 ? parseNumber(row[idx.caGlobal]) : 0,
      eligible ? 1 : 0,
      newValue.includes('new') ? 1 : 0
    ];

    if (!grouped.has(dept)) grouped.set(dept, []);
    grouped.get(dept).push([...meta, ...row]);
  });

  const outputDir = join(context.distDir, 'data', 'prepared');
  mkdirSync(outputDir, { recursive: true });
  const manifest = {
    version: 1,
    source: 'data11.csv',
    metaColumns: 18,
    headers,
    departments: {}
  };

  for (const [dept, preparedRows] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true }))) {
    const payload = JSON.stringify({ rows: preparedRows });
    const hash = hashText(payload);
    const safeDept = dept.replace(/[^0-9A-Z_-]/g, '_');
    const file = `dept-${safeDept}.${hash}.json`;
    writeFileSync(join(outputDir, file), payload, 'utf8');
    manifest.departments[dept] = { file: `data/prepared/${file}`, rows: preparedRows.length, hash };
  }

  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest), 'utf8');
  console.log(`P2: generated ${Object.keys(manifest.departments).length} fingerprinted prepared JSON chunks`);
}
