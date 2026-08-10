(() => {
  const PATCH_ID = 'wip-undercarriage-smr-filter-2026-08-10';
  if (window.__WIP_UNDERCARRIAGE_SMR_FILTER_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_SMR_FILTER_PATCH__ = PATCH_ID;

  const GROUPS = {
    very: new Set(['AA']),
    high: new Set(['AA', 'AB', 'BA']),
    watch: new Set(['AC', 'BB', 'CA']),
    low: new Set(['BC', 'CB', 'CC'])
  };

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  function state() {
    const current = window.__wipUnderCarriageState || {};
    window.__wipUnderCarriageState = current;
    return current;
  }

  function root() {
    return document.getElementById('wip-undercarriage-filter');
  }

  function fieldFor(control) {
    return control?.closest?.('label, .wip-uc-field, .field, div');
  }

  function syncState() {
    const panel = root();
    const current = state();
    if (!panel) {
      current.cls = '';
      current.activityMin = 0;
      current.sort = false;
      return current;
    }

    current.enabled = !!panel.querySelector('[data-uc="enabled"]')?.checked;
    current.type = panel.querySelector('[data-uc="type"]')?.value || '';
    if (current.type === 'MVM') current.type = '';
    current.priority = panel.querySelector('[data-uc="priority"]')?.value || '';
    current.smrMin = Number(panel.querySelector('[data-uc="smr"]')?.value || 0);
    current.travelPctMin = Number(panel.querySelector('[data-uc="travelPct"]')?.value || 0);
    current.travelHoursMin = Number(panel.querySelector('[data-uc="travelHours"]')?.value || 0);
    current.cls = '';
    current.activityMin = 0;
    current.sort = false;
    return current;
  }

  function updateSmrOptions() {
    const select = root()?.querySelector('[data-uc="smr"]');
    if (!select) return;
    const current = String(select.value || '0');
    const options = ['<option value="0">Tous</option>'];
    for (let value = 1000; value <= 10000; value += 1000) {
      options.push(`<option value="${value}">≥ ${value.toLocaleString('fr-FR')} h</option>`);
    }
    select.innerHTML = options.join('');
    select.value = options.some((html) => html.includes(`value="${esc(current)}"`)) ? current : '0';
  }

  function removeUnsupportedFilters() {
    const panel = root();
    if (!panel) return;

    const classSelect = panel.querySelector('[data-uc="class"]');
    fieldFor(classSelect)?.remove();

    const activitySelect = panel.querySelector('[data-uc="activity"]');
    fieldFor(activitySelect)?.remove();

    panel.querySelectorAll('label, .wip-uc-field').forEach((node) => {
      const text = String(node.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (text.includes('classe') || text.includes('activite moyenne')) node.remove();
      if (/\bmvm\b/i.test(node.textContent || '')) node.remove();
      if (text.includes('trier par potentiel') || text.includes('score')) node.remove();
    });

    const type = panel.querySelector('[data-uc="type"]');
    if (type) {
      [...type.options].forEach((option) => {
        if (option.value === 'MVM') option.remove();
        if (option.value === 'BULL') option.textContent = 'BULL / Dozer D*';
        if (option.value === 'EXCA') option.textContent = 'EXCA PC* / HB*';
      });
      if (type.value === 'MVM') type.value = '';
    }

    updateSmrOptions();

    const note = panel.querySelector('p');
    if (note) note.textContent = 'BULL / Dozer : modèles D*. EXCA : modèles PC* ou HB*. Les autres modèles ne sont pas pris en compte.';
  }

  function machines(row) {
    try {
      if (typeof window.__wipBuildUndercarriageMachines === 'function') return window.__wipBuildUndercarriageMachines(row) || [];
    } catch (error) {}
    return Array.isArray(row?._undercarriageMachines) ? row._undercarriageMachines : [];
  }

  function active() {
    const s = syncState();
    return !!(s.enabled || s.type || s.priority || s.smrMin || s.travelPctMin || s.travelHoursMin);
  }

  function machineClass(machine) {
    return machine?.bull || machine?.exca || machine?.best || '';
  }

  function machinePass(machine) {
    const s = syncState();
    if (s.type === 'BULL' && !machine.bull) return false;
    if (s.type === 'EXCA' && !(machine.exca || machine.travelPct || machine.travelHours)) return false;
    const cls = machineClass(machine);
    if (s.priority && !GROUPS[s.priority]?.has(cls)) return false;
    if (s.smrMin && Number(machine.smr || 0) < s.smrMin) return false;
    if (s.travelPctMin && Number(machine.travelPct || 0) < s.travelPctMin) return false;
    if (s.travelHoursMin && Number(machine.travelHours || 0) < s.travelHoursMin) return false;
    return true;
  }

  function rowPass(row) {
    const list = machines(row);
    if (!active()) return true;
    if (state().enabled && !list.length) return false;
    return list.some(machinePass);
  }

  function applyRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter(rowPass);
  }

  function rerender() {
    try {
      if (active() && Array.isArray(window.currentFilteredData)) {
        window.currentFilteredData = applyRows(window.currentFilteredData);
        try { currentFilteredData = window.currentFilteredData; } catch (error) {}
        if (typeof renderGrid === 'function') renderGrid(window.currentFilteredData);
        if (typeof updateActiveCounter === 'function') updateActiveCounter();
        if (typeof isMapVisible === 'function' && isMapVisible() && typeof renderMap === 'function') renderMap(window.currentFilteredData);
      }
    } catch (error) { console.warn('Undercarriage simplified filter failed', error); }
    window.setTimeout(updateBadges, 80);
  }

  function updateBadges() {
    document.querySelectorAll('.wip-uc-badge').forEach((badge) => {
      let row = null;
      const explicit = Number(badge.dataset.rowIndex || NaN);
      if (Number.isFinite(explicit)) row = (window.globalData || []).find((item) => Number(item?._rowIndex) === explicit) || null;
      if (!row) {
        const button = badge.parentElement?.querySelector?.('button[onclick^="openDetails("]')
          || badge.closest?.('tr, .mobile-card, div')?.querySelector?.('button[onclick^="openDetails("]');
        const match = String(button?.getAttribute('onclick') || '').match(/openDetails\((\d+)\)/);
        row = match ? (window.globalData || []).find((item) => Number(item?._rowIndex) === Number(match[1])) : null;
      }
      const list = row ? machines(row) : [];
      if (!row || !list.length) {
        badge.remove();
        return;
      }
      badge.dataset.rowIndex = String(row._rowIndex ?? '');
      badge.textContent = `Undercarriage • ${list.length}`;
    });
  }

  function bindPanel() {
    const panel = root();
    if (!panel || panel.dataset.wipUcSmrBound === 'true') return;
    panel.dataset.wipUcSmrBound = 'true';
    panel.addEventListener('change', (event) => {
      if (!event.target?.matches?.('select,input')) return;
      syncState();
      try { if (typeof runFilter === 'function') runFilter(); } catch (error) {}
      try { if (typeof renderTop200 === 'function') renderTop200(); } catch (error) {}
      rerender();
    }, true);
    panel.addEventListener('click', (event) => {
      if (!event.target?.closest?.('#wip-uc-apply')) return;
      syncState();
      try { if (typeof runFilter === 'function') runFilter(); } catch (error) {}
      try { if (typeof renderTop200 === 'function') renderTop200(); } catch (error) {}
      rerender();
    }, true);
    panel.addEventListener('click', (event) => {
      if (!event.target?.closest?.('#wip-uc-reset')) return;
      const s = state();
      Object.assign(s, { enabled: false, type: '', priority: '', smrMin: 0, travelPctMin: 0, travelHoursMin: 0, cls: '', activityMin: 0, sort: false });
      window.setTimeout(() => {
        removeUnsupportedFilters();
        try { if (typeof runFilter === 'function') runFilter(); } catch (error) {}
      }, 0);
    }, true);
  }

  function wrapRunFilter() {
    const current = window.runFilter;
    if (typeof current !== 'function' || current.__wipUcSmrSimplified) return;
    const wrapped = function runFilterWithSimplifiedUndercarriage(...args) {
      syncState();
      const result = current.apply(this, args);
      window.setTimeout(rerender, 0);
      return result;
    };
    wrapped.__wipUcSmrSimplified = true;
    window.runFilter = wrapped;
    try { runFilter = wrapped; } catch (error) {}
  }

  function wrapTop200() {
    const current = window.getTop200Data;
    if (typeof current !== 'function' || current.__wipUcSmrSimplified) return;
    const wrapped = function getTop200DataWithSimplifiedUndercarriage(...args) {
      const rows = current.apply(this, args);
      return active() ? applyRows(rows) : rows;
    };
    wrapped.__wipUcSmrSimplified = true;
    window.getTop200Data = wrapped;
    try { getTop200Data = wrapped; } catch (error) {}
  }

  function install() {
    removeUnsupportedFilters();
    syncState();
    bindPanel();
    wrapRunFilter();
    wrapTop200();
    updateBadges();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => [80, 250, 700, 1400, 2600, 5200, 9000, 14000].forEach((delay) => setTimeout(install, delay)));
  [120, 450, 1000, 2200, 4200, 7600, 12000, 18000].forEach((delay) => setTimeout(install, delay));
  try { new MutationObserver(() => setTimeout(install, 0)).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
