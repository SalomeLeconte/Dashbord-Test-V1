(() => {
  const PATCH_ID = 'wip-city-filter-input-crash-fix-2026-09-03-v2';
  if (window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ === PATCH_ID) return;
  window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ = PATCH_ID;

  const DEBOUNCE_MS = 450;
  let debounceId = 0;
  let idleId = 0;
  let lastAppliedValue = null;
  let filtering = false;
  let rerunRequested = false;
  let composing = false;

  function cancelScheduled() {
    window.clearTimeout(debounceId);
    debounceId = 0;
    if (idleId && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleId);
    }
    idleId = 0;
  }

  function executeFilter(input, force = false) {
    const value = String(input?.value || '');
    if (!force && value === lastAppliedValue) return;

    if (filtering) {
      rerunRequested = true;
      return;
    }

    lastAppliedValue = value;
    filtering = true;
    try {
      if (typeof window.runFilter === 'function') window.runFilter();
    } catch (error) {
      console.error('Filtre Ville impossible.', error);
    } finally {
      filtering = false;
      if (rerunRequested) {
        rerunRequested = false;
        scheduleFilter(input, 120);
      }
    }
  }

  function runWhenBrowserIsFree(input, force = false) {
    const callback = () => {
      idleId = 0;
      window.requestAnimationFrame(() => executeFilter(input, force));
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(callback, { timeout: 700 });
    } else {
      window.requestAnimationFrame(callback);
    }
  }

  function scheduleFilter(input, delay = DEBOUNCE_MS) {
    cancelScheduled();
    debounceId = window.setTimeout(() => {
      debounceId = 0;
      runWhenBrowserIsFree(input, false);
    }, delay);
  }

  function install() {
    const input = document.getElementById('f-ville');
    if (!input || input.dataset.wipCityCrashFix === PATCH_ID) return;

    input.dataset.wipCityCrashFix = PATCH_ID;

    // Le handler historique exécutait toute la chaîne runFilter synchroniquement
    // à chaque frappe. On laisse désormais la saisie s'afficher immédiatement et
    // on ne lance qu'un filtrage lorsque l'utilisateur cesse de taper.
    input.removeAttribute('oninput');
    input.oninput = null;

    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => {
      composing = false;
      scheduleFilter(input);
    });
    input.addEventListener('input', () => {
      if (!composing) scheduleFilter(input);
    }, { passive: true });
    input.addEventListener('change', () => {
      cancelScheduled();
      runWhenBrowserIsFree(input, true);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      cancelScheduled();
      executeFilter(input, true);
    });
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', install);
  window.setTimeout(install, 500);
})();
