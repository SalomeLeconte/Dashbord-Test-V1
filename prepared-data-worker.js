/* global self */

self.onmessage = event => {
  const message = event.data || {};
  if (message.type !== 'load-prepared') return;
  const urls = Array.isArray(message.urls) ? message.urls.filter(Boolean) : [];
  const headers = Array.isArray(message.headers) ? message.headers : [];
  const metaColumns = Number(message.metaColumns) || 18;
  if (!urls.length || !headers.length) return;

  loadPrepared(urls, headers, metaColumns).catch(error => {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error)
    });
  });
};

async function loadPrepared(urls, headers, metaColumns) {
  const items = [];
  for (let chunkIndex = 0; chunkIndex < urls.length; chunkIndex++) {
    self.postMessage({
      type: 'status',
      message: `Chargement des données préparées ${chunkIndex + 1}/${urls.length}...`
    });
    const response = await fetch(urls[chunkIndex], {
      cache: 'force-cache',
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    for (const prepared of rows) items.push(prepareItem(prepared, headers, metaColumns));
  }

  self.postMessage({ type: 'result', headers, items });
}

function prepareItem(prepared, headers, metaColumns) {
  const item = {};
  const raw = prepared.slice(metaColumns);
  for (let index = 0; index < headers.length; index++) item[headers[index]] = raw[index] ?? '';

  item._rowIndex = prepared[0];
  item._deptNorm = prepared[1] || '';
  item._pssrNorms = Array.isArray(prepared[2]) ? prepared[2] : [];
  item._lat = prepared[3];
  item._lon = prepared[4];
  item._searchNom = prepared[5] || '';
  item._searchVille = prepared[6] || '';
  item._searchCanton = prepared[7] || '';
  item._searchMachines = prepared[8] || '';
  item._searchSeries = prepared[9] || '';
  item._searchNaf = prepared[10] || '';
  item._ageMachineAllSearch = prepared[11] || '';
  item._adresseSearch = prepared[12] || '';
  item._perf = {
    ca2025: Number(prepared[13]) || 0,
    ca2026: Number(prepared[14]) || 0,
    caGlobal: Number(prepared[15]) || 0,
    clientEligible: prepared[16] === 1,
    hasNewMachine: prepared[17] === 1
  };
  return item;
}
