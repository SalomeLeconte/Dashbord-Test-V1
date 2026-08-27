/* global self */

self.onmessage = event => {
  const message = event.data || {};
  if (!message.url) return;

  const task = message.type === 'load-canton'
    ? loadAndPrepareCantonReference(message.url)
    : message.type === 'load'
      ? loadAndParseCSV(message.url)
      : null;
  if (!task) return;

  task.catch(error => {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error)
    });
  });
};

async function loadAndParseCSV(url) {
  const text = await fetchTextWithRetry(url, 'fichier de données');
  self.postMessage({ type: 'status', message: 'Analyse des données...' });
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('CSV vide');
  self.postMessage({ type: 'result', rows });
}

async function loadAndPrepareCantonReference(url) {
  const text = await fetchTextWithRetry(url, 'référentiel des cantons');
  self.postMessage({ type: 'status', message: 'Analyse du référentiel cantons...' });
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('Référentiel cantons vide');

  const headers = rows[0].map(normalizeHeader);
  const findIndex = (...names) => names
    .map(name => headers.indexOf(normalizeHeader(name)))
    .find(index => index >= 0);
  const cityIndex = findIndex('nom_standard', 'nom_sans_accent', 'nom_commune');
  const deptIndex = findIndex('dep_code', 'code_departement', 'departement');
  const cantonIndex = findIndex('canton_nom', 'nom_canton', 'libelle_canton');
  const cantonCodeIndex = findIndex('canton_code', 'code_canton');
  const latIndex = findIndex('latitude_centre', 'latitude', 'lat');
  const lonIndex = findIndex('longitude_centre', 'longitude', 'lon');

  const reference = [];
  for (let index = 1; index < rows.length; index++) {
    const columns = rows[index];
    const canton = columns[cantonIndex] || columns[cantonCodeIndex] || '';
    const city = columns[cityIndex] || '';
    const dept = String(columns[deptIndex] || '').padStart(2, '0');
    if (!canton || !city || !dept) continue;
    reference.push({
      city,
      cityNorm: normalizeHeader(city),
      dept,
      canton,
      cantonNorm: normalizeHeader(canton),
      lat: parseCoordinate(columns[latIndex]),
      lon: parseCoordinate(columns[lonIndex])
    });
  }

  self.postMessage({ type: 'canton-result', rows: reference });
}

async function fetchTextWithRetry(url, label) {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      self.postMessage({
        type: 'status',
        message: attempt === 1 ? `Téléchargement du ${label}...` : `Nouvelle tentative — ${label}...`
      });

      const response = await fetch(url, {
        cache: 'force-cache',
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await wait(500);
    }
  }

  throw lastError || new Error('Chargement CSV impossible');
}

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\ufeff/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseCoordinate(value) {
  const parsed = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function wait(delay) {
  return new Promise(resolve => self.setTimeout(resolve, delay));
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        field += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') index++;
      row.push(field);
      if (row.some(value => String(value).trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some(value => String(value).trim() !== '')) rows.push(row);
  }

  return rows;
}
