(() => {
  const PATCH_ID = 'wip-city-filter-local-2026-09-07-v5';
  if (window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ === PATCH_ID) return;
  window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ = PATCH_ID;

  const INPUT_DEBOUNCE_MS = 90;
  const HEAVY_RENDER_DELAY_MS = 180;
  let inputTimer = 0;
  let heavyTimer = 0;
  let frameId = 0;
  let composing = false;
  let baselineRows = null;
  let baselineIndex = null;
  let baselineDirty = false;
  let lastObservedValue = null;
  let applyingLocalCity = false;

  function normalize(value) {
    try {
      if (typeof window.normalizeText === 'function') return window.normalizeText(value || '');
    } catch (error) {}
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function cancelInputWork() {
    window.clearTimeout(inputTimer);
    inputTimer = 0;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function cancelHeavyRender() {
    window.clearTimeout(heavyTimer);
    heavyTimer = 0;
  }

  function buildBaselineIndex(rows) {
    const source = Array.isArray(rows) ? rows : [];
    baselineRows = source.slice();
    baselineIndex = source.map((item) => ({
      item,
      city: String(item?._searchVille || normalize(item?.[window.COL?.ville] || item?.Ville || item?.ville || ''))
    }));
    baselineDirty = false;
  }

  function captureCurrentBaseline() {
    if (!Array.isArray(window.currentFilteredData)) return false;
    buildBaselineIndex(window.currentFilteredData);
    return true;
  }

  function rebuildBaselineWithoutCity(input) {
    if (!input || typeof window.runFilter !== 'function') return false;
    const typedValue = String(input.value || '');
    try {
      input.value = '';
      applyingLocalCity = true;
      window.runFilter();
      if (!Array.isArray(window.currentFilteredData)) return false;
      buildBaselineIndex(window.currentFilteredData);
      return true;
    } catch (error) {
      console.error('Reconstruction du filtre Ville impossible.', error);
      return false;
    } finally {
      input.value = typedValue;
      applyingLocalCity = false;
    }
  }

  function ensureBaseline(input) {
    if (Array.isArray(baselineRows) && Array.isArray(baselineIndex) && !baselineDirty) return true;
    if (!baselineDirty && captureCurrentBaseline()) return true;
    return rebuildBaselineWithoutCity(input);
  }

  function renderHeavyDeferred(rows) {
    cancelHeavyRender();
    heavyTimer = window.setTimeout(() => {
      heavyTimer = 0;
      window.requestAnimationFrame(() => {
        try {
          if (typeof window.renderTop200 === 'function') window.renderTop200();
        } catch (error) {}
        try {
          if (typeof window.isMapVisible === 'function' && window.isMapVisible() && typeof window.renderMap === 'function') {
            window.renderMap(rows);
          }
        } catch (error) {}
      });
    }, HEAVY_RENDER_DELAY_MS);
  }

  function renderLocalRows(rows) {
    const nextRows = Array.isArray(rows) ? rows : [];
    try { window.currentFilteredData = nextRows; } catch (error) {}
    try { if (typeof window.clearRoute === 'function') window.clearRoute(false); } catch (error) {}
    try { if (typeof window.renderGrid === 'function') window.renderGrid(nextRows); } catch (error) {}
    try { if (typeof window.updateActiveCounter === 'function') window.updateActiveCounter(); } catch (error) {}
    renderHeavyDeferred(nextRows);
  }

  function applyLocalCityFilter(input) {
    if (!input || applyingLocalCity) return;
    const query = normalize(input.value || '');

    if (!query) {
      if (Array.isArray(baselineRows)) renderLocalRows(baselineRows);
      lastObservedValue = '';
      return;
    }

    if (!ensureBaseline(input)) return;

    const matches = [];
    for (let i = 0; i < baselineIndex.length; i += 1) {
      const entry = baselineIndex[i];
      if (entry.city.includes(query)) matches.push(entry.item);
    }
    renderLocalRows(matches);
    lastObservedValue = String(input.value || '');
  }

  function scheduleLocalCityFilter(input, immediate = false) {
    cancelInputWork();
    const execute = () => {
      inputTimer = 0;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        applyLocalCityFilter(input);
      });
    };
    if (immediate) execute();
    else inputTimer = window.setTimeout(execute, INPUT_DEBOUNCE_MS);
  }

  function isolateCityInput(original) {
    if (!original || original.dataset.wipCityCrashFix === PATCH_ID) return original;

    const hadFocus = document.activeElement === original;
    const selectionStart = original.selectionStart;
    const selectionEnd = original.selectionEnd;
    const input = original.cloneNode(true);

    // Important : supprimer le oninput historique = runFilter().
    // La saisie Ville ne doit plus traverser le pipeline complet de tous les filtres.
    input.removeAttribute('oninput');
    input.oninput = null;
    input.dataset.wipCityCrashFix = PATCH_ID;
    input.dataset.wipCityLocalFilter = '1';
    original.replaceWith(input);

    if (hadFocus) {
      input.focus({ preventScroll: true });
      try { input.setSelectionRange(selectionStart, selectionEnd); } catch (error) {}
    }
    return input;
  }

  function invalidateBaselineFromOtherFilter(event) {
    const target = event?.target;
    if (!target || target.id === 'f-ville') return;
    if (!target.closest?.('#filters-panel')) return;
    baselineDirty = true;
    baselineRows = null;
    baselineIndex = null;
  }

  function installBaselineInvalidation() {
    if (document.documentElement.dataset.wipCityLocalBaseline === PATCH_ID) return;
    document.documentElement.dataset.wipCityLocalBaseline = PATCH_ID;
    document.addEventListener('input', invalidateBaselineFromOtherFilter, true);
    document.addEventListener('change', invalidateBaselineFromOtherFilter, true);
  }

  function install() {
    const current = document.getElementById('f-ville');
    if (!current || current.dataset.wipCityCrashFix === PATCH_ID) return;
    const input = isolateCityInput(current);
    if (!input) return;

    installBaselineInvalidation();
    lastObservedValue = String(input.value || '');

    // Quand Ville est vide, currentFilteredData représente déjà exactement le résultat
    // des autres filtres : on le garde comme base locale de recherche.
    if (!lastObservedValue && Array.isArray(window.currentFilteredData)) captureCurrentBaseline();

    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => {
      composing = false;
      scheduleLocalCityFilter(input);
    });

    input.addEventListener('input', () => {
      if (composing) return;
      const value = String(input.value || '');

      if (lastObservedValue === '' && value !== '' && !baselineDirty && Array.isArray(window.currentFilteredData)) {
        captureCurrentBaseline();
      }

      if (value === '') {
        cancelInputWork();
        if (Array.isArray(baselineRows)) renderLocalRows(baselineRows);
        else scheduleLocalCityFilter(input, true);
        lastObservedValue = '';
        return;
      }

      lastObservedValue = value;
      scheduleLocalCityFilter(input);
    }, { passive: true });

    input.addEventListener('change', () => scheduleLocalCityFilter(input, true));
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      scheduleLocalCityFilter(input, true);
    });
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', () => {
    baselineRows = null;
    baselineIndex = null;
    baselineDirty = false;
    install();
    const input = document.getElementById('f-ville');
    if (input && !String(input.value || '') && Array.isArray(window.currentFilteredData)) captureCurrentBaseline();
  });
  window.setTimeout(install, 500);
})();
