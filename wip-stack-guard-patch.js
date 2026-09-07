(() => {
  const PATCH_ID = 'wip-stack-guard-2026-09-03-v5';
  if (window.__WIP_STACK_GUARD_PATCH__ === PATCH_ID) return;
  window.__WIP_STACK_GUARD_PATCH__ = PATCH_ID;

  const guardedNames = window.__wipStackGuardedNames || new Set();
  const running = window.__wipStackGuardRunning || new Set();
  const lastResult = window.__wipStackGuardLastResult || Object.create(null);
  window.__wipStackGuardedNames = guardedNames;
  window.__wipStackGuardRunning = running;
  window.__wipStackGuardLastResult = lastResult;

  function assignGlobal(name, fn) {
    window[name] = fn;
    try { eval(`${name} = window[name]`); } catch (error) {}
  }

  function guardFunction(name) {
    if (guardedNames.has(name)) return;
    const current = window[name];
    if (typeof current !== 'function') return;

    const guarded = function wipStackGuardedFunction(...args) {
      if (running.has(name)) {
        console.warn(`Boucle évitée sur ${name} — appel récursif bloqué.`);
        return lastResult[name] ?? null;
      }

      running.add(name);
      try {
        const result = current.apply(this, args);
        lastResult[name] = result;
        return result;
      } finally {
        running.delete(name);
      }
    };

    guarded.__wipStackGuard = true;
    guarded.__wipStackGuardOriginal = current;
    guardedNames.add(name);
    assignGlobal(name, guarded);
  }

  let queuedRefresh = false;
  function guardedBadgeRefresh() {
    if (queuedRefresh) return;
    queuedRefresh = true;
    window.setTimeout(() => {
      queuedRefresh = false;
      try {
        document.querySelectorAll('.wip-uc-badge').forEach((badge) => {
          if (!badge.textContent || !badge.textContent.trim()) badge.remove();
        });
      } catch (error) {}
    }, 0);
  }

  function siretKey(row) {
    const value = row?.siret ?? row?.SIRET ?? row?.Siret ?? row?.['Client_Irium.SIRET'] ?? '';
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 14 ? digits.slice(0, 14) : digits;
  }

  function validPhone(value) {
    const text = String(value ?? '').trim();
    const digits = text.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? text : '';
  }

  function contactRichness(row) {
    const keys = [
      'data22.Téléphone',
      'data22..Email',
      'CRM_DateDernierContact',
      'datap2.CRM_NoteDernierContact',
      'datap2.CRM_SujetDernierContact',
      'datap2.CRM_Vendeur',
      'data22.Liste Machines',
      'data22.Liste Num serie Machines'
    ];
    return keys.reduce((score, key) => score + (String(row?.[key] ?? '').trim() ? 1 : 0), 0);
  }

  function normalizeContactPhoneSources(rows = window.globalData) {
    if (!Array.isArray(rows)) return;
    const groups = new Map();

    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object') return;
      const key = siretKey(row) || `__row_${row._rowIndex ?? index}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });

    groups.forEach((group) => {
      const candidates = group
        .map((row, index) => ({ row, index, phone: validPhone(row?.['data22.Téléphone']), score: contactRichness(row) }))
        .filter((entry) => entry.phone)
        .sort((a, b) => b.score - a.score || b.index - a.index);
      const phone = candidates[0]?.phone || '';
      if (!phone) return;

      group.forEach((row) => {
        row['data22.Téléphone'] = phone;
        row['datap2.Téléphone'] = phone;
        row['datav2.Téléphone'] = phone;
        row['Téléphone'] = phone;
        row.Telephone = phone;
        row.Tel = phone;
        row.Mobile = phone;
      });
    });
  }

  function dedupeLikeVisibleTop200(rows) {
    if (!Array.isArray(rows)) return [];
    try {
      if (typeof window.dedupeRowsBySiret === 'function') {
        return window.dedupeRowsBySiret(rows);
      }
    } catch (error) {}

    const seen = new Set();
    return rows.filter((row, index) => {
      const key = siretKey(row) || `__row_${row?._rowIndex ?? index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Top 10/20/25/50/100 doit être une simple vue tronquée du Top 200 final.
  // On calcule donc exactement la liste Top 200 complète avec tous les wrappers
  // actifs, on applique le même dédoublonnage SIRET que la vue visible, puis on
  // prend les N premières lignes. Ainsi une entreprise dupliquée dans data11 ne
  // peut plus transformer un Top 10 en 9 lignes : la ligne suivante remonte.
  function installTopNFromFinalTop200() {
    const current = window.getTop200Data;
    if (typeof current !== 'function' || current.__wipTopNFromFinalTop200) return;

    const wrapped = function getTop200DataFromFinalVisibleList(...args) {
      let requestedLimit = 200;
      try { requestedLimit = Number(top200Limit || 200); } catch (error) {}
      const safeLimit = [10, 20, 25, 50, 100, 200].includes(requestedLimit) ? requestedLimit : 200;
      let previousLimit = safeLimit;

      try {
        previousLimit = Number(top200Limit || safeLimit);
        top200Limit = 200;
        const fullTop200 = current.apply(this, args);
        const visibleTop200 = dedupeLikeVisibleTop200(Array.isArray(fullTop200) ? fullTop200 : []);
        return visibleTop200.slice(0, safeLimit);
      } finally {
        try { top200Limit = previousLimit; } catch (error) {}
      }
    };

    wrapped.__wipTopNFromFinalTop200 = true;
    wrapped.__wipTopNFromFinalTop200Original = current;
    assignGlobal('getTop200Data', wrapped);
  }

  installTopNFromFinalTop200();

  const guardedFunctionNames = [
    'runFilter',
    'renderTop200',
    'getTop200Data',
    'updateVisibleRows',
    'updateActiveCounter',
    'renderMap',
    'openDetails'
  ];
  if (!window.renderGrid?.__wipPerformanceGridLimit) guardedFunctionNames.push('renderGrid');
  guardedFunctionNames.forEach(guardFunction);
  guardedBadgeRefresh();
  normalizeContactPhoneSources();
  document.addEventListener('dashboard:data-ready', () => normalizeContactPhoneSources(), { passive: true });
})();
