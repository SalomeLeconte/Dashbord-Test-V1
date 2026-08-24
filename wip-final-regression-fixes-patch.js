(() => {
  const PATCH_ID = 'wip-final-regression-fixes-2026-08-24';
  if (window.__WIP_FINAL_REGRESSION_FIXES_PATCH__ === PATCH_ID) return;
  window.__WIP_FINAL_REGRESSION_FIXES_PATCH__ = PATCH_ID;

  const HOME_KEY = 'wip.routeStart.home.v1';
  const MODE_KEY = 'wip.routeStart.mode.v1';
  const pendingTimers = new Map();

  const deburr = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const norm = (value) => deburr(value).toLowerCase().replace(/\s+/g, ' ').trim();
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const col = (key) => {
    try { return window.COL?.[key] || ''; } catch (error) { return ''; }
  };

  function schedule(key, fn, delay = 0) {
    clearTimeout(pendingTimers.get(key));
    pendingTimers.set(key, setTimeout(() => {
      pendingTimers.delete(key);
      try { fn(); } catch (error) { console.warn(`WIP regression fix failed: ${key}`, error); }
    }, delay));
  }

  // ---------------------------------------------------------------------------
  // 1) Filtres type Excel : localisation précise, notamment département.
  // ---------------------------------------------------------------------------
  function canonicalDept(value) {
    const raw = norm(value).toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!raw) return '';
    if (/^2A$/i.test(raw) || /^20A$/i.test(raw)) return '2A';
    if (/^2B$/i.test(raw) || /^20B$/i.test(raw)) return '2B';
    if (/^97[1-8]$/.test(raw) || /^98[4-8]$/.test(raw)) return raw;
    if (/^\d$/.test(raw)) return raw.padStart(2, '0');
    if (/^\d{2}$/.test(raw)) return raw;
    if (/^\d{3}$/.test(raw)) return raw;
    return raw;
  }

  function postalFromRow(row) {
    const fields = [
      row?.codePostal,
      row?.CodePostal,
      row?.['Code postal'],
      row?.[col('cp')],
      row?.[col('adresse')],
      row?.['Adresse complète'],
      row?.Adresse,
      row?.adresse
    ];
    for (const value of fields) {
      const match = String(value ?? '').match(/\b(\d{5})\b/);
      if (match) return match[1];
    }
    return '';
  }

  function deptFromRow(row) {
    const direct = [row?._deptNorm, row?.[col('dept')], row?.Departement, row?.Département, row?.DEPARTEMENT, row?.departement]
      .map((value) => canonicalDept(value))
      .find(Boolean);
    if (direct) return direct;
    const postal = postalFromRow(row);
    if (!postal) return '';
    if (/^97[1-8]/.test(postal) || /^98[4-8]/.test(postal)) return postal.slice(0, 3);
    return postal.slice(0, 2);
  }

  function cityFromRow(row) {
    const fields = [
      row?.[col('ville')],
      row?.libelleCommuneEtablissement,
      row?.LibelleCommuneEtablissement,
      row?.Commune,
      row?.Ville,
      row?.ville
    ];
    for (const value of fields) {
      const text = String(value ?? '').trim();
      if (text) return text;
    }
    const address = String(row?.[col('adresse')] || row?.['Adresse complète'] || row?.Adresse || '').trim();
    const match = address.match(/\b\d{5}\b\s+(.+)$/);
    return match ? match[1].trim() : '';
  }

  function agencyFromRow(row) {
    return String(row?.[col('agence')] || row?.Agence || row?.agence || '').trim();
  }

  function cantonFromRow(row) {
    return String(row?.Canton || row?.['Canton (Nom)'] || row?.['Client_Irium.Canton'] || row?.canton || '').trim();
  }

  function locationPass(row, query) {
    const q = String(query ?? '').trim();
    if (!q) return true;
    const qNorm = norm(q);
    const qCompact = qNorm.toUpperCase().replace(/[^0-9A-Z]/g, '');
    const dept = deptFromRow(row);
    const postal = postalFromRow(row);
    const city = cityFromRow(row);
    const agency = agencyFromRow(row);
    const canton = cantonFromRow(row);
    const address = String(row?.[col('adresse')] || row?.['Adresse complète'] || row?.Adresse || '').trim();

    // Cas département : 1, 01, 45, 971, 2A... => comparaison stricte sur le département.
    if (/^(\d{1,3}|2A|2B|20A|20B)$/i.test(qCompact)) {
      return canonicalDept(qCompact) === dept;
    }

    // Cas code postal complet.
    if (/^\d{5}$/.test(qCompact)) return postal === qCompact;

    // Cas texte : ville, canton, agence ou adresse. On accepte le partiel uniquement sur texte.
    const textTargets = [city, canton, agency, address].map(norm).filter(Boolean);
    return textTargets.some((value) => value.includes(qNorm));
  }

  function tableState(table) {
    const state = window.__wipTableQuickFilterState || {};
    return state[table] || {};
  }

  function applyPreciseLocation(rows, table) {
    const locText = tableState(table).locText || '';
    if (!locText || !Array.isArray(rows)) return rows;
    return rows.filter((row) => locationPass(row, locText));
  }

  function wrapFunction(name, wrapperFactory) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipFinalRegressionFix) return;
    const wrapped = wrapperFactory(current);
    wrapped.__wipFinalRegressionFix = true;
    window[name] = wrapped;
    try { eval(`${name} = window[name]`); } catch (error) {}
  }

  function installPreciseExcelFilters() {
    if (typeof window.__wipRegisterGridDataTransform === 'function') {
      window.__wipRegisterGridDataTransform('wip-precise-location-filter', (rows) => applyPreciseLocation(rows, 'data'));
    }

    wrapFunction('renderGrid', (current) => function renderGridWithPreciseLocation(rows, ...rest) {
      return current.call(this, applyPreciseLocation(rows, 'data'), ...rest);
    });

    wrapFunction('getTop200Data', (current) => function getTop200DataWithPreciseLocation(...args) {
      return applyPreciseLocation(current.apply(this, args), 'top');
    });

    const menu = document.getElementById('wip-column-filter-menu');
    menu?.querySelectorAll('input[data-field="locText"]').forEach((input) => {
      input.placeholder = 'Dépt exact, ville, canton, agence...';
    });
  }

  // ---------------------------------------------------------------------------
  // 2) Départ itinéraire : position actuelle ou domicile saisi manuellement.
  // ---------------------------------------------------------------------------
  function readHome() {
    try { return JSON.parse(localStorage.getItem(HOME_KEY) || 'null') || null; } catch (error) { return null; }
  }

  function writeHome(home) {
    localStorage.setItem(HOME_KEY, JSON.stringify(home));
  }

  function routeStartMode() {
    return localStorage.getItem(MODE_KEY) || 'current';
  }

  function setRouteStartMode(mode) {
    localStorage.setItem(MODE_KEY, mode === 'home' ? 'home' : 'current');
  }

  function parseLatLng(value) {
    const match = String(value || '').trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);
    if (!match) return null;
    const lat = Number(match[1].replace(',', '.'));
    const lng = Number(match[2].replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }

  async function resolveAddress(value) {
    const manual = parseLatLng(value);
    if (manual) return manual;

    try {
      if (typeof window.geocodeAddress === 'function') {
        const result = await window.geocodeAddress(value);
        if (Array.isArray(result) && Number.isFinite(result[0]) && Number.isFinite(result[1])) return { lat: result[0], lng: result[1] };
        if (result && Number.isFinite(result.lat) && Number.isFinite(result.lng)) return { lat: result.lat, lng: result.lng };
        if (result && Number.isFinite(result.latitude) && Number.isFinite(result.longitude)) return { lat: result.latitude, lng: result.longitude };
      }
    } catch (error) {}

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=${encodeURIComponent(value)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) throw new Error('Adresse introuvable');
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Coordonnées invalides');
    return { lat, lng };
  }

  function fakeHomePosition(success) {
    const home = readHome();
    if (!home || !Number.isFinite(home.lat) || !Number.isFinite(home.lng)) return false;
    success({
      coords: {
        latitude: home.lat,
        longitude: home.lng,
        accuracy: 25,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    });
    return true;
  }

  function patchGeolocation() {
    const geo = navigator.geolocation;
    if (!geo || geo.__wipHomeStartPatched) return;
    const originalGet = geo.getCurrentPosition?.bind(geo);
    const originalWatch = geo.watchPosition?.bind(geo);

    if (originalGet) {
      geo.getCurrentPosition = function getCurrentPositionWithHome(success, error, options) {
        if (routeStartMode() === 'home' && fakeHomePosition(success)) return undefined;
        return originalGet(success, error, options);
      };
    }

    if (originalWatch) {
      geo.watchPosition = function watchPositionWithHome(success, error, options) {
        if (routeStartMode() === 'home' && fakeHomePosition(success)) return 777001;
        return originalWatch(success, error, options);
      };
    }

    geo.__wipHomeStartPatched = true;
  }

  function setRouteStartStatus(message, isError = false) {
    const node = document.getElementById('wip-route-home-status');
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('is-error', !!isError);
  }

  function installRouteHomeUi() {
    const status = document.getElementById('route-status');
    const routePanel = status?.closest?.('section, .rounded-2xl, .route-panel, div') || status?.parentElement;
    if (!routePanel || document.getElementById('wip-route-start-home')) return;

    const home = readHome();
    const mode = routeStartMode();
    const address = home?.address || '';
    const label = home?.lat && home?.lng ? `${home.lat.toFixed(5)}, ${home.lng.toFixed(5)}` : '';

    routePanel.insertAdjacentHTML('afterbegin', `
      <div id="wip-route-start-home" class="wip-route-start-home">
        <div class="wip-route-start-title">Point de départ</div>
        <div class="wip-route-start-choice">
          <label><input type="radio" name="wip-route-start-mode" value="current" ${mode !== 'home' ? 'checked' : ''}> Position actuelle</label>
          <label><input type="radio" name="wip-route-start-mode" value="home" ${mode === 'home' ? 'checked' : ''}> Domicile</label>
        </div>
        <div class="wip-route-home-fields">
          <input id="wip-route-home-address" type="text" value="${esc(address)}" placeholder="Adresse domicile ou lat,lng">
          <button id="wip-route-home-save" type="button">Enregistrer</button>
        </div>
        <div id="wip-route-home-status" class="wip-route-home-status">${label ? `Domicile enregistré : ${esc(label)}` : ''}</div>
      </div>
    `);

    routePanel.querySelectorAll('input[name="wip-route-start-mode"]').forEach((input) => {
      input.addEventListener('change', () => {
        setRouteStartMode(input.value);
        if (input.value === 'home' && !readHome()) setRouteStartStatus('Renseigne puis enregistre ton domicile avant de tracer.', true);
        else setRouteStartStatus(input.value === 'home' ? 'Départ domicile activé.' : 'Départ position actuelle activé.');
      });
    });

    document.getElementById('wip-route-home-save')?.addEventListener('click', async () => {
      const input = document.getElementById('wip-route-home-address');
      const value = String(input?.value || '').trim();
      if (!value) {
        setRouteStartStatus('Adresse domicile manquante.', true);
        return;
      }
      setRouteStartStatus('Recherche du domicile...');
      try {
        const coords = await resolveAddress(value);
        writeHome({ address: value, lat: coords.lat, lng: coords.lng });
        setRouteStartMode('home');
        document.querySelector('input[name="wip-route-start-mode"][value="home"]')?.click();
        setRouteStartStatus(`Domicile enregistré : ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      } catch (error) {
        setRouteStartStatus('Adresse introuvable. Essaie une adresse plus complète ou lat,lng.', true);
      }
    });
  }

  function installRouteStartFix() {
    patchGeolocation();
    installRouteHomeUi();
  }

  // ---------------------------------------------------------------------------
  // 3) Noms Inconnu : fallback sur les autres colonnes exploitables.
  // ---------------------------------------------------------------------------
  function badName(value) {
    const text = norm(value);
    return !text || text === 'inconnu' || text === 'unknown' || text === 'nan' || text === 'null' || text === '-';
  }

  function fallbackName(row) {
    const keys = [
      col('nom'),
      'denominationUniteLegale',
      'Dénomination',
      'Denomination',
      'Raison sociale',
      'Client_Irium.Groupe (Libellé)',
      'Client_Irium.Groupe',
      'Groupe (Libellé)',
      col('groupe'),
      'Nom',
      'Client',
      'Entreprise'
    ].filter(Boolean);

    for (const key of keys) {
      const value = String(row?.[key] ?? '').trim();
      if (!badName(value)) return value;
    }

    const number = String(row?.[col('clientNumero')] || row?.['Client_Irium.Client (Numéro)'] || '').trim();
    if (number) return `Client Irium ${number}`;

    const siret = String(row?.[col('siret')] || row?.siret || row?.SIRET || '').trim();
    if (siret) return `SIRET ${siret}`;

    return '';
  }

  function repairRowName(row) {
    if (!row) return;
    const nameKey = col('nom') || 'denominationUniteLegale';
    const current = row[nameKey] || row.denominationUniteLegale;
    if (!badName(current)) return;
    const fallback = fallbackName(row);
    if (!fallback) return;
    row[nameKey] = fallback;
    row.denominationUniteLegale = fallback;
    row._wipNameRepaired = true;
  }

  function repairAllNames() {
    const seen = new Set();
    [window.globalData, window.currentFilteredData]
      .filter(Array.isArray)
      .flat()
      .forEach((row) => {
        if (!row || seen.has(row)) return;
        seen.add(row);
        repairRowName(row);
      });
  }

  function installUnknownNameFix() {
    repairAllNames();
    wrapFunction('renderGrid', (current) => function renderGridWithNameRepair(rows, ...rest) {
      if (Array.isArray(rows)) rows.forEach(repairRowName);
      repairAllNames();
      return current.call(this, rows, ...rest);
    });
    wrapFunction('renderTop200', (current) => function renderTop200WithNameRepair(...args) {
      repairAllNames();
      return current.apply(this, args);
    });
    wrapFunction('openDetails', (current) => function openDetailsWithNameRepair(rowIndex, ...args) {
      repairAllNames();
      return current.call(this, rowIndex, ...args);
    });
  }

  function installStyle() {
    if (document.getElementById('wip-final-regression-fixes-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-final-regression-fixes-style';
    style.textContent = `
      .wip-route-start-home{margin:0 0 10px;padding:10px;border:1px solid #e5e7eb;border-radius:14px;background:#fffdf3;color:#334155;font-size:11px}
      .dark .wip-route-start-home{background:rgba(234,179,8,.08);border-color:#334155;color:#e2e8f0}
      .wip-route-start-title{font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.09em;color:#92400e;margin-bottom:6px}.dark .wip-route-start-title{color:#facc15}
      .wip-route-start-choice{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px}.wip-route-start-choice label{display:inline-flex;align-items:center;gap:5px;font-weight:800}
      .wip-route-home-fields{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.wip-route-home-fields input{min-width:0;border:1px solid #e5e7eb;border-radius:10px;padding:7px 9px;background:#fff;font-size:11px}.dark .wip-route-home-fields input{background:#0f172a;border-color:#334155;color:#e2e8f0}
      .wip-route-home-fields button{border:1px solid #eab308;border-radius:10px;background:#facc15;color:#111827;padding:7px 10px;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em}
      .wip-route-home-status{min-height:14px;margin-top:6px;font-size:10px;font-weight:800;color:#64748b}.wip-route-home-status.is-error{color:#dc2626}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    installUnknownNameFix();
    installPreciseExcelFilters();
    installRouteStartFix();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => [100, 300, 700, 1200, 2200, 4200, 8000].forEach((delay) => setTimeout(install, delay)));
  [150, 500, 1000, 1800, 3200, 5600, 9500, 14500, 21000].forEach((delay) => setTimeout(install, delay));
  try { new MutationObserver(() => schedule('install', install, 0)).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
