(() => {
  const PATCH_ID = 'wip-table-excel-filter-precision-2026-08-24';
  if (window.__WIP_TABLE_EXCEL_FILTER_PRECISION_PATCH__ === PATCH_ID) return;
  window.__WIP_TABLE_EXCEL_FILTER_PRECISION_PATCH__ = PATCH_ID;

  const DEFAULT_DATA_SORT = 'caGlobalDesc';
  const state = window.__wipTableQuickFilterState || {
    data: { clientText: '', clientKind: '', locText: '', caSort: DEFAULT_DATA_SORT, caMin: 0, nbFilter: '', nbSort: '', priority: '' },
    top: { clientText: '', clientKind: '', locText: '', caSort: '', caMin: 0, nbFilter: '', nbSort: '', visitsFilter: '', visitsSort: '', priority: '' }
  };
  window.__wipTableQuickFilterState = state;

  const deburr = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const norm = (value) => deburr(value).toLowerCase().replace(/\s+/g, ' ').trim();
  const digits = (value) => String(value ?? '').replace(/\D/g, '');
  const col = (key) => {
    try { return COL?.[key] || ''; } catch (error) { return ''; }
  };

  function getValue(row, names) {
    return names
      .map((name) => row?.[name])
      .find((value) => value !== undefined && String(value).trim() !== '') || '';
  }

  function normalizeDept(value) {
    let raw = deburr(value).toUpperCase().trim();
    raw = raw.replace(/^DEP(?:ARTEMENT)?\s*:?\s*/i, '').replace(/[^0-9AB]/g, '');
    if (!raw) return '';
    if (/^2[AB]$/.test(raw)) return raw;
    if (/^\d$/.test(raw)) return raw.padStart(2, '0');
    if (/^\d{2,3}$/.test(raw)) return raw;
    if (/^\d{5}$/.test(raw)) return deptFromPostal(raw);
    return raw;
  }

  function deptFromPostal(postal) {
    const cp = digits(postal).slice(0, 5);
    if (cp.length !== 5) return '';
    if (/^97[1-8]/.test(cp) || /^98[46-8]/.test(cp)) return cp.slice(0, 3);
    if (/^20/.test(cp)) return '20';
    return cp.slice(0, 2);
  }

  function deptCandidates(row) {
    const values = [
      row?._deptNorm,
      row?.Departement,
      row?.Département,
      row?.departement,
      row?.DEPARTEMENT,
      row?.[col('dept')],
      row?.['libelleDepartement'],
      row?.['Libellé Département']
    ];

    const address = getValue(row, [col('adresse'), 'Adresse complète', 'adresse', 'Adresse', 'Client_Irium.Adresse complète']);
    const postalMatches = String(address || '').match(/\b\d{5}\b/g) || [];
    postalMatches.forEach((postal) => values.push(deptFromPostal(postal)));

    return new Set(values.map(normalizeDept).filter(Boolean));
  }

  function postalCandidates(row) {
    const values = [
      row?.codePostal,
      row?.CodePostal,
      row?.Code_postal,
      row?.codePostalEtablissement,
      row?.['codePostalEtablissement'],
      row?.[col('postal')]
    ];
    const address = getValue(row, [col('adresse'), 'Adresse complète', 'adresse', 'Adresse', 'Client_Irium.Adresse complète']);
    (String(address || '').match(/\b\d{5}\b/g) || []).forEach((postal) => values.push(postal));
    return new Set(values.map((value) => digits(value).slice(0, 5)).filter((value) => value.length === 5));
  }

  function numericLocationQuery(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    const compact = raw.replace(/\s+/g, '');
    if (/^2[AB]$/.test(compact)) return { type: 'dept', value: compact };
    if (/^\d{1,3}$/.test(compact)) return { type: 'dept', value: normalizeDept(compact) };
    if (/^\d{5}$/.test(compact)) return { type: 'postal', value: compact };
    return null;
  }

  function exactLocationPass(row, query) {
    const parsed = numericLocationQuery(query);
    if (!parsed) return true;
    if (parsed.type === 'postal') return postalCandidates(row).has(parsed.value);
    if (parsed.type === 'dept') return deptCandidates(row).has(parsed.value);
    return true;
  }

  function preciseClientPass(row, query) {
    const raw = String(query ?? '').trim();
    const qDigits = digits(raw);
    if (!qDigits || qDigits.length < 4) return true;

    const siret = digits(getValue(row, [col('siret'), 'siret', 'SIRET']));
    const clientNumber = digits(getValue(row, [col('clientNumero'), 'Client_Irium.Client (Numéro)', 'Client (Numéro)', 'ClientID']));

    if (qDigits.length >= 9) return siret.startsWith(qDigits) || siret === qDigits;
    return clientNumber === qDigits || siret.startsWith(qDigits);
  }

  function precisePass(row, table) {
    const s = state[table] || {};
    if (s.locText && !exactLocationPass(row, s.locText)) return false;
    if (s.clientText && !preciseClientPass(row, s.clientText)) return false;
    return true;
  }

  function applyPrecise(rows, table) {
    return (Array.isArray(rows) ? rows : []).filter((row) => precisePass(row, table));
  }

  function wrapRenderGrid() {
    const current = window.renderGrid;
    if (typeof current !== 'function' || current.__wipExcelPrecision) return;

    const wrapped = function renderGridWithExcelPrecision(rows, ...rest) {
      if (window.__wipExcelPrecisionRendering) return current.call(this, rows, ...rest);
      window.__wipExcelPrecisionRendering = true;
      try {
        const filtered = applyPrecise(rows, 'data');
        if (Array.isArray(rows) && rows === window.currentFilteredData) {
          window.currentFilteredData = filtered;
          try { currentFilteredData = filtered; } catch (error) {}
        }
        return current.call(this, filtered, ...rest);
      } finally {
        window.setTimeout(() => { window.__wipExcelPrecisionRendering = false; }, 0);
      }
    };

    wrapped.__wipExcelPrecision = true;
    window.renderGrid = wrapped;
    try { renderGrid = wrapped; } catch (error) {}
  }

  function wrapTop200Data() {
    const current = window.getTop200Data;
    if (typeof current !== 'function' || current.__wipExcelPrecision) return;

    const wrapped = function getTop200DataWithExcelPrecision(...args) {
      const rows = current.apply(this, args);
      return applyPrecise(rows, 'top');
    };

    wrapped.__wipExcelPrecision = true;
    window.getTop200Data = wrapped;
    try { getTop200Data = wrapped; } catch (error) {}
  }

  function bindFilterMenu() {
    document.addEventListener('click', (event) => {
      const menu = document.getElementById('wip-column-filter-menu');
      if (!menu || !menu.contains(event.target)) return;
      const target = event.target;
      if (!target?.matches?.('.wip-filter-option, .wip-filter-input')) return;
      window.setTimeout(() => {
        try { if (typeof renderTop200 === 'function') renderTop200(); } catch (error) {}
        try { if (typeof renderGrid === 'function') renderGrid(window.currentFilteredData || window.globalData || []); } catch (error) {}
      }, 0);
    }, true);
  }

  function install() {
    wrapRenderGrid();
    wrapTop200Data();
  }

  install();
  bindFilterMenu();
  document.addEventListener('DOMContentLoaded', () => [100, 350, 800, 1600, 3200, 6000, 10000].forEach((delay) => setTimeout(install, delay)));
  [120, 500, 1100, 2400, 4800, 8500, 13000, 20000].forEach((delay) => setTimeout(install, delay));
})();
