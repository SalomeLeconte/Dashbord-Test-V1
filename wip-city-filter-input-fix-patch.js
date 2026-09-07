(() => {
  const PATCH_ID = 'wip-city-filter-input-crash-fix-2026-09-07-v4';
  if (window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ === PATCH_ID) return;
  window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ = PATCH_ID;

  const DEBOUNCE_MS = 250;
  let debounceId = 0;
  let frameId = 0;
  let idleId = 0;
  let lastAppliedValue = null;
  let lastObservedValue = null;
  let filtering = false;
  let rerunRequested = false;
  let composing = false;
  let cityBaselineRows = null;
  let justRestoredEmpty = false;

  function cancelScheduled() {
    window.clearTimeout(debounceId);
    debounceId = 0;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
    idleId = 0;
  }

  function executeFilter(input, force = false) {
    const value = String(input?.value || '');
    if (!force && value === lastAppliedValue) return;

    if (filtering) {
      rerunRequested = true;
      return;
    }

    filtering = true;
    try {
      if (typeof window.runFilter === 'function') window.runFilter();
      lastAppliedValue = value;
    } catch (error) {
      console.error('Filtre Ville impossible.', error);
    } finally {
      filtering = false;
      if (rerunRequested) {
        rerunRequested = false;
        scheduleFilter(input, 80);
      }
    }
  }

  function runOnNextFrame(input, force = false) {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      executeFilter(input, force);
    });
  }

  function scheduleFilter(input, delay = DEBOUNCE_MS, preferIdle = false) {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => {
      debounceId = 0;
      if (preferIdle && typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => {
          idleId = 0;
          runOnNextFrame(input, false);
        }, { timeout: 700 });
        return;
      }
      runOnNextFrame(input, false);
    }, delay);
  }

  function renderRestoredRows(rows) {
    const restored = Array.isArray(rows) ? rows : [];
    try { window.currentFilteredData = restored; } catch (error) {}
    try { if (typeof window.clearRoute === 'function') window.clearRoute(false); } catch (error) {}
    try { if (typeof window.renderGrid === 'function') window.renderGrid(restored); } catch (error) {}
    try { if (typeof window.updateActiveCounter === 'function') window.updateActiveCounter(); } catch (error) {}

    // Le TOP 200 et la carte ne doivent pas bloquer la restitution immédiate du tableau.
    window.requestAnimationFrame(() => {
      try { if (typeof window.renderTop200 === 'function') window.renderTop200(); } catch (error) {}
      try {
        if (typeof window.isMapVisible === 'function' && window.isMapVisible() && typeof window.renderMap === 'function') {
          window.renderMap(restored);
        }
      } catch (error) {}
    });
  }

  function restoreCityBaseline(input) {
    if (!Array.isArray(cityBaselineRows)) return false;
    cancelScheduled();
    renderRestoredRows(cityBaselineRows);
    lastAppliedValue = '';
    lastObservedValue = '';
    cityBaselineRows = null;
    justRestoredEmpty = true;
    return true;
  }

  function isolateCityInput(original) {
    if (!original || original.dataset.wipCityCrashFix === PATCH_ID) return original;

    // Remplacement unique du champ afin d'éliminer les anciens listeners anonymes
    // accumulés par les générations précédentes du filtre.
    const hadFocus = document.activeElement === original;
    const selectionStart = original.selectionStart;
    const selectionEnd = original.selectionEnd;
    const input = original.cloneNode(true);
    input.removeAttribute('oninput');
    input.oninput = null;
    input.dataset.wipCityCrashFix = PATCH_ID;
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
    cityBaselineRows = null;
    justRestoredEmpty = false;
  }

  function installBaselineInvalidation() {
    if (document.documentElement.dataset.wipCityBaselineInvalidation === PATCH_ID) return;
    document.documentElement.dataset.wipCityBaselineInvalidation = PATCH_ID;
    document.addEventListener('input', invalidateBaselineFromOtherFilter, true);
    document.addEventListener('change', invalidateBaselineFromOtherFilter, true);
  }

  function install() {
    const current = document.getElementById('f-ville');
    if (!current || current.dataset.wipCityCrashFix === PATCH_ID) return;
    const input = isolateCityInput(current);
    if (!input) return;

    if (lastObservedValue === null) lastObservedValue = String(input.value || '');
    installBaselineInvalidation();

    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => {
      composing = false;
      scheduleFilter(input);
    });
    input.addEventListener('input', () => {
      if (composing) return;
      const value = String(input.value || '');
      justRestoredEmpty = false;

      if (lastObservedValue === '' && value !== '' && Array.isArray(window.currentFilteredData)) {
        cityBaselineRows = window.currentFilteredData.slice();
      }

      if (value === '' && lastObservedValue !== '') {
        lastObservedValue = value;
        if (restoreCityBaseline(input)) return;
        // Si un autre filtre a invalidé le snapshot, on retombe sur un recalcul
        // complet mais uniquement pendant une période idle pour éviter le gel UI.
        scheduleFilter(input, 320, true);
        return;
      }

      lastObservedValue = value;
      scheduleFilter(input);
    }, { passive: true });

    input.addEventListener('change', () => {
      const value = String(input.value || '');
      if (value === '' && (justRestoredEmpty || lastAppliedValue === '')) return;
      cancelScheduled();
      runOnNextFrame(input, true);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const value = String(input.value || '');
      if (value === '' && (justRestoredEmpty || lastAppliedValue === '')) return;
      cancelScheduled();
      runOnNextFrame(input, true);
    });
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', install);
  window.setTimeout(install, 500);
})();
