(() => {
  const PATCH_ID = 'wip-city-filter-input-crash-fix-2026-09-03-v3';
  if (window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ === PATCH_ID) return;
  window.__WIP_CITY_FILTER_INPUT_CRASH_FIX__ = PATCH_ID;

  const DEBOUNCE_MS = 250;
  let debounceId = 0;
  let frameId = 0;
  let lastAppliedValue = null;
  let filtering = false;
  let rerunRequested = false;
  let composing = false;

  function cancelScheduled() {
    window.clearTimeout(debounceId);
    debounceId = 0;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
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
      document.dispatchEvent(new CustomEvent('dashboard:city-filter-applied', {
        detail: { value }
      }));
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

  function scheduleFilter(input, delay = DEBOUNCE_MS) {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => {
      debounceId = 0;
      runOnNextFrame(input, false);
    }, delay);
  }

  function isolateCityInput(original) {
    if (!original || original.dataset.wipCityCrashFix === PATCH_ID) return original;

    // Des patches historiques (notamment Canton adaptatif) ont attaché des
    // listeners anonymes à f-ville. Ils ne peuvent pas être retirés proprement
    // avec removeEventListener. Remplacer une seule fois le nœud conserve son
    // id, sa valeur et son apparence, mais élimine ces listeners coûteux.
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

  function install() {
    const current = document.getElementById('f-ville');
    if (!current || current.dataset.wipCityCrashFix === PATCH_ID) return;
    const input = isolateCityInput(current);
    if (!input) return;

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
      runOnNextFrame(input, true);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      cancelScheduled();
      runOnNextFrame(input, true);
    });
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', install);
  window.setTimeout(install, 500);
})();
