(() => {
  const PATCH_ID = 'wip-stack-guard-2026-09-07-v6';
  if (window.__WIP_STACK_GUARD_PATCH__ === PATCH_ID) return;
  window.__WIP_STACK_GUARD_PATCH__ = PATCH_ID;

  // Le garde reste uniquement chargé de bloquer une vraie récursion. Les anciens
  // hotfixes différés ont été supprimés : le runtime final est désormais construit
  // dans un ordre déterministe avant publication.
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

  // data11.csv peut contenir plusieurs lignes pour un même SIRET. Le dédoublonnage
  // choisit une ligne métier selon le rang/CA, qui n'est pas nécessairement la ligne
  // la plus riche en coordonnées de contact. On choisit donc, par SIRET, le téléphone
  // data22.Téléphone provenant de la ligne de contact la plus riche, puis on synchronise
  // tous les anciens alias afin que toutes les générations de la fiche Détails affichent
  // exactement le même numéro.
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

  // Le Top N était appliqué dans getTop200Data AVANT les wrappers Excel,
  // Undercarriage et autres filtres. Ces wrappers pouvaient ensuite retirer des
  // lignes : "Top 10" finissait donc avec moins de 10 résultats. On demande au
  // pipeline complet de travailler sur le Top 200, puis on applique la limite
  // demandée une seule fois, tout à la fin.
  function installFinalTopLimit() {
    const current = window.getTop200Data;
    if (typeof current !== 'function' || current.__wipFinalTopLimit) return;

    const wrapped = function getTop200DataWithFinalLimit(...args) {
      let requestedLimit = 200;
      try { requestedLimit = Number(top200Limit || 200); } catch (error) {}
      const safeLimit = [10, 20, 25, 50, 100, 200].includes(requestedLimit) ? requestedLimit : 200;
      if (safeLimit === 200) return current.apply(this, args);

      let previousLimit = safeLimit;
      try {
        previousLimit = Number(top200Limit || safeLimit);
        top200Limit = 200;
        const rows = current.apply(this, args);
        return Array.isArray(rows) ? rows.slice(0, safeLimit) : rows;
      } finally {
        try { top200Limit = previousLimit; } catch (error) {}
      }
    };

    wrapped.__wipFinalTopLimit = true;
    wrapped.__wipFinalTopLimitOriginal = current;
    assignGlobal('getTop200Data', wrapped);
  }

  installFinalTopLimit();

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
