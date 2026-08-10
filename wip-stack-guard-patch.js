(() => {
  const PATCH_ID = 'wip-stack-guard-2026-08-10-v2';
  if (window.__WIP_STACK_GUARD_PATCH__ === PATCH_ID) return;
  window.__WIP_STACK_GUARD_PATCH__ = PATCH_ID;

  // A guard must sit once at the base of the wrapper chain. Reinstalling a guard
  // around every later wrapper makes normal delegation look like recursion and
  // prevents the original render function from ever running.
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
})();
