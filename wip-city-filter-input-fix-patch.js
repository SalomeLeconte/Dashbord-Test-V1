(() => {
  const PATCH_ID = 'wip-city-filter-input-crash-fix-2026-08-27-v1';
  if (window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ === PATCH_ID) return;
  window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ = PATCH_ID;

  const DEBOUNCE_MS = 250;
  let timerId = 0;
  let lastAppliedValue = null;

  function applyFilter(input, force = false) {
    const value = String(input?.value || '');
    if (!force && value === lastAppliedValue) return;
    lastAppliedValue = value;

    window.requestAnimationFrame(() => {
      try {
        if (typeof window.runFilter === 'function') window.runFilter();
      } catch (error) {
        console.error('Filtre Ville impossible.', error);
      }
    });
  }

  function scheduleFilter(input) {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => applyFilter(input), DEBOUNCE_MS);
  }

  function install() {
    const input = document.getElementById('f-ville');
    if (!input || input.dataset.wipCityCrashFix === PATCH_ID) return;

    input.dataset.wipCityCrashFix = PATCH_ID;

    // L'ancien handler inline déclenchait runFilter() de façon synchrone à chaque touche.
    input.removeAttribute('oninput');
    input.oninput = null;

    input.addEventListener('input', () => scheduleFilter(input), { passive: true });
    input.addEventListener('change', () => {
      window.clearTimeout(timerId);
      applyFilter(input, true);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      window.clearTimeout(timerId);
      applyFilter(input, true);
    });
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', install);
  window.setTimeout(install, 1000);
})();
