(() => {
  const PATCH_ID = 'wip-route-ui-refine-2026-07-10';
  window.__WIP_ROUTE_UI_REFINE_PATCH__ = PATCH_ID;

  let trashCleanupScheduled = false;
  let trashCleanupRunning = false;
  let routeObserver = null;

  function isRoutePanelVisible() {
    const panel = document.getElementById('route-steps');
    if (!panel) return false;
    const style = window.getComputedStyle(panel);
    return !panel.classList.contains('hidden') && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function routeTrashSelector() {
    return [
      '.v18-route-trash',
      '.v20-route-toggle',
      '.v23-route-trash',
      '.v24-route-trash',
      '.v25-route-trash',
      '.v26-route-trash',
      '.v26c-route-trash',
      '.wip-route-trash-single',
      'button[onclick*="excludeRoutePoint("]'
    ].join(',');
  }

  function currentRoutePoints() {
    return Array.isArray(window.__lastRoutePointsV18) ? window.__lastRoutePointsV18 : [];
  }

  function cleanRouteTrashButtons() {
    if (trashCleanupRunning) return;
    const panel = document.getElementById('route-steps');
    if (!panel) return;

    trashCleanupRunning = true;
    try {
      const cards = [...panel.querySelectorAll('.rounded-xl.border')];
      const points = currentRoutePoints();

      cards.forEach((card, index) => {
        const item = points[index];
        const existing = [...card.querySelectorAll(routeTrashSelector())];
        const canonical = existing.filter((button) => button.classList.contains('wip-route-trash-single'));

        if (canonical.length === 1 && existing.length === 1) return;
        existing.forEach((button) => button.remove());

        if (!item || item._isUserLocation || item._rowIndex === undefined) return;
        const wrapper = card.querySelector('.flex.items-start.gap-2') || card;
        wrapper.insertAdjacentHTML(
          'beforeend',
          `<button type="button" class="wip-route-trash-single" onclick="excludeRoutePoint(${item._rowIndex})" title="Retirer de l’itinéraire" aria-label="Retirer de l’itinéraire">🗑</button>`
        );
      });
    } finally {
      trashCleanupRunning = false;
    }
  }

  function scheduleTrashCleanup() {
    if (trashCleanupScheduled) return;
    trashCleanupScheduled = true;
    requestAnimationFrame(() => {
      trashCleanupScheduled = false;
      cleanRouteTrashButtons();
    });
  }

  function observeRoutePanel() {
    const panel = document.getElementById('route-steps');
    if (!panel || panel.dataset.wipSingleTrashObserver === 'true') return;
    panel.dataset.wipSingleTrashObserver = 'true';
    routeObserver?.disconnect();
    routeObserver = new MutationObserver(scheduleTrashCleanup);
    routeObserver.observe(panel, { childList: true, subtree: true });
    scheduleTrashCleanup();
  }

  function wrapRouteStepsForCleanup() {
    const current = window.renderRouteSteps;
    if (typeof current !== 'function' || current.__wipSingleTrashCleanup) return;
    const wrapped = function renderRouteStepsSingleTrash() {
      const result = current.apply(this, arguments);
      scheduleTrashCleanup();
      return result;
    };
    wrapped.__wipSingleTrashCleanup = true;
    window.renderRouteSteps = wrapped;
    try { renderRouteSteps = wrapped; } catch (error) {}
  }

  function panelGeometry(mapEl, panel) {
    const mapRect = mapEl.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const mobileBottomPanel = window.innerWidth <= 767 || panelRect.width >= mapRect.width * 0.72;

    if (mobileBottomPanel) {
      const overlap = Math.max(0, Math.min(panelRect.height + 20, mapRect.height * 0.46));
      return {
        mode: 'bottom',
        safe: { left: 28, top: 28, right: mapRect.width - 28, bottom: mapRect.height - overlap - 24 },
        paddingTopLeft: [30, 30],
        paddingBottomRight: [30, Math.max(50, overlap + 26)]
      };
    }

    const overlap = Math.max(0, Math.min(panelRect.width + 20, mapRect.width * 0.43));
    return {
      mode: 'right',
      safe: { left: 28, top: 28, right: mapRect.width - overlap - 24, bottom: mapRect.height - 28 },
      paddingTopLeft: [30, 30],
      paddingBottomRight: [Math.max(60, overlap + 28), 30]
    };
  }

  function boundsComfortablyVisible(mapInstance, bounds, geometry) {
    try {
      if (!bounds?.isValid?.()) return false;
      const nw = mapInstance.latLngToContainerPoint(bounds.getNorthWest());
      const se = mapInstance.latLngToContainerPoint(bounds.getSouthEast());
      const center = mapInstance.latLngToContainerPoint(bounds.getCenter());
      const safe = geometry.safe;
      const tolerance = 52;

      const mostlyVisible =
        nw.x >= safe.left - tolerance &&
        se.x <= safe.right + tolerance &&
        nw.y >= safe.top - tolerance &&
        se.y <= safe.bottom + tolerance;

      const targetX = (safe.left + safe.right) / 2;
      const targetY = (safe.top + safe.bottom) / 2;
      const centerToleranceX = Math.max(90, (safe.right - safe.left) * 0.24);
      const centerToleranceY = Math.max(70, (safe.bottom - safe.top) * 0.24);
      const centeredEnough =
        Math.abs(center.x - targetX) <= centerToleranceX &&
        Math.abs(center.y - targetY) <= centerToleranceY;

      return mostlyVisible && centeredEnough;
    } catch (error) {
      return false;
    }
  }

  function installGentleMapFitGuard() {
    let mapInstance;
    try { mapInstance = map; } catch (error) { mapInstance = window.map; }
    if (!mapInstance || mapInstance.__wipGentleFitGuard) return;

    const originalFitBounds = mapInstance.fitBounds.bind(mapInstance);
    const originalPanBy = mapInstance.panBy.bind(mapInstance);

    mapInstance.fitBounds = function guardedRouteFitBounds(bounds, options = {}) {
      const panel = document.getElementById('route-steps');
      const mapEl = document.getElementById('map');
      if (!panel || !mapEl || !isRoutePanelVisible()) return originalFitBounds(bounds, options);

      const geometry = panelGeometry(mapEl, panel);
      if (boundsComfortablyVisible(mapInstance, bounds, geometry)) return mapInstance;

      return originalFitBounds(bounds, {
        ...options,
        paddingTopLeft: geometry.paddingTopLeft,
        paddingBottomRight: geometry.paddingBottomRight,
        maxZoom: Math.min(Number(options.maxZoom || 11), 11),
        animate: true,
        duration: 0.32
      });
    };

    mapInstance.panBy = function guardedRoutePanBy(offset, options = {}) {
      if (!isRoutePanelVisible() || !Array.isArray(offset)) return originalPanBy(offset, options);
      const x = Math.max(-90, Math.min(90, Number(offset[0]) || 0));
      const y = Math.max(-70, Math.min(70, Number(offset[1]) || 0));
      if (Math.abs(x) < 18 && Math.abs(y) < 18) return mapInstance;
      return originalPanBy([x, y], { ...options, animate: true, duration: 0.25 });
    };

    mapInstance.__wipGentleFitGuard = true;
  }

  function openSectorAccordion() {
    const panel = document.getElementById('acc-secteur-activite');
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.classList.add('block');
    panel.style.display = 'block';
    const icon = document.getElementById('icon-acc-secteur-activite');
    icon?.classList.add('rotate-180');
    const button = panel.previousElementSibling;
    if (button?.tagName === 'BUTTON') button.setAttribute('aria-expanded', 'true');
  }

  function wrapSelectSectorToOpenActivity() {
    const current = window.selectSector;
    if (typeof current !== 'function' || current.__wipSectorDefaultOpen) return;
    const wrapped = function selectSectorWithActivityOpen() {
      const result = current.apply(this, arguments);
      setTimeout(openSectorAccordion, 60);
      setTimeout(openSectorAccordion, 420);
      return result;
    };
    wrapped.__wipSectorDefaultOpen = true;
    window.selectSector = wrapped;
    try { selectSector = wrapped; } catch (error) {}
  }

  function injectStyles() {
    if (document.getElementById('wip-route-ui-refine-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-route-ui-refine-style';
    style.textContent = `
      .wip-route-trash-single{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;margin-left:auto;border-radius:8px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;font-size:13px;font-weight:1000;cursor:pointer;transition:background-color .15s ease,transform .15s ease}
      .wip-route-trash-single:hover{background:#fecaca;transform:translateY(-1px)}
      .dark .wip-route-trash-single{background:rgba(127,29,29,.28);border-color:#7f1d1d;color:#fecaca}
    `;
    document.head.appendChild(style);
  }

  function install() {
    injectStyles();
    observeRoutePanel();
    wrapRouteStepsForCleanup();
    scheduleTrashCleanup();
    installGentleMapFitGuard();
    wrapSelectSectorToOpenActivity();
    openSectorAccordion();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [150, 500, 1100, 2200, 4200, 7000, 10000, 13200, 15500].forEach((delay) => setTimeout(install, delay));
  });
  [350, 850, 1600, 3200, 5600, 8500, 11800, 14500].forEach((delay) => setTimeout(install, delay));
})();