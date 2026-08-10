(() => {
  const PATCH_ID = 'wip-stack-guard-2026-08-10';
  if (window.__WIP_STACK_GUARD_PATCH__ === PATCH_ID) return;
  window.__WIP_STACK_GUARD_PATCH__ = PATCH_ID;

  const running = window.__wipStackGuardRunning || new Set();
  const lastResult = window.__wipStackGuardLastResult || Object.create(null);
  window.__wipStackGuardRunning = running;
  window.__wipStackGuardLastResult = lastResult;

  function assignGlobal(name, fn) {
    window[name] = fn;
    try { eval(`${name} = window[name]`); } catch (error) {}
  }

  function guardFunction(name) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipStackGuard) return;

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

  function install() {
    [
      'runFilter',
      'renderGrid',
      'renderTop200',
      'getTop200Data',
      'updateVisibleRows',
      'updateActiveCounter',
      'renderMap',
      'openDetails'
    ].forEach(guardFunction);
    guardedBadgeRefresh();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [50, 150, 350, 800, 1600, 3200, 6400, 10000, 15000].forEach((delay) => window.setTimeout(install, delay));
  });
  [100, 250, 600, 1200, 2400, 4800, 8000, 12000, 18000].forEach((delay) => window.setTimeout(install, delay));
})();
