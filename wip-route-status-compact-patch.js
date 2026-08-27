(() => {
  const PATCH_ID = 'wip-route-status-compact-2026-07-15';
  window.__WIP_ROUTE_STATUS_COMPACT_PATCH__ = PATCH_ID;

  function cleanRouteStatusText(value) {
    if (typeof value !== 'string') return value;
    return value
      .replace(/\s*Clique\s+sur\s+Tracer\s+itin[ée]raire\.?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+\./g, '.')
      .trim();
  }

  function cleanExistingStatus() {
    const status = document.getElementById('route-status');
    if (!status) return;
    const cleaned = cleanRouteStatusText(status.textContent || '');
    if (cleaned !== status.textContent) status.textContent = cleaned;
  }

  function wrapRouteStatus() {
    const current = window.updateRouteStatus;
    if (typeof current !== 'function' || current.__wipRouteStatusCompact) return;

    const wrapped = function updateRouteStatusCompact(message, ...rest) {
      return current.call(this, cleanRouteStatusText(message), ...rest);
    };

    wrapped.__wipRouteStatusCompact = true;
    window.updateRouteStatus = wrapped;
    try { updateRouteStatus = wrapped; } catch (error) {}
  }

  function install() {
    wrapRouteStatus();
    cleanExistingStatus();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [100, 350, 800, 1600, 3200, 6200, 9800, 14200, 18000].forEach((delay) => window.setTimeout(install, delay));
  });
  [250, 700, 1300, 2600, 5200, 8400, 12600, 16600].forEach((delay) => window.setTimeout(install, delay));
})();
