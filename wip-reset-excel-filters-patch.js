(() => {
  const PATCH_ID = 'wip-reset-excel-filters-2026-09-11-v1';
  if (window.__WIP_RESET_EXCEL_FILTERS_PATCH__ === PATCH_ID) return;
  window.__WIP_RESET_EXCEL_FILTERS_PATCH__ = PATCH_ID;

  const DATA_DEFAULTS = {
    clientText: '',
    clientKind: '',
    locText: '',
    caSort: 'caGlobalDesc',
    caMin: 0,
    nbFilter: '',
    nbSort: '',
    priority: ''
  };

  const TOP_DEFAULTS = {
    clientText: '',
    clientKind: '',
    locText: '',
    caSort: '',
    caMin: 0,
    nbFilter: '',
    nbSort: '',
    visitsFilter: '',
    visitsSort: '',
    priority: ''
  };

  function clearExcelColumnFilters() {
    const state = window.__wipTableQuickFilterState;
    if (state && typeof state === 'object') {
      if (!state.data || typeof state.data !== 'object') state.data = {};
      if (!state.top || typeof state.top !== 'object') state.top = {};
      Object.assign(state.data, DATA_DEFAULTS);
      Object.assign(state.top, TOP_DEFAULTS);
    }

    document.getElementById('wip-column-filter-menu')?.remove();
    document.querySelectorAll('.wip-col-filter-btn.is-active').forEach((button) => {
      button.classList.remove('is-active');
    });

    window.__wipGridTransformVersion = Number(window.__wipGridTransformVersion || 0) + 1;
  }

  window.__wipResetExcelColumnFilters = clearExcelColumnFilters;

  function wrapResetAllFilters() {
    const current = window.resetAllFilters;
    if (typeof current !== 'function' || current.__wipExcelResetIntegrated) return;

    const wrapped = function resetAllFiltersWithExcelColumns(...args) {
      clearExcelColumnFilters();
      const result = current.apply(this, args);
      clearExcelColumnFilters();
      return result;
    };

    wrapped.__wipExcelResetIntegrated = true;
    wrapped.__wipExcelResetOriginal = current;
    window.resetAllFilters = wrapped;
    try { resetAllFilters = wrapped; } catch (error) {}
  }

  function install() {
    wrapResetAllFilters();
  }

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button[onclick*="resetAllFilters"]');
    if (!button) return;
    clearExcelColumnFilters();
  }, true);

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  [100, 350, 800, 1600, 3200, 6000, 10000].forEach((delay) => window.setTimeout(install, delay));
})();
