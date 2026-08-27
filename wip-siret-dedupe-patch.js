(() => {
  const PATCH_ID = 'wip-siret-dedupe-2026-08-07';
  if (window.__WIP_SIRET_DEDUPE_PATCH__ === PATCH_ID) return;
  window.__WIP_SIRET_DEDUPE_PATCH__ = PATCH_ID;

  const num = (value) => {
    try { if (typeof parseNumber === 'function') return parseNumber(value); } catch (error) {}
    const n = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.').replace(/€|EUR|%|h/gi, '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const getCol = (key) => { try { return COL?.[key] || ''; } catch (error) { return ''; } };
  const get = (row, keys) => keys.map((key) => key ? row?.[key] : '').find((value) => value !== undefined && String(value).trim() !== '') || '';

  function siretKey(row) {
    if (!row) return '';
    const raw = get(row, [
      getCol('siret'),
      'siret',
      'SIRET',
      'Siret',
      'Client_Irium.SIRET',
      'Client_Irium.Siret',
      'SIRENE DATA.siret',
      'data23.siret'
    ]);
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length >= 14) return digits.slice(0, 14);
    if (digits.length >= 9) return digits;
    return '';
  }

  function amount(row, year = 'total') {
    try { if (typeof getAmount === 'function') return getAmount(row, 'GLOBAL', year); } catch (error) {}
    if (year === '2025') return num(row?.[getCol('ca2025')] || row?.['CA FY 2025']);
    if (year === '2026') return num(row?.['Total Montant Facturé PDR FY 2026']) + num(row?.['Total Montant Facturé SERVICE FY 2026']);
    return num(row?.[getCol('caGlobal')] || row?.['CA Global']) ||
      num(row?.['Total Montant Facturé PDR FY 24-25-26']) + num(row?.['Total Montant Facturé SERVICE FY 24-25-26']);
  }

  function rank(row) {
    try {
      if (typeof getTop200Rank === 'function') {
        const value = Number(getTop200Rank(row));
        if (Number.isFinite(value) && value > 0) return value;
      }
    } catch (error) {}
    const raw = num(row?.['Somme de .Top 200 Final'] || row?.['.Top 200 Final']);
    return raw > 0 ? raw : Number.POSITIVE_INFINITY;
  }

  function flag(row, fn, columns) {
    try { if (typeof fn === 'function' && fn(row)) return true; } catch (error) {}
    return columns.some((column) => String(row?.[column] || '').trim() !== '');
  }

  function nbMachines(row) {
    return num(row?.[getCol('nbMachines')] || row?.['Nb Machines/client'] || row?.['Somme de .Nb Machines/clients']);
  }

  function keepScore(row) {
    const topRank = rank(row);
    let score = 0;
    if (Number.isFinite(topRank)) score += 1_000_000_000 - (topRank * 100_000);
    if (flag(row, window.hasNewMachine, ['.Machines récentes/client', 'Machines récentes par client'])) score += 60_000_000;
    if (flag(row, window.hasWarrantyEnding, ['Machines fin garantie par client'])) score += 25_000_000;
    if (flag(row, window.hasOldMachine, ['.Machines ancienne/client', 'data22.Machines 5 ans et + par client'])) score += 10_000_000;
    score += amount(row, 'total');
    score += amount(row, '2025') * 0.25;
    score += amount(row, '2026') * 0.1;
    score += nbMachines(row) * 10_000;
    score += num(row?._rowIndex) * -0.001;
    return score;
  }

  function dedupeRows(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return Array.isArray(rows) ? rows : [];
    const map = new Map();
    const order = [];

    rows.forEach((row, index) => {
      const key = siretKey(row);
      if (!key) {
        const fallback = `__row_${row?._rowIndex ?? index}`;
        map.set(fallback, { row, score: keepScore(row), firstIndex: index });
        order.push(fallback);
        return;
      }
      const score = keepScore(row);
      const current = map.get(key);
      if (!current) {
        map.set(key, { row, score, firstIndex: index });
        order.push(key);
      } else if (score > current.score) {
        map.set(key, { row, score, firstIndex: current.firstIndex });
      }
    });

    return order
      .map((key) => map.get(key))
      .filter(Boolean)
      .sort((a, b) => a.firstIndex - b.firstIndex)
      .map((entry) => entry.row);
  }

  window.dedupeRowsBySiret = dedupeRows;

  function assignGlobalFunction(name, fn) {
    window[name] = fn;
    try {
      if (name === 'runFilter') runFilter = fn;
      else if (name === 'renderGrid') renderGrid = fn;
      else if (name === 'renderMobileGridCards') renderMobileGridCards = fn;
      else if (name === 'renderMap') renderMap = fn;
      else if (name === 'renderKnownMarkers') renderKnownMarkers = fn;
      else if (name === 'renderTop200') renderTop200 = fn;
      else if (name === 'calculateRouteFromVisiblePoints') calculateRouteFromVisiblePoints = fn;
      else if (name === 'prepareRoutePointsForChoice') prepareRoutePointsForChoice = fn;
    } catch (error) {}
  }

  function dedupeCurrentFilteredData() {
    try {
      if (Array.isArray(currentFilteredData)) {
        currentFilteredData = dedupeRows(currentFilteredData);
        window.currentFilteredData = currentFilteredData;
      }
    } catch (error) {}
  }

  function wrapArrayRenderer(name) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipSiretDedupe) return;
    const wrapped = function siretDedupeArrayRenderer(data, ...rest) {
      const clean = Array.isArray(data) ? dedupeRows(data) : data;
      return current.call(this, clean, ...rest);
    };
    wrapped.__wipSiretDedupe = true;
    assignGlobalFunction(name, wrapped);
  }

  function wrapRunFilter() {
    const current = window.runFilter;
    if (typeof current !== 'function' || current.__wipSiretDedupe) return;
    const wrapped = function siretDedupeRunFilter(...args) {
      const result = current.apply(this, args);
      dedupeCurrentFilteredData();
      return result;
    };
    wrapped.__wipSiretDedupe = true;
    assignGlobalFunction('runFilter', wrapped);
  }

  function wrapRenderTop200() {
    const current = window.renderTop200;
    if (typeof current !== 'function' || current.__wipSiretDedupe) return;
    const wrapped = function siretDedupeRenderTop200(...args) {
      dedupeCurrentFilteredData();
      return current.apply(this, args);
    };
    wrapped.__wipSiretDedupe = true;
    assignGlobalFunction('renderTop200', wrapped);
  }

  function wrapRouteFunction(name) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipSiretDedupe) return;
    const wrapped = function siretDedupeRouteFunction(...args) {
      dedupeCurrentFilteredData();
      return current.apply(this, args);
    };
    wrapped.__wipSiretDedupe = true;
    assignGlobalFunction(name, wrapped);
  }

  function install() {
    wrapRunFilter();
    wrapRenderTop200();
    if (window.renderGrid?.__wipPerformanceGridLimit) {
      window.__wipRegisterGridDataTransform?.('siret-dedupe', dedupeRows);
    } else {
      wrapArrayRenderer('renderGrid');
    }
    ['renderMobileGridCards', 'renderMap', 'renderKnownMarkers'].forEach(wrapArrayRenderer);
    ['calculateRouteFromVisiblePoints', 'prepareRoutePointsForChoice'].forEach(wrapRouteFunction);
    dedupeCurrentFilteredData();
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', install, { once: true });
  window.setTimeout(install, 2000);
})();
