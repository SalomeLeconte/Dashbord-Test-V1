(() => {
  const PATCH_ID = 'wip-canton-adaptive-filter-2026-08-07-r2';
  if (window.__WIP_CANTON_ADAPTIVE_FILTER_PATCH__ === PATCH_ID) return;
  window.__WIP_CANTON_ADAPTIVE_FILTER_PATCH__ = PATCH_ID;

  const COMMUNES_URL = 'https://static.data.gouv.fr/resources/communes-et-villes-de-france-en-csv-excel-json-parquet-et-feather/20260617-155950/communes-france-2026.csv';
  const state = window.__wipAdaptiveCantonState || {
    selected: '',
    radiusKm: 25,
    nearbyOnly: false,
    gps: null,
    options: [],
    loading: false,
    error: ''
  };
  window.__wipAdaptiveCantonState = state;

  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = value => {
    const n = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  };
  const col = key => { try { return COL?.[key] || ''; } catch (e) { return ''; } };
  const deptOf = row => String(row?._deptNorm || row?.[col('dept')] || row?.Departement || '').padStart(2, '0').trim();
  const cityOf = row => String(row?.[col('ville')] || row?.libelleCommuneEtablissement || row?.Ville || '').trim();
  const latOf = row => Number.isFinite(row?._lat) ? row._lat : num(row?.[col('lat')] || row?.Latitude || row?.latitude);
  const lonOf = row => Number.isFinite(row?._lon) ? row._lon : num(row?.[col('lon')] || row?.Longitude || row?.longitude);
  const existingCanton = row => String(row?.Canton || row?.['Canton (Nom)'] || row?.['Client_Irium.Canton'] || row?.libelleCanton || row?.canton || '').trim();

  function parseCsvLine(line) {
    const out = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i++; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) {
        out.push(value);
        value = '';
      } else value += c;
    }
    out.push(value);
    return out;
  }

  function distanceKm(aLat, aLon, bLat, bLon) {
    if (![aLat, aLon, bLat, bLon].every(Number.isFinite)) return Infinity;
    const R = 6371;
    const dLat = (bLat - aLat) * Math.PI / 180;
    const dLon = (bLon - aLon) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  async function loadReference() {
    if (Array.isArray(window.__wipCantonReference) && window.__wipCantonReference.length) return window.__wipCantonReference;
    if (window.__wipCantonReferencePromise) return window.__wipCantonReferencePromise;

    state.loading = true;
    state.error = '';
    updateStatus();
    window.__wipCantonReferencePromise = (async () => {
      try {
        let rows;
        try {
          rows = await loadReferenceInWorker();
        } catch (workerError) {
          console.warn('Worker cantons indisponible, utilisation du chargement de secours.', workerError);
          rows = await loadReferenceOnMainThread();
        }
        window.__wipCantonReference = rows;
        state.loading = false;
        updateStatus();
        return rows;
      } catch (error) {
        console.warn('Référentiel cantons indisponible', error);
        state.loading = false;
        state.error = 'Référentiel cantons indisponible';
        updateStatus();
        window.__wipCantonReference = [];
        return [];
      } finally {
        window.__wipCantonReferencePromise = null;
      }
    })();
    return window.__wipCantonReferencePromise;
  }

  function loadReferenceInWorker() {
    if (typeof Worker === 'undefined') return Promise.reject(new Error('Web Worker non pris en charge'));
    return new Promise((resolve, reject) => {
      const workerUrl = new URL('./csv-data-worker.js', document.baseURI);
      let worker;
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        worker?.terminate();
        callback(value);
      };
      const timeoutId = window.setTimeout(() => finish(reject, new Error('Délai du référentiel cantons dépassé')), 90000);
      try {
        worker = new Worker(workerUrl.href, { name: 'dashboard-canton-loader' });
      } catch (error) {
        finish(reject, error);
        return;
      }
      worker.onmessage = event => {
        const message = event.data || {};
        if (message.type === 'error') finish(reject, new Error(message.message || 'Erreur du worker cantons'));
        if (message.type === 'canton-result') finish(resolve, Array.isArray(message.rows) ? message.rows : []);
      };
      worker.onerror = event => finish(reject, new Error(event.message || 'Erreur du worker cantons'));
      worker.postMessage({ type: 'load-canton', url: COMMUNES_URL });
    });
  }

  async function loadReferenceOnMainThread() {
    const response = await fetch(COMMUNES_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(lines.shift()).map(norm);
    const idx = (...names) => names.map(name => headers.indexOf(norm(name))).find(i => i >= 0);
    const iCity = idx('nom_standard', 'nom_sans_accent', 'nom_commune');
    const iDept = idx('dep_code', 'code_departement', 'departement');
    const iCanton = idx('canton_nom', 'nom_canton', 'libelle_canton');
    const iCantonCode = idx('canton_code', 'code_canton');
    const iLat = idx('latitude_centre', 'latitude', 'lat');
    const iLon = idx('longitude_centre', 'longitude', 'lon');
    return lines.map(line => {
      const cols = parseCsvLine(line);
      const canton = cols[iCanton] || cols[iCantonCode] || '';
      const city = cols[iCity] || '';
      const dept = String(cols[iDept] || '').padStart(2, '0');
      if (!canton || !city || !dept) return null;
      return {
        city,
        cityNorm: norm(city),
        dept,
        canton,
        cantonNorm: norm(canton),
        lat: num(cols[iLat]),
        lon: num(cols[iLon])
      };
    }).filter(Boolean);
  }

  function cantonForRow(row) {
    if (!row) return '';
    if (row._wipAutoCanton) return row._wipAutoCanton;
    const existing = existingCanton(row);
    if (existing) return row._wipAutoCanton = existing;
    const ref = window.__wipCantonReference || [];
    const dept = deptOf(row);
    const city = norm(cityOf(row));
    let found = ref.find(item => item.dept === dept && item.cityNorm === city)
      || ref.find(item => item.dept === dept && city && (item.cityNorm.includes(city) || city.includes(item.cityNorm)));
    if (!found) {
      const lat = latOf(row), lon = lonOf(row);
      let best = null;
      ref.filter(item => item.dept === dept && Number.isFinite(item.lat) && Number.isFinite(item.lon)).forEach(item => {
        const d = distanceKm(lat, lon, item.lat, item.lon);
        if (!best || d < best.distance) best = { ...item, distance: d };
      });
      if (best && best.distance <= 15) found = best;
    }
    row._wipAutoCanton = found?.canton || '';
    return row._wipAutoCanton;
  }

  function selectedDept() {
    const raw = String(document.getElementById('f-dept')?.value || '').trim();
    return raw ? raw.padStart(2, '0') : '';
  }
  function citySearch() { return norm(document.getElementById('f-ville')?.value || ''); }

  function optionsFromRows(rows) {
    const map = new Map();
    (rows || []).forEach(row => {
      const canton = cantonForRow(row);
      if (canton) map.set(norm(canton), canton);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  }

  async function computeOptions({ loadRemote = true } = {}) {
    const ref = loadRemote
      ? await loadReference()
      : (Array.isArray(window.__wipCantonReference) ? window.__wipCantonReference : []);
    const dept = selectedDept();
    const city = citySearch();
    let options = [];
    if (state.nearbyOnly && state.gps && ref.length) {
      const radius = Number(state.radiusKm || 25);
      const map = new Map();
      ref.filter(item => distanceKm(state.gps.lat, state.gps.lon, item.lat, item.lon) <= radius)
        .forEach(item => map.set(item.cantonNorm, item.canton));
      options = [...map.values()];
    } else if (city && ref.length) {
      const centers = ref.filter(item => (!dept || item.dept === dept) && (item.cityNorm.includes(city) || city.includes(item.cityNorm)) && Number.isFinite(item.lat) && Number.isFinite(item.lon));
      const radius = Math.max(10, Number(state.radiusKm || 25));
      const map = new Map();
      centers.forEach(center => {
        ref.filter(item => (!dept || item.dept === dept) && distanceKm(center.lat, center.lon, item.lat, item.lon) <= radius)
          .forEach(item => map.set(item.cantonNorm, item.canton));
      });
      options = [...map.values()];
    } else if (dept && ref.length) {
      const map = new Map();
      ref.filter(item => item.dept === dept).forEach(item => map.set(item.cantonNorm, item.canton));
      options = [...map.values()];
    } else {
      options = optionsFromRows(globalData || []);
      if (!options.length && ref.length) options = [...new Map(ref.map(item => [item.cantonNorm, item.canton])).values()];
    }
    state.options = options.sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
    renderOptions();
  }

  function renderOptions() {
    const select = document.getElementById('f-canton-adaptive-select');
    if (!select) return;
    const current = state.selected || select.value || '';
    select.innerHTML = '<option value="">Tous les cantons</option>' + state.options.map(canton => `<option value="${esc(canton)}">${esc(canton)}</option>`).join('');
    if (current && state.options.some(canton => norm(canton) === norm(current))) select.value = current;
    else if (current) { state.selected = ''; select.value = ''; }
    updateStatus();
  }

  function updateStatus() {
    const el = document.getElementById('f-canton-adaptive-status');
    if (!el) return;
    if (state.loading) el.textContent = 'Chargement du référentiel cantons...';
    else if (state.error) el.textContent = state.error;
    else if (state.nearbyOnly && state.gps) el.textContent = `${state.options.length || 0} canton(s) autour de moi à ${state.radiusKm} km`;
    else el.textContent = `${state.options.length || 0} canton(s) proposé(s)`;
  }

  function installUi() {
    if (document.getElementById('wip-canton-adaptive-filter')) return;
    const deptField = document.getElementById('f-dept');
    const cityField = document.getElementById('f-ville');
    const anchor = cityField?.closest('label,div') || deptField?.closest('label,div') || document.getElementById('filters-panel') || document.querySelector('aside');
    if (!anchor) return;
    anchor.insertAdjacentHTML('afterend', `
      <div id="wip-canton-adaptive-filter" class="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 p-3 space-y-2">
        <div class="text-[11px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-200">Canton adaptatif</div>
        <select id="f-canton-adaptive-select" class="w-full rounded-xl border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <option value="">Tous les cantons</option>
        </select>
        <div class="grid grid-cols-3 gap-1">
          <button type="button" data-canton-radius="10" class="wip-canton-radius">10 km</button>
          <button type="button" data-canton-radius="25" class="wip-canton-radius is-active">25 km</button>
          <button type="button" data-canton-radius="50" class="wip-canton-radius">50 km</button>
        </div>
        <button type="button" id="f-canton-nearby" class="w-full rounded-xl border border-blue-300 dark:border-blue-500/50 bg-white dark:bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-200">Cantons autour de moi</button>
        <button type="button" id="f-canton-reset" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">Réinitialiser canton</button>
        <div id="f-canton-adaptive-status" class="text-[10px] text-slate-400">Initialisation...</div>
      </div>`);
    const cantonSelect = document.getElementById('f-canton-adaptive-select');
    cantonSelect?.addEventListener('change', event => {
      state.selected = event.target.value || '';
      state.nearbyOnly = false;
      safeRunFilter();
    });
    cantonSelect?.addEventListener('focus', () => computeOptions());
    document.getElementById('f-canton-reset')?.addEventListener('click', () => {
      state.selected = '';
      state.nearbyOnly = false;
      const select = document.getElementById('f-canton-adaptive-select');
      if (select) select.value = '';
      safeRunFilter();
      computeOptions();
    });
    document.querySelectorAll('[data-canton-radius]').forEach(btn => btn.addEventListener('click', () => {
      state.radiusKm = Number(btn.dataset.cantonRadius || 25);
      document.querySelectorAll('[data-canton-radius]').forEach(item => item.classList.toggle('is-active', item === btn));
      computeOptions();
    }));
    document.getElementById('f-canton-nearby')?.addEventListener('click', requestNearby);
    [deptField, cityField].forEach(field => field?.addEventListener('input', () => computeOptions()));
    [deptField, cityField].forEach(field => field?.addEventListener('change', () => computeOptions()));
    computeOptions({ loadRemote: false });
  }

  function requestNearby() {
    if (!navigator.geolocation) {
      state.error = 'GPS indisponible dans ce navigateur';
      updateStatus();
      return;
    }
    state.loading = true;
    updateStatus();
    navigator.geolocation.getCurrentPosition(pos => {
      state.gps = { lat: Number(pos.coords.latitude), lon: Number(pos.coords.longitude) };
      state.nearbyOnly = true;
      state.loading = false;
      computeOptions().then(safeRunFilter);
    }, error => {
      state.loading = false;
      state.error = error.code === 1 ? 'Autorisation GPS refusée' : 'Position GPS indisponible';
      updateStatus();
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  function rowPass(row) {
    if (!state.selected && !state.nearbyOnly) return true;
    const canton = cantonForRow(row);
    if (state.selected && norm(canton) !== norm(state.selected)) return false;
    if (state.nearbyOnly && state.gps) {
      const lat = latOf(row), lon = lonOf(row);
      if (![lat, lon].every(Number.isFinite)) return false;
      if (distanceKm(state.gps.lat, state.gps.lon, lat, lon) > Number(state.radiusKm || 25)) return false;
    }
    return true;
  }
  function apply(rows) { return (Array.isArray(rows) ? rows : []).filter(rowPass); }
  function safeRunFilter() { try { if (typeof runFilter === 'function') runFilter(); } catch (e) {} }

  function addDetail(rowIndex) {
    const row = (globalData || []).find(item => item._rowIndex === rowIndex);
    if (!row) return;
    const body = document.querySelector('#details-modal .p-5.overflow-y-auto');
    if (!body || document.getElementById('wip-canton-detail')) return;
    const canton = cantonForRow(row);
    if (!canton) return;
    const html = `<div id="wip-canton-detail" class="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 p-3"><div class="text-[10px] uppercase tracking-widest font-black text-blue-700 dark:text-blue-200">Canton détecté</div><div class="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">${esc(canton)}</div></div>`;
    body.insertAdjacentHTML('afterbegin', html);
  }

  function installStyles() {
    if (document.getElementById('wip-canton-adaptive-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-canton-adaptive-style';
    style.textContent = `
      .wip-canton-radius{border:1px solid #bfdbfe;background:#fff;border-radius:.7rem;padding:.45rem .35rem;font-size:10px;font-weight:900;color:#1d4ed8;text-transform:uppercase}
      .wip-canton-radius.is-active{background:#dbeafe;border-color:#2563eb;color:#1e3a8a}
      .dark .wip-canton-radius{background:#0f172a;border-color:rgba(59,130,246,.45);color:#bfdbfe}
      .dark .wip-canton-radius.is-active{background:rgba(37,99,235,.35);border-color:#60a5fa;color:#dbeafe}
    `;
    document.head.appendChild(style);
  }

  function installPatches() {
    if (window.__wipCantonAdaptiveInstalled) return;
    window.__wipCantonAdaptiveInstalled = true;
    const oldRun = window.runFilter || runFilter;
    window.runFilter = runFilter = function cantonAdaptiveRunFilter() {
      oldRun.apply(this, arguments);
      if (Array.isArray(currentFilteredData)) {
        currentFilteredData = apply(currentFilteredData);
        try { renderGrid(currentFilteredData); } catch (e) {}
        try { updateActiveCounter(); } catch (e) {}
        try { if (typeof isMapVisible === 'function' && isMapVisible()) renderMap(currentFilteredData); } catch (e) {}
      }
    };
    if (typeof window.renderTop200 === 'function' || typeof renderTop200 === 'function') {
      const oldTop = window.renderTop200 || renderTop200;
      window.renderTop200 = renderTop200 = function cantonAdaptiveRenderTop200() {
        const saved = top200UseActiveFilters;
        top200UseActiveFilters = true;
        const savedData = currentFilteredData;
        if (Array.isArray(savedData)) currentFilteredData = apply(savedData);
        try { oldTop.apply(this, arguments); }
        finally { currentFilteredData = savedData; top200UseActiveFilters = saved; }
      };
    }
    if (typeof window.openDetails === 'function' || typeof openDetails === 'function') {
      const oldOpen = window.openDetails || openDetails;
      window.openDetails = openDetails = function cantonAdaptiveOpenDetails(rowIndex) {
        oldOpen.apply(this, arguments);
        window.setTimeout(() => addDetail(rowIndex), 80);
      };
    }
  }

  function boot() {
    installStyles();
    installUi();
    installPatches();
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('dashboard:data-ready', () => computeOptions({ loadRemote: false }));
  [300, 900, 1800, 3500, 6500].forEach(delay => window.setTimeout(boot, delay));
})();
