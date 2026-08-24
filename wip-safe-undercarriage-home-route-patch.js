(() => {
  const PATCH_ID = 'wip-safe-undercarriage-home-route-2026-08-24';
  if (window.__WIP_SAFE_UNDERCARRIAGE_HOME_ROUTE_PATCH__ === PATCH_ID) return;
  window.__WIP_SAFE_UNDERCARRIAGE_HOME_ROUTE_PATCH__ = PATCH_ID;

  const HOME_KEY = 'wip.routeStart.home.v1';
  const MODE_KEY = 'wip.routeStart.mode.v1';
  const PANEL_ID = 'wip-safe-home-route-panel';

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

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
    const lon = Number(match[2].replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat, lon };
  }

  function validateHomeAddress(value) {
    const text = String(value || '').trim();
    if (!text) return { ok: false, message: 'Indique une adresse : rue, ville.' };
    if (parseLatLng(text)) return { ok: true };

    const parts = text.split(/[,;]+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) return { ok: false, message: 'Format attendu : rue, ville.' };

    const street = parts[0];
    const city = parts.slice(1).join(' ');
    if (street.length < 4 || city.length < 2) return { ok: false, message: 'Indique au minimum une rue et une ville.' };
    return { ok: true };
  }

  async function resolveAddress(value) {
    const latLng = parseLatLng(value);
    if (latLng) return latLng;

    try {
      if (typeof window.requestGeocode === 'function') {
        const result = await window.requestGeocode(`${value}, France`);
        if (result && Number.isFinite(result.lat) && Number.isFinite(result.lon)) return { lat: result.lat, lon: result.lon };
      }
    } catch (error) {}

    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(value)}`, {
      headers: { Accept: 'application/json' },
      cache: 'force-cache'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const coords = payload?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) throw new Error('Adresse introuvable');
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Coordonnées invalides');
    return { lat, lon };
  }

  function routeSelect() {
    return document.getElementById('route-user-position')
      || [...document.querySelectorAll('select')].find((select) => {
        const text = norm([...select.options].map((option) => option.textContent || '').join(' '));
        return text.includes('position hors itineraire') && text.includes('ma position au depart');
      })
      || null;
  }

  function selectedHome() {
    const select = routeSelect();
    const option = select?.selectedOptions?.[0];
    return !!(option?.dataset?.wipHomeStart === 'true' || norm(option?.textContent || '').includes('domicile'));
  }

  function ensureHomeOption() {
    const select = routeSelect();
    if (!select) return null;

    const currentStart = [...select.options].find((option) => {
      const text = norm(option.textContent || '');
      return text.includes('ma position au depart') || (text.includes('position') && text.includes('depart') && !text.includes('arrivee'));
    });

    let homeOption = [...select.options].find((option) => option.dataset?.wipHomeStart === 'true' || norm(option.textContent || '').includes('domicile'));
    if (!homeOption) {
      homeOption = document.createElement('option');
      select.appendChild(homeOption);
    }

    homeOption.dataset.wipHomeStart = 'true';
    homeOption.value = currentStart?.value || 'start';
    homeOption.textContent = 'DOMICILE AU DÉPART';
    return select;
  }

  function setStatus(message, isError = false) {
    const node = document.getElementById('wip-safe-home-route-status');
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('is-error', !!isError);
  }

  function ensureHomePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.innerHTML = `
        <label class="wip-safe-home-label">
          <span>Domicile de départ</span>
          <input id="wip-safe-home-route-input" type="text" placeholder="Rue, ville" autocomplete="street-address">
        </label>
        <div class="wip-safe-home-actions">
          <button id="wip-safe-home-route-save" type="button">Enregistrer</button>
          <span id="wip-safe-home-route-status"></span>
        </div>
      `;

      const select = routeSelect();
      const anchor = select?.closest?.('label, .route-control, .leaflet-control, div') || select?.parentElement;
      if (anchor?.parentElement) anchor.insertAdjacentElement('afterend', panel);
      else document.body.appendChild(panel);

      panel.querySelector('#wip-safe-home-route-save')?.addEventListener('click', saveHomeFromPanel);
      panel.querySelector('#wip-safe-home-route-input')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          saveHomeFromPanel();
        }
      });
    }

    const home = readHome();
    const input = panel.querySelector('#wip-safe-home-route-input');
    if (home?.address && input && !input.value) input.value = home.address;
    return panel;
  }

  function useHomeAsRouteStart(home = readHome()) {
    if (!home || !Number.isFinite(home.lat) || !Number.isFinite(home.lon)) return false;
    try { if (typeof window.setUserRouteMode === 'function') window.setUserRouteMode('start'); } catch (error) {}
    try {
      if (typeof window.setUserLocation === 'function') {
        window.setUserLocation(home.lat, home.lon, 25, `Domicile — ${home.address || ''}`.trim());
        return true;
      }
    } catch (error) {}

    try {
      window.userLocation = { lat: home.lat, lon: home.lon, accuracy: 25, sourceLabel: 'Domicile' };
      if (typeof window.renderUserLocationMarker === 'function') window.renderUserLocationMarker(true);
      return true;
    } catch (error) {}
    return false;
  }

  async function saveHomeFromPanel() {
    const input = document.getElementById('wip-safe-home-route-input');
    const value = String(input?.value || '').trim();
    const validation = validateHomeAddress(value);
    if (!validation.ok) {
      setStatus(validation.message, true);
      return null;
    }

    setStatus('Recherche du domicile...', false);
    try {
      const coords = await resolveAddress(value);
      const home = { address: value, lat: coords.lat, lon: coords.lon, savedAt: Date.now() };
      writeHome(home);
      setMode('home');
      useHomeAsRouteStart(home);
      setStatus('Domicile enregistré et utilisé comme départ.', false);
      return home;
    } catch (error) {
      setStatus('Adresse introuvable. Vérifie rue, ville.', true);
      return null;
    }
  }

  function syncHomeUi() {
    const select = ensureHomeOption();
    if (!select) return;
    const panel = ensureHomePanel();
    const isHome = selectedHome();
    panel.style.display = isHome ? 'block' : 'none';
    panel.classList.toggle('is-active', isHome);
    setMode(isHome ? 'home' : 'current');

    if (!isHome) return;
    const home = readHome();
    if (home?.address) {
      const input = document.getElementById('wip-safe-home-route-input');
      if (input && !input.value) input.value = home.address;
    }
    if (home && Number.isFinite(home.lat) && Number.isFinite(home.lon)) useHomeAsRouteStart(home);
    else setStatus('Renseigne rue, ville puis enregistre avant de tracer.', true);
  }

  function beforeRouteCalculation() {
    if (!selectedHome()) return true;
    const home = readHome();
    if (!home || !Number.isFinite(home.lat) || !Number.isFinite(home.lon)) {
      setStatus('Enregistre d’abord un domicile valide : rue, ville.', true);
      try { if (typeof window.updateRouteStatus === 'function') window.updateRouteStatus('Enregistre d’abord un domicile valide : rue, ville.', true); } catch (error) {}
      return false;
    }
    useHomeAsRouteStart(home);
    return true;
  }

  function patchRouteFunctions() {
    ['calculateRouteFromVisiblePoints', 'generateManualRoute', 'openRouteChooser'].forEach((name) => {
      const current = window[name];
      if (typeof current !== 'function' || current.__wipSafeHomeStart) return;
      const wrapped = function safeHomeRouteWrapped(...args) {
        if (!beforeRouteCalculation()) return undefined;
        return current.apply(this, args);
      };
      wrapped.__wipSafeHomeStart = true;
      window[name] = wrapped;
      try { eval(`${name} = window[name]`); } catch (error) {}
    });

    const currentPoint = window.makeUserLocationPoint;
    if (typeof currentPoint === 'function' && !currentPoint.__wipSafeHomeStart) {
      const wrappedPoint = function makeUserLocationPointWithHomeLabel(...args) {
        if (selectedHome()) {
          const home = readHome();
          if (home && Number.isFinite(home.lat) && Number.isFinite(home.lon)) {
            let COLREF = {};
            try { COLREF = window.COL || COL || {}; } catch (error) {}
            return {
              _isUserLocation: true,
              _lat: home.lat,
              _lon: home.lon,
              _deptNorm: '',
              [COLREF.nom || 'denominationUniteLegale']: 'Domicile',
              [COLREF.adresse || 'Adresse complète']: home.address || 'Domicile',
              [COLREF.ville || 'libelleCommuneEtablissement']: '',
              [COLREF.siret || 'siret']: ''
            };
          }
        }
        return currentPoint.apply(this, args);
      };
      wrappedPoint.__wipSafeHomeStart = true;
      window.makeUserLocationPoint = wrappedPoint;
      try { makeUserLocationPoint = window.makeUserLocationPoint; } catch (error) {}
    }
  }

  function replaceTextNode(node) {
    const before = node.nodeValue || '';
    let after = before
      .replace(/Travel\s+hours\s+EXCA/gi, 'H déplacement EXCA')
      .replace(/Travel\s+EXCA\s*%/gi, '% déplacement EXCA')
      .replace(/Travel\s+%/gi, '% déplacement EXCA')
      .replace(/Travel\s+h(?:ours?)?/gi, 'H déplacement EXCA');
    if (after !== before) node.nodeValue = after;
  }

  function walkText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceTextNode);
  }

  function removeFieldByText(root, patterns) {
    if (!root) return;
    root.querySelectorAll('label, .wip-uc-field, .field, div, p').forEach((node) => {
      if (!node.isConnected) return;
      const text = norm(node.textContent || '');
      if (!patterns.some((pattern) => pattern.test(text))) return;
      const candidate = node.closest?.('label, .wip-uc-field, .field') || node;
      const rect = candidate.getBoundingClientRect?.();
      if (candidate.id === 'wip-undercarriage-filter') return;
      if (rect && rect.height > 220) return;
      candidate.remove();
    });
  }

  function cleanUndercarriage() {
    const filter = document.getElementById('wip-undercarriage-filter');
    if (filter) {
      ['class', 'activity'].forEach((key) => {
        const field = filter.querySelector(`[data-uc="${key}"]`)?.closest?.('label, .wip-uc-field, .field, div');
        field?.remove();
      });
      removeFieldByText(filter, [/\bmvm\b/, /\bscore\b/, /\bclasse\b/, /activite moyenne/, /trier par potentiel/]);
      filter.querySelectorAll('option').forEach((option) => {
        const text = norm(option.textContent || option.value || '');
        if (text.includes('mvm')) option.remove();
      });
      walkText(filter);
    }

    document.querySelectorAll('table, .wip-uc-modal-card, #wip-uc-detail-modal, [id*="undercarriage"], [class*="undercarriage"], [class*="wip-uc"]').forEach(walkText);

    document.querySelectorAll('th, td, label, .wip-uc-field, p, div').forEach((node) => {
      const text = norm(node.textContent || '');
      if (text === 'mvm' || text === 'score') node.style.display = 'none';
      if (text.includes('filtre non fonctionnel') || text.includes('in progress') || text.includes('train de roulement / undercarriage')) {
        const candidate = node.closest?.('details, section, .rounded-xl, .rounded-2xl, .wip-uc-field, label, div') || node;
        if (!candidate.closest?.('#wip-undercarriage-integrated-accordion') && !candidate.closest?.('#wip-undercarriage-filter')) {
          candidate.style.display = 'none';
        }
      }
    });
  }

  function installStyle() {
    if (document.getElementById('wip-safe-undercarriage-home-route-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-safe-undercarriage-home-route-style';
    style.textContent = `
      .wip-route-start-home{display:none!important}
      #${PANEL_ID}{display:none;margin:6px 0 10px;padding:10px;border:1px solid #e5e7eb;border-radius:12px;background:#fffdf3;color:#334155;font-size:11px;box-shadow:0 8px 18px rgba(15,23,42,.08)}
      #${PANEL_ID}.is-active{display:block}
      .dark #${PANEL_ID}{background:rgba(234,179,8,.08);border-color:#334155;color:#e2e8f0}
      .wip-safe-home-label{display:grid;gap:5px;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;color:#92400e}.dark .wip-safe-home-label{color:#facc15}
      .wip-safe-home-label input{border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;background:#fff;color:#111827;font-size:11px;font-weight:700;text-transform:none;letter-spacing:0}.dark .wip-safe-home-label input{background:#0f172a;border-color:#334155;color:#e2e8f0}
      .wip-safe-home-actions{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}.wip-safe-home-actions button{border:1px solid #eab308;background:#facc15;color:#111827;border-radius:10px;padding:7px 10px;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}
      #wip-safe-home-route-status{font-size:10px;font-weight:800;color:#64748b}.dark #wip-safe-home-route-status{color:#94a3b8}#wip-safe-home-route-status.is-error{color:#dc2626}
    `;
    document.head.appendChild(style);
  }

  function bind() {
    const select = ensureHomeOption();
    if (select && select.dataset.wipSafeHomeBound !== 'true') {
      select.dataset.wipSafeHomeBound = 'true';
      select.addEventListener('change', () => setTimeout(syncHomeUi, 0), true);
    }
    document.addEventListener('click', (event) => {
      if (event.target?.id === 'wip-safe-home-route-save') saveHomeFromPanel();
    }, true);
  }

  function install() {
    installStyle();
    bind();
    syncHomeUi();
    patchRouteFunctions();
    cleanUndercarriage();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => [100, 350, 800, 1600, 3000, 6000, 10000].forEach((delay) => setTimeout(install, delay)));
  [150, 500, 1200, 2400, 4800, 8000, 13000, 20000].forEach((delay) => setTimeout(install, delay));
  try {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      setTimeout(() => { queued = false; install(); }, 120);
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {}
})();
