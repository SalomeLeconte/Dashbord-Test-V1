(() => {
  const PATCH_ID = 'wip-undercarriage-model-rules-2026-08-10-v3';
  if (window.__WIP_UNDERCARRIAGE_MODEL_RULES_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_MODEL_RULES_PATCH__ = PATCH_ID;

  const CLASS_SCORE = { AA: 100, AB: 85, BA: 80, AC: 60, BB: 55, CA: 50, BC: 30, CB: 25, CC: 10 };
  const GROUPS = {
    very: new Set(['AA']),
    high: new Set(['AA', 'AB', 'BA']),
    watch: new Set(['AC', 'BB', 'CA']),
    low: new Set(['BC', 'CB', 'CC'])
  };
  const COLS = {
    models: ['data22.Liste Machines', 'Liste Machines'],
    serials: ['data22.Liste Num serie Machines', 'data22.Liste Num série Machines', 'Liste Num serie Machines', 'Liste Num série Machines'],
    smr: ['data22.Machines SMR par client', 'Machines SMR par client'],
    bull: ['data22.Class BULL par client', 'Class BULL par client'],
    exca: ['data22.Class EXCA par client', 'Class EXCA par client'],
    travelPct: ['data22.travel pct exca par client', 'travel pct exca par client'],
    travelHours: ['data22.travel hours exca par client', 'travel hours exca par client']
  };

  const state = window.__wipUnderCarriageState || { enabled: false, type: '', cls: '', priority: '', smrMin: 0, activityMin: 0, travelPctMin: 0, travelHoursMin: 0, sort: false };
  window.__wipUnderCarriageState = state;

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const get = (row, names) => names
    .map((name) => row?.[name])
    .find((value) => value !== undefined && String(value).trim() !== '') || '';

  const col = (key) => {
    try { return COL?.[key] || ''; } catch (error) { return ''; }
  };

  const num = (value) => {
    try { if (typeof parseNumber === 'function') return parseNumber(value); } catch (error) {}
    const n = Number(String(value ?? '')
      .replace(/\s/g, '')
      .replace(/\u202f/g, '')
      .replace(',', '.')
      .replace(/%|h|€|EUR/gi, '')
      .replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeMachineKey = (value) => String(value ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();

  const modelCode = (value) => normalizeMachineKey(value);
  const isBullModel = (model) => /^D/.test(modelCode(model));
  const isExcaModel = (model) => /^(PC|HB)/.test(modelCode(model));
  const looksLikeModel = (value) => /^(D|PC|HB|WA|PW|GD|HM|HD|BR|WB|SK|CD)[A-Z0-9-]*/i.test(String(value ?? '').trim());

  function tokenize(value) {
    const text = String(value ?? '').trim();
    if (!text) return [];
    let parts = text.split(/\s*[;\n\r|]+\s*/).filter(Boolean);
    if (parts.length <= 1 && /,\s*[A-Z0-9]/i.test(text)) parts = text.split(/\s*,\s*/).filter(Boolean);
    return parts.map((part) => part.trim()).filter(Boolean);
  }

  function splitEntries(value, options = {}) {
    const { parsePairs = true, modelPairs = false } = options;
    return tokenize(value).map((clean, index) => {
      const pair = clean.match(/^(.+?)\s+(?:-|:|→|=>)\s+(.+)$/);
      if (parsePairs && pair) {
        if (!modelPairs || looksLikeModel(pair[2])) return { key: pair[1].trim(), value: pair[2].trim(), index, raw: clean };
      }
      return { key: `machine_${index + 1}`, value: clean, index, raw: clean };
    });
  }

  function entryMap(value) {
    const map = new Map();
    splitEntries(value, { parsePairs: true }).forEach((entry) => {
      const key = normalizeMachineKey(entry.key || `machine_${entry.index + 1}`);
      if (!key) return;
      map.set(key, entry);
    });
    return map;
  }

  function cls(value) {
    const match = String(value ?? '').toUpperCase().match(/\b(AA|AB|AC|BA|BB|BC|CA|CB|CC)\b/);
    return match ? match[1] : '';
  }

  function modelLookup(row) {
    const modelEntries = splitEntries(get(row, COLS.models), { parsePairs: true, modelPairs: true });
    const serialEntries = splitEntries(get(row, COLS.serials), { parsePairs: false });
    const byKey = new Map();
    const byIndex = new Map();

    modelEntries.forEach((entry, index) => {
      const model = entry.value || entry.key || '';
      if (!model) return;
      byIndex.set(index, model);
      byKey.set(normalizeMachineKey(`machine_${index + 1}`), model);
      byKey.set(normalizeMachineKey(entry.key), model);
      byKey.set(normalizeMachineKey(entry.value), model);
    });

    serialEntries.forEach((entry, index) => {
      const model = byIndex.get(index) || '';
      const serial = entry.value || entry.key || '';
      if (!model) return;
      byKey.set(normalizeMachineKey(serial), model);
      byKey.set(normalizeMachineKey(entry.key), model);
      byKey.set(normalizeMachineKey(`machine_${index + 1}`), model);
    });

    return { byKey, byIndex };
  }

  function modelForEntry(entry, lookup) {
    if (!entry) return '';
    const byKey = lookup.byKey || new Map();
    const byIndex = lookup.byIndex || new Map();
    const candidates = [entry.key, entry.value, entry.raw, `machine_${entry.index + 1}`];
    for (const candidate of candidates) {
      const key = normalizeMachineKey(candidate);
      const model = byKey.get(key);
      if (model) return model;
      if (looksLikeModel(candidate)) return candidate;
    }
    return byIndex.get(entry.index) || '';
  }

  function buildUndercarriageMachines(row) {
    if (!row) return [];
    if (row._wipUndercarriageModelRulesApplied && Array.isArray(row._undercarriageMachines)) {
      return row._undercarriageMachines;
    }
    const maps = {
      smr: entryMap(get(row, COLS.smr)),
      bull: entryMap(get(row, COLS.bull)),
      exca: entryMap(get(row, COLS.exca)),
      travelPct: entryMap(get(row, COLS.travelPct)),
      travelHours: entryMap(get(row, COLS.travelHours))
    };
    const lookup = modelLookup(row);
    const keys = new Set();
    Object.values(maps).forEach((map) => map.forEach((_, key) => keys.add(key)));

    const applicable = [...keys].map((key) => {
      const source = maps.smr.get(key) || maps.bull.get(key) || maps.exca.get(key) || maps.travelPct.get(key) || maps.travelHours.get(key);
      const model = modelForEntry(source, lookup);
      const bullAllowed = isBullModel(model);
      const excaAllowed = isExcaModel(model);
      const bull = bullAllowed ? cls(maps.bull.get(key)?.value) : '';
      const exca = excaAllowed ? cls(maps.exca.get(key)?.value) : '';
      const travelPct = excaAllowed ? num(maps.travelPct.get(key)?.value) : 0;
      const travelHours = excaAllowed ? num(maps.travelHours.get(key)?.value) : 0;
      const smr = (bullAllowed || excaAllowed) ? num(maps.smr.get(key)?.value) : 0;
      const best = bull || exca || '';
      const sortValue = Math.max(CLASS_SCORE[best] || 0, smr >= 9000 ? 35 : smr >= 5000 ? 20 : 0, travelPct >= 70 ? 35 : travelPct >= 50 ? 24 : travelPct >= 30 ? 12 : 0, travelHours >= 500 ? 20 : travelHours >= 250 ? 12 : travelHours >= 100 ? 7 : 0);
      const serial = source?.key || source?.value || key;
      const label = `${String(serial).replace(/^machine_\d+$/i, 'Machine')}${model ? ` — ${model}` : ''}`;
      const type = bull ? 'BULL' : exca || travelPct || travelHours ? 'EXCA' : '';
      return {
        key,
        label,
        model,
        type,
        smr,
        bull,
        exca,
        mvm: '',
        travelPct,
        travelHours,
        best,
        sortValue,
        score: sortValue,
        hasData: !!((bullAllowed && bull) || (excaAllowed && (exca || travelPct || travelHours)))
      };
    }).filter((machine) => machine.hasData);

    row._undercarriageMachines = applicable;
    row._undercarriageCount = applicable.length;
    row._undercarriageScore = applicable.reduce((max, machine) => Math.max(max, machine.sortValue || 0), 0);
    row._wipUndercarriageModelRulesApplied = true;
    return applicable;
  }

  window.__wipBuildUndercarriageMachines = buildUndercarriageMachines;

  function refreshRows() {
    const seen = new Set();
    [window.globalData, window.currentFilteredData]
      .filter(Array.isArray)
      .flat()
      .forEach((row) => {
        if (!row || seen.has(row)) return;
        seen.add(row);
        buildUndercarriageMachines(row);
      });
  }

  function syncState() {
    const root = document.getElementById('wip-undercarriage-filter');
    if (!root) return;
    state.enabled = !!root.querySelector('[data-uc="enabled"]')?.checked;
    state.type = root.querySelector('[data-uc="type"]')?.value || '';
    if (state.type === 'MVM') state.type = '';
    state.cls = root.querySelector('[data-uc="class"]')?.value || '';
    state.priority = root.querySelector('[data-uc="priority"]')?.value || '';
    state.smrMin = Number(root.querySelector('[data-uc="smr"]')?.value || 0);
    state.activityMin = Number(root.querySelector('[data-uc="activity"]')?.value || 0);
    state.travelPctMin = Number(root.querySelector('[data-uc="travelPct"]')?.value || 0);
    state.travelHoursMin = Number(root.querySelector('[data-uc="travelHours"]')?.value || 0);
    state.sort = false;
  }

  function selectedClass(machine) {
    if (state.type === 'BULL') return [machine.bull].filter(Boolean);
    if (state.type === 'EXCA') return [machine.exca].filter(Boolean);
    return [machine.bull, machine.exca].filter(Boolean);
  }

  function finalActive() {
    return !!(state.enabled || state.type || state.cls || state.priority || state.smrMin || state.activityMin || state.travelPctMin || state.travelHoursMin);
  }

  function classActivity(value) {
    const first = String(value || '')[0];
    if (first === 'A') return 80;
    if (first === 'B') return 50;
    return 0;
  }

  function classSmr(value) {
    const second = String(value || '')[1];
    if (second === 'A') return 9000;
    if (second === 'B') return 5000;
    return 0;
  }

  function machinePass(machine) {
    const classes = selectedClass(machine);
    if (state.type === 'BULL' && machine.type !== 'BULL') return false;
    if (state.type === 'EXCA' && machine.type !== 'EXCA') return false;
    if (state.cls && !classes.includes(state.cls)) return false;
    if (state.priority && !classes.some((value) => GROUPS[state.priority]?.has(value))) return false;
    const inferredSmr = Math.max(machine.smr || 0, ...classes.map(classSmr));
    const inferredActivity = machine.type === 'EXCA' && machine.travelPct ? machine.travelPct : Math.max(machine.travelPct || 0, ...classes.map(classActivity));
    if (state.smrMin && inferredSmr < state.smrMin) return false;
    if (state.activityMin && inferredActivity < state.activityMin) return false;
    if (state.travelPctMin && (machine.type !== 'EXCA' || machine.travelPct < state.travelPctMin)) return false;
    if (state.travelHoursMin && (machine.type !== 'EXCA' || machine.travelHours < state.travelHoursMin)) return false;
    return true;
  }

  function rowPass(row) {
    const list = buildUndercarriageMachines(row);
    if (state.enabled && !list.length) return false;
    if (state.type || state.cls || state.priority || state.smrMin || state.activityMin || state.travelPctMin || state.travelHoursMin) return list.some(machinePass);
    return true;
  }

  function applyFinal(rows) {
    const filtered = (Array.isArray(rows) ? rows : []).filter(rowPass);
    return filtered;
  }

  function updateFilterUi() {
    const root = document.getElementById('wip-undercarriage-filter');
    if (!root) return;
    const type = root.querySelector('select[data-uc="type"]');
    if (type) {
      [...type.options].forEach((option) => {
        if (option.value === 'MVM') option.remove();
        if (option.value === 'BULL' && option.textContent !== 'BULL / Dozer D*') option.textContent = 'BULL / Dozer D*';
        if (option.value === 'EXCA' && option.textContent !== 'EXCA PC* / HB*') option.textContent = 'EXCA PC* / HB*';
      });
      if (type.value === 'MVM') type.value = '';
    }

    root.querySelectorAll('label, .wip-uc-field').forEach((node) => {
      if (/\bMVM\b/i.test(node.textContent || '')) node.remove();
      if (/Trier par potentiel/i.test(node.textContent || '')) node.remove();
    });
    root.querySelector('[data-uc="sort"]')?.closest('label,div')?.remove();

    const note = root.querySelector('p');
    const noteText = 'BULL / Dozer : modèles D*. EXCA : modèles PC* ou HB*. Les autres modèles ne sont pas pris en compte.';
    if (note && note.textContent !== noteText) note.textContent = noteText;
  }

  function renderAfterFilter() {
    try { if (typeof renderGrid === 'function') renderGrid(currentFilteredData); } catch (error) {}
    try { if (typeof updateActiveCounter === 'function') updateActiveCounter(); } catch (error) {}
    try { if (typeof renderTop200 === 'function') renderTop200(); } catch (error) {}
    try { if (typeof isMapVisible === 'function' && isMapVisible() && typeof renderMap === 'function') renderMap(currentFilteredData); } catch (error) {}
    setTimeout(updateBadges, 80);
  }

  function runFullRefresh() {
    syncState();
    try { if (typeof runFilter === 'function') runFilter(); }
    catch (error) { console.warn('Undercarriage refresh failed', error); }
    setTimeout(updateBadges, 120);
  }

  function patchRunFilter() {
    if (window.__WIP_FINAL_UNDERCARRIAGE_RUN_FILTER_WRAPPED__) return;
    const current = window.runFilter;
    if (typeof current !== 'function' || current.__wipFinalUndercarriageRules) return;
    const wrapped = function runFilterWithFinalUndercarriageRules(...args) {
      syncState();
      const result = current.apply(this, args);
      try {
        if (finalActive() && Array.isArray(window.currentFilteredData)) {
          window.currentFilteredData = applyFinal(window.currentFilteredData);
          try { currentFilteredData = window.currentFilteredData; } catch (error) {}
          renderAfterFilter();
        } else {
          setTimeout(updateBadges, 80);
        }
      } catch (error) { console.warn('Final undercarriage filter failed', error); }
      return result;
    };
    wrapped.__wipFinalUndercarriageRules = true;
    window.runFilter = wrapped;
    try { runFilter = wrapped; } catch (error) {}
    window.__WIP_FINAL_UNDERCARRIAGE_RUN_FILTER_WRAPPED__ = true;
  }

  function patchTop200() {
    if (window.__WIP_FINAL_UNDERCARRIAGE_TOP200_WRAPPED__) return;
    const current = window.getTop200Data;
    if (typeof current !== 'function' || current.__wipFinalUndercarriageTop200) return;
    const wrapped = function getTop200DataWithFinalUndercarriageRules(...args) {
      const rows = current.apply(this, args);
      syncState();
      return finalActive() ? applyFinal(rows) : rows;
    };
    wrapped.__wipFinalUndercarriageTop200 = true;
    window.getTop200Data = wrapped;
    try { getTop200Data = wrapped; } catch (error) {}
    window.__WIP_FINAL_UNDERCARRIAGE_TOP200_WRAPPED__ = true;
  }

  function updateBadges() {
    const buttons = document.querySelectorAll('button[onclick^="openDetails("]');
    buttons.forEach((button) => {
      const match = String(button.getAttribute('onclick') || '').match(/openDetails\((\d+)\)/);
      const rowIndex = match ? Number(match[1]) : NaN;
      const row = Number.isFinite(rowIndex) ? window.__wipRowByIndex?.(rowIndex) || null : null;
      const list = row ? buildUndercarriageMachines(row) : [];
      const existing = button.parentElement?.querySelector('.wip-uc-badge');
      if (!row || !list.length) {
        existing?.remove();
        return;
      }
      const badge = existing || document.createElement('span');
      badge.className = 'wip-uc-badge';
      badge.dataset.rowIndex = String(row._rowIndex ?? '');
      const label = `Undercarriage • ${list.length}`;
      if (badge.textContent !== label) badge.textContent = label;
      badge.setAttribute('role', 'button');
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('title', 'Voir les données undercarriage');
      if (!existing) button.parentElement?.appendChild(badge);
    });
  }

  function installEvents() {
    const root = document.getElementById('wip-undercarriage-filter');
    if (!root || root.dataset.wipFinalRulesEvents === 'true') return;
    root.dataset.wipFinalRulesEvents = 'true';
    root.querySelectorAll('select,input').forEach((field) => {
      field.addEventListener('change', runFullRefresh);
      field.addEventListener('input', runFullRefresh);
    });
    root.querySelector('#wip-uc-apply')?.addEventListener('click', runFullRefresh);
    root.querySelector('#wip-uc-reset')?.addEventListener('click', () => {
      Object.assign(state, { enabled: false, type: '', cls: '', priority: '', smrMin: 0, activityMin: 0, travelPctMin: 0, travelHoursMin: 0, sort: false });
      root.querySelectorAll('select').forEach((select) => { select.value = ''; });
      root.querySelectorAll('input').forEach((input) => { input.checked = false; });
      runFullRefresh();
    });
  }

  function installStyles() {
    if (document.getElementById('wip-undercarriage-final-rules-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-final-rules-style';
    style.textContent = `
      #wip-undercarriage-filter [data-uc="sort"]{display:none!important}
      #wip-undercarriage-filter label:has([data-uc="sort"]){display:none!important}
      #wip-uc-clean-modal .wip-uc-clean-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #wip-uc-clean-modal .wip-uc-clean-table th:nth-child(7),
      #wip-uc-clean-modal .wip-uc-clean-table td:nth-child(7),
      #wip-uc-model-rules-modal .wip-uc-clean-table th:nth-child(7),
      #wip-uc-model-rules-modal .wip-uc-clean-table td:nth-child(7){display:none!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    patchRunFilter();
    patchTop200();
    updateFilterUi();
    installEvents();
    updateBadges();
  }

  install();
  document.addEventListener('dashboard:data-ready', () => window.setTimeout(install, 0));
  document.addEventListener('DOMContentLoaded', install, { once: true });
  setTimeout(install, 2000);
})();
