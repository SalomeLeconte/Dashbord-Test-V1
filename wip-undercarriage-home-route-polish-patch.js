(() => {
  const PATCH_ID = 'wip-undercarriage-home-route-polish-2026-08-24';
  if (window.__WIP_UNDERCARRIAGE_HOME_ROUTE_POLISH_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_HOME_ROUTE_POLISH_PATCH__ = PATCH_ID;

  const HOME_KEY = 'wip.routeStart.home.v1';
  const MODE_KEY = 'wip.routeStart.mode.v1';
  let retryingRouteClick = false;
  let geolocationPatched = false;

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

  function readHome() {
    try { return JSON.parse(localStorage.getItem(HOME_KEY) || 'null') || null; } catch (error) { return null; }
  }

  function writeHome(home) {
    localStorage.setItem(HOME_KEY, JSON.stringify(home));
  }

  function setMode(mode) {
    localStorage.setItem(MODE_KEY, mode === 'home' ? 'home' : 'current');
  }

  function getMode() {
    return localStorage.getItem(MODE_KEY) || 'current';
  }

  function parseLatLng(value) {
    const match = String(value || '').trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);
    if (!match) return null;
    const lat = Number(match[1].replace(',', '.'));
    const lng = Number(match[2].replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }

  function validateHomeInput(value) {
    const text = String(value || '').trim();
    if (!text) return { ok: false, message: 'Indique au minimum : rue, ville.' };
    if (parseLatLng(text)) return { ok: true };

    const parts = text.split(/[,;]+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) return { ok: false, message: 'Format attendu : rue, ville.' };

    const street = parts[0];
    const city = parts.slice(1).join(' ');
    if (street.length < 4 || city.length < 2) return { ok: false, message: 'Indique une rue et une ville exploitables.' };
    return { ok: true };
  }

  async function resolveHomeAddress(value) {
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

  function getRouteStartSelects() {
    return [...document.querySelectorAll('select')].filter((select) => {
      const text = norm([...select.options].map((option) => option.textContent || '').join(' '));
      return text.includes('position hors itineraire')
        || text.includes('ma position au depart')
        || text.includes('ma position a l arrivee')
        || text.includes('domicile');
    });
  }

  function optionText(option) {
    return norm(option?.textContent || '');
  }

  function findCurrentStartOption(select) {
    return [...select.options].find((option) => {
      const text = optionText(option);
      return text.includes('ma position au depart') || (text.includes('position') && text.includes('depart') && !text.includes('arrivee'));
    }) || null;
  }

  function ensureHomeOption(select) {
    const currentStart = findCurrentStartOption(select);
    const startValue = currentStart?.value || 'home-start';
    let homeOption = [...select.options].find((option) => option.dataset?.wipHomeStart === 'true' || optionText(option).includes('domicile'));
    if (!homeOption) {
      homeOption = document.createElement('option');
      homeOption.textContent = 'DOMICILE AU DÉPART';
      select.appendChild(homeOption);
    }
    homeOption.dataset.wipHomeStart = 'true';
    homeOption.value = startValue;
    homeOption.textContent = 'DOMICILE AU DÉPART';
    return homeOption;
  }

  function selectedHomeSelects() {
    return getRouteStartSelects().filter((select) => {
      const selected = select.selectedOptions?.[0];
      return selected?.dataset?.wipHomeStart === 'true' || optionText(selected).includes('domicile');
    });
  }

  function isHomeSelected() {
    return selectedHomeSelects().length > 0 || getMode() === 'home';
  }

  function ensureHomePanel() {
    let panel = document.getElementById('wip-home-route-start-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'wip-home-route-start-panel';
      panel.innerHTML = `
        <label class="wip-home-route-label">
          <span>Domicile de départ</span>
          <input id="wip-home-route-input" type="text" placeholder="Rue, ville (minimum)" autocomplete="street-address">
        </label>
        <div class="wip-home-route-actions">
          <button type="button" id="wip-home-route-save">Enregistrer le domicile</button>
          <span id="wip-home-route-status"></span>
        </div>
      `;

      const firstSelect = getRouteStartSelects()[0];
      const anchor = firstSelect?.closest?.('label, .route-control, .route-settings, .leaflet-control, div') || firstSelect?.parentElement;
      if (anchor?.parentElement) anchor.insertAdjacentElement('afterend', panel);
      else document.body.appendChild(panel);
    }

    const input = panel.querySelector('#wip-home-route-input');
    const home = readHome();
    if (input && home?.address && !input.value) input.value = home.address;
    return panel;
  }

  function showHomeStatus(message, isError = false) {
    const status = document.getElementById('wip-home-route-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  async function saveHomeFromPanel() {
    const panel = ensureHomePanel();
    const input = panel.querySelector('#wip-home-route-input');
    const value = String(input?.value || '').trim();
    const validation = validateHomeInput(value);
    if (!validation.ok) {
      showHomeStatus(validation.message, true);
      return null;
    }

    showHomeStatus('Recherche du domicile...', false);
    try {
      const coords = await resolveHomeAddress(value);
      const home = { address: value, label: 'Domicile', lat: coords.lat, lng: coords.lng, savedAt: Date.now() };
      writeHome(home);
      setMode('home');
      showHomeStatus('Domicile enregistré.', false);
      patchGeolocation();
      ensureHomeRouteListItem();
      return home;
    } catch (error) {
      showHomeStatus('Adresse introuvable. Vérifie rue, ville.', true);
      return null;
    }
  }

  function syncHomeUI() {
    getRouteStartSelects().forEach((select) => ensureHomeOption(select));
    const active = selectedHomeSelects().length > 0;
    setMode(active ? 'home' : 'current');
    const panel = ensureHomePanel();
    panel.style.display = active ? 'block' : 'none';
    panel.classList.toggle('is-active', active);
    if (!active) return;
    const home = readHome();
    const input = panel.querySelector('#wip-home-route-input');
    if (home?.address && input && !input.value) input.value = home.address;
  }

  function patchGeolocation() {
    if (geolocationPatched) return;
    const geo = navigator.geolocation;
    if (!geo) return;
    const originalGet = geo.getCurrentPosition?.bind(geo);
    const originalWatch = geo.watchPosition?.bind(geo);

    if (originalGet) {
      geo.getCurrentPosition = function getCurrentPositionWithWipHome(success, error, options) {
        const home = readHome();
        if (isHomeSelected() && home && Number.isFinite(home.lat) && Number.isFinite(home.lng)) {
          success({ coords: { latitude: home.lat, longitude: home.lng, accuracy: 25 }, timestamp: Date.now() });
          return undefined;
        }
        return originalGet(success, error, options);
      };
    }

    if (originalWatch) {
      geo.watchPosition = function watchPositionWithWipHome(success, error, options) {
        const home = readHome();
        if (isHomeSelected() && home && Number.isFinite(home.lat) && Number.isFinite(home.lng)) {
          success({ coords: { latitude: home.lat, longitude: home.lng, accuracy: 25 }, timestamp: Date.now() });
          return 241024;
        }
        return originalWatch(success, error, options);
      };
    }
    geolocationPatched = true;
  }

  function homeRouteRow() {
    const home = readHome();
    if (!home || !Number.isFinite(home.lat) || !Number.isFinite(home.lng)) return null;
    return {
      __wipHomeStart: true,
      _wipHomeStart: true,
      _rowIndex: 'wip-home-start',
      denominationUniteLegale: 'Domicile',
      Nom: 'Domicile',
      Client: 'Domicile',
      siret: 'DOMICILE',
      SIRET: 'DOMICILE',
      Latitude: home.lat,
      Longitude: home.lng,
      latitude: home.lat,
      longitude: home.lng,
      lat: home.lat,
      lng: home.lng,
      'Adresse complète': home.address || 'Domicile',
      Adresse: home.address || 'Domicile'
    };
  }

  function withHomeStart(rows) {
    if (!isHomeSelected() || !Array.isArray(rows)) return rows;
    const home = homeRouteRow();
    if (!home) return rows;
    if (rows.some((row) => row?.__wipHomeStart || row?._wipHomeStart || row?.siret === 'DOMICILE')) return rows;
    return [home, ...rows];
  }

  function wrapRoutePointFunction(name) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipHomeRoutePolish) return;
    const wrapped = function wipHomeRoutePolishWrapped(...args) {
      const result = current.apply(this, args);
      return Array.isArray(result) ? withHomeStart(result) : result;
    };
    wrapped.__wipHomeRoutePolish = true;
    window[name] = wrapped;
    try { eval(`${name} = window[name]`); } catch (error) {}
  }

  function ensureHomeRouteListItem() {
    if (!isHomeSelected()) return;
    const home = readHome();
    if (!home) return;
    const containers = [...document.querySelectorAll('[id*="route"], [class*="route"], [id*="itin"], [class*="itin"]')]
      .filter((node) => {
        const text = norm(node.textContent || '');
        const rect = node.getBoundingClientRect();
        return rect.width > 180 && rect.height > 30 && (text.includes('itineraire') || text.includes('route') || text.includes('optimis'));
      });
    const container = containers.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
    if (!container || container.querySelector('.wip-home-route-point')) return;

    const item = document.createElement('div');
    item.className = 'wip-home-route-point';
    item.innerHTML = `<strong>1. Domicile</strong><span>${esc(home.address || 'Point de départ')}</span>`;
    container.insertAdjacentElement('afterbegin', item);
  }

  function routeActionButton(button) {
    const text = norm(button?.textContent || button?.value || button?.getAttribute?.('aria-label') || '');
    return text.includes('tracer itineraire') || text.includes('optimiser') || text.includes('itineraire optimise') || text.includes('calculer itineraire');
  }

  function bindHomeEvents() {
    document.addEventListener('change', (event) => {
      if (event.target?.tagName === 'SELECT') window.setTimeout(syncHomeUI, 0);
    }, true);

    document.addEventListener('click', async (event) => {
      const save = event.target?.closest?.('#wip-home-route-save');
      if (save) {
        event.preventDefault();
        event.stopPropagation();
        await saveHomeFromPanel();
        return;
      }

      const button = event.target?.closest?.('button, input[type="button"], input[type="submit"], a');
      if (!button || !routeActionButton(button) || retryingRouteClick) return;
      if (!selectedHomeSelects().length) return;

      const input = document.getElementById('wip-home-route-input');
      const home = readHome();
      const currentValue = String(input?.value || '').trim();
      const hasValidSavedHome = home && Number.isFinite(home.lat) && Number.isFinite(home.lng) && (!currentValue || currentValue === home.address);
      if (hasValidSavedHome) {
        setMode('home');
        ensureHomeRouteListItem();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const saved = await saveHomeFromPanel();
      if (!saved) return;
      retryingRouteClick = true;
      window.setTimeout(() => {
        try { button.click(); } finally { retryingRouteClick = false; }
      }, 80);
    }, true);
  }

  function removeFieldForControl(control) {
    if (!control) return;
    const candidates = [control.closest('label'), control.closest('.wip-uc-field'), control.closest('.field')].filter(Boolean);
    if (candidates[0]) {
      candidates[0].remove();
      return;
    }
    let node = control.parentElement;
    for (let i = 0; i < 4 && node; i += 1) {
      const rect = node.getBoundingClientRect();
      const text = norm(node.textContent || '');
      if (rect.height < 95 && (text.includes('classe') || text.includes('activite moyenne') || text.includes('mvm') || text.includes('score'))) {
        node.remove();
        return;
      }
      node = node.parentElement;
    }
  }

  function replaceTextNodes(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let value = node.nodeValue || '';
      value = value.replace(/Travel\s+hours\s+EXCA/gi, 'H déplacement EXCA');
      value = value.replace(/Travel\s+EXCA\s*%/gi, '% déplacement EXCA');
      value = value.replace(/Travel\s+h(?:ours)?\b/gi, 'H déplacement EXCA');
      value = value.replace(/Travel\s*%/gi, '% déplacement EXCA');
      node.nodeValue = value;
    });
  }

  function cleanupUndercarriageFilter() {
    const panel = document.getElementById('wip-undercarriage-filter');
    if (panel) {
      ['class', 'activity', 'sort'].forEach((key) => removeFieldForControl(panel.querySelector(`[data-uc="${key}"]`)));
      panel.querySelectorAll('label, .wip-uc-field, .field, div').forEach((node) => {
        const text = norm(node.textContent || '');
        const hasControls = !!node.querySelector('select,input,button');
        if (hasControls && (text.includes('classe') || text.includes('activite moyenne') || text.includes('mvm') || text.includes('score') || text.includes('trier par potentiel'))) {
          node.remove();
        }
      });
      panel.querySelectorAll('option').forEach((option) => {
        if (/MVM/i.test(option.textContent || '') || option.value === 'MVM') option.remove();
      });
      replaceTextNodes(panel);
    }

    document.querySelectorAll('th, .wip-uc-clean-table th, .wip-uc-modal-table th, #wip-uc-clean-modal, #wip-uc-detail-modal').forEach(replaceTextNodes);

    document.querySelectorAll('table th').forEach((th) => {
      const text = norm(th.textContent || '');
      if (text === 'mvm' || text === 'score') {
        const index = [...th.parentElement.children].indexOf(th) + 1;
        const table = th.closest('table');
        table?.querySelectorAll(`tr > *:nth-child(${index})`).forEach((cell) => cell.remove());
      }
    });

    document.querySelectorAll('body *').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const text = norm(node.textContent || '');
      if (!text) return;
      if (text.includes('filtre non fonctionnel') || text.includes('in progress non fonctionnel')) node.remove();
      if (text.includes('train de roulement') && text.includes('undercarriage') && !text.includes('7. undercarriage') && node.getBoundingClientRect().height < 120) node.remove();
    });
  }

  function installStyle() {
    if (document.getElementById('wip-home-route-polish-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-home-route-polish-style';
    style.textContent = `
      #wip-home-route-start-panel{display:none;margin:.45rem 0 .65rem;padding:.72rem;border:1px solid #e2e8f0;border-left:4px solid #eab308;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.08)}
      #wip-home-route-start-panel.is-active{display:block}
      .wip-home-route-label{display:grid;gap:.35rem;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
      #wip-home-route-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:.55rem .65rem;font-size:12px;font-weight:700;color:#0f172a;background:#fff;text-transform:none;letter-spacing:0}
      .wip-home-route-actions{display:flex;align-items:center;gap:.5rem;margin-top:.55rem;flex-wrap:wrap}
      #wip-home-route-save{border:0;border-radius:999px;background:#eab308;color:#111827;padding:.48rem .78rem;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}
      #wip-home-route-status{font-size:11px;font-weight:800;color:#64748b}.dark #wip-home-route-status{color:#94a3b8}
      #wip-home-route-status.is-error{color:#dc2626}
      .wip-home-route-point{display:flex;flex-direction:column;gap:2px;margin:.25rem 0 .45rem;padding:.55rem .65rem;border:1px solid #fde68a;border-left:4px solid #eab308;border-radius:12px;background:#fffbeb;color:#0f172a;font-size:12px;line-height:1.2}
      .wip-home-route-point strong{font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em}.wip-home-route-point span{font-size:11px;color:#64748b}
      .dark #wip-home-route-start-panel{background:#020617;border-color:#334155;border-left-color:#eab308}.dark #wip-home-route-input{background:#0f172a;border-color:#334155;color:#e2e8f0}.dark .wip-home-route-point{background:rgba(234,179,8,.08);border-color:#334155;border-left-color:#eab308;color:#e2e8f0}.dark .wip-home-route-point span{color:#94a3b8}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    patchGeolocation();
    syncHomeUI();
    cleanupUndercarriageFilter();
    ['prepareRoutePointsForChoice', 'getRoutePoints', 'buildRoutePoints', 'getOptimizedRoutePoints'].forEach(wrapRoutePointFunction);
    if (isHomeSelected()) ensureHomeRouteListItem();
  }

  bindHomeEvents();
  install();
  document.addEventListener('DOMContentLoaded', () => {
    [100, 300, 700, 1200, 2200, 4000, 7000, 11000, 16000].forEach((delay) => setTimeout(install, delay));
  });
  [150, 500, 1000, 1800, 3200, 5600, 9000, 14000, 21000].forEach((delay) => setTimeout(install, delay));
  try { new MutationObserver(() => setTimeout(() => { cleanupUndercarriageFilter(); syncHomeUI(); if (isHomeSelected()) ensureHomeRouteListItem(); }, 0)).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
