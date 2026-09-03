(() => {
  const PATCH_ID = 'wip-stack-guard-2026-09-03-v5';
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

  // La source de contact actuelle dans data11.csv est data22.Téléphone.
  // Plusieurs générations de la fiche détails lisent encore d'anciens alias
  // (datap2/datav2). On synchronise uniquement ces alias depuis la source
  // officielle afin que le libellé « Téléphone » affiche toujours la bonne valeur.
  function normalizeContactPhoneSources(rows = window.globalData) {
    if (!Array.isArray(rows)) return;
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const phone = String(row['data22.Téléphone'] ?? '').trim();
      if (!phone) return;
      row['datap2.Téléphone'] = phone;
      row['datav2.Téléphone'] = phone;
      row['Téléphone'] = phone;
      row.Telephone = phone;
    });
  }

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
