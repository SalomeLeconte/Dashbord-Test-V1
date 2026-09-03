(() => {
  const PATCH_ID = 'wip-undercarriage-smr-filter-2026-09-03-v3';
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
      return current;
    }

    current.enabled = !!panel.querySelector('[data-uc="enabled"]')?.checked;
    current.type = panel.querySelector('[data-uc="type"]')?.value || '';
    current.priority = panel.querySelector('[data-uc="priority"]')?.value || '';
    current.smrMin = Number(panel.querySelector('[data-uc="smr"]')?.value || 0);
    current.travelPctMin = Number(panel.querySelector('[data-uc="travelPct"]')?.value || 0);
    current.travelHoursMin = Number(panel.querySelector('[data-uc="travelHours"]')?.value || 0);
    current.cls = '';
    current.activityMin = 0;
    try { window.__wipSyncUndercarriageRangeUi?.(); } catch (error) {}
    try { window.__wipSyncUndercarriageCustomSelects?.(); } catch (error) {}
    try { window.__wipSyncUndercarriagePriorityUi?.(); } catch (error) {}
    return current;
  }

  function updateSmrOptions() {
    const select = root()?.querySelector('[data-uc="smr"]');
    if (!select) return;
    const current = String(select.value || '0');
    const optionData = [{ value: '0', label: 'Tous' }];
    for (let value = 1000; value <= 10000; value += 1000) {
      optionData.push({ value: String(value), label: `≥ ${value.toLocaleString('fr-FR')} h` });
    }
    const alreadyCurrent = optionData.length === select.options.length
      && optionData.every((item, index) => select.options[index]?.value === item.value
        && select.options[index]?.textContent?.trim() === item.label);
    if (!alreadyCurrent) {
      select.innerHTML = optionData
        .map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`)
        .join('');
    }
    select.value = optionData.some((item) => item.value === current) ? current : '0';
  }

  function removeUnsupportedFilters() {
    const panel = root();
    if (!panel) return;

    fieldFor(panel.querySelector('[data-uc="class"]'))?.remove();
    fieldFor(panel.querySelector('[data-uc="activity"]'))?.remove();

    panel.querySelectorAll('label, .wip-uc-field').forEach((node) => {
      const text = String(node.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (text.includes('classe') || text.includes('activite moyenne')) node.remove();
    });

    const type = panel.querySelector('[data-uc="type"]');
    if (type) {
      [...type.options].forEach((option) => {
        if (option.value === 'BULL' && option.textContent !== 'BULL / Dozer D*') option.textContent = 'BULL / Dozer D*';
        if (option.value === 'EXCA' && option.textContent !== 'EXCA PC* / HB*') option.textContent = 'EXCA PC* / HB*';
      });
    }

    updateSmrOptions();
    panel.querySelectorAll('#wip-uc-apply,#wip-uc-reset').forEach((button) => {
      const actions = button.closest('.grid');
      if (actions?.querySelectorAll('#wip-uc-apply,#wip-uc-reset').length === 2) actions.remove();
      else button.remove();
    });

    const note = panel.querySelector('p');
    const noteText = 'BULL / Dozer : modèles D*. EXCA : modèles PC* ou HB*. Les autres modèles ne sont pas pris en compte.';
    if (note && note.textContent !== noteText) note.textContent = noteText;
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

  function machineClasses(machine, current = state()) {
    if (current.type === 'BULL') return [machine?.bull].filter(Boolean);
    if (current.type === 'EXCA') return [machine?.exca].filter(Boolean);
    return [machine?.bull, machine?.exca, machine?.best].filter((value, index, values) => value && values.indexOf(value) === index);
  }

  function machinePass(machine) {
    const s = syncState();
    if (s.type === 'BULL' && !machine.bull) return false;
    if (s.type === 'EXCA' && !(machine.exca || machine.travelPct || machine.travelHours)) return false;
    const classes = machineClasses(machine, s);
    if (s.priority && !classes.some(cls => GROUPS[s.priority]?.has(cls))) return false;
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
    const filtered = (Array.isArray(rows) ? rows : []).filter(rowPass);
    const selectedPriority = state().priority;
    if (!selectedPriority) return filtered;
    return filtered
      .map((row, index) => ({ row, index, score: priorityScore(row, selectedPriority) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map(({ row }) => row);
  }

  function priorityScore(row, selectedPriority) {
    const current = state();
    return machines(row)
      .filter(machine => machineClasses(machine, current).some(cls => GROUPS[selectedPriority]?.has(cls)))
      .reduce((best, machine) => Math.max(best, Number(machine.sortValue || machine.score || 0)), 0);
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
      if (Number.isFinite(explicit)) row = window.__wipRowByIndex?.(explicit) || null;
      if (!row) {
        const button = badge.parentElement?.querySelector?.('button[onclick^="openDetails("]')
          || badge.closest?.('tr, .mobile-card, div')?.querySelector?.('button[onclick^="openDetails("]');
        const match = String(button?.getAttribute('onclick') || '').match(/openDetails\((\d+)\)/);
        row = match ? window.__wipRowByIndex?.(Number(match[1])) || null : null;
      }
      const list = row ? machines(row) : [];
      if (!row || !list.length) {
        badge.remove();
        return;
      }
      badge.dataset.rowIndex = String(row._rowIndex ?? '');
      const label = `Undercarriage • ${list.length}`;
      if (badge.textContent !== label) badge.textContent = label;
    });
  }

  function bindPanel() {
    const panel = root();
    if (!panel || panel.dataset.wipUcSmrBound === 'true') return;
    panel.dataset.wipUcSmrBound = 'true';
    if (panel.dataset.wipUcBaseEvents === 'true') return;
    panel.addEventListener('change', (event) => {
      if (!event.target?.matches?.('select,input')) return;
      syncState();
      try { if (typeof runFilter === 'function') runFilter(); } catch (error) {}
      try { if (typeof renderTop200 === 'function') renderTop200(); } catch (error) {}
      rerender();
    }, true);
  }

  function wrapRunFilter() {
    if (window.__WIP_UNDERCARRIAGE_SMR_RUN_FILTER_WRAPPED__) return;
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
    window.__WIP_UNDERCARRIAGE_SMR_RUN_FILTER_WRAPPED__ = true;
  }

  function wrapTop200() {
    if (window.__WIP_UNDERCARRIAGE_SMR_TOP200_WRAPPED__) return;
    const current = window.getTop200Data;
    if (typeof current !== 'function' || current.__wipUcSmrSimplified) return;
    const wrapped = function getTop200DataWithSimplifiedUndercarriage(...args) {
      const rows = current.apply(this, args);
      return active() ? applyRows(rows) : rows;
    };
    wrapped.__wipUcSmrSimplified = true;
    window.getTop200Data = wrapped;
    try { getTop200Data = wrapped; } catch (error) {}
    window.__WIP_UNDERCARRIAGE_SMR_TOP200_WRAPPED__ = true;
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
  document.addEventListener('dashboard:data-ready', () => window.setTimeout(install, 0));
  document.addEventListener('DOMContentLoaded', install, { once: true });
  setTimeout(install, 2000);
})();
