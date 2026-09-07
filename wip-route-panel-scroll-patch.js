(() => {
  const PATCH_ID = 'wip-route-panel-scroll-2026-09-07-v2';
  if (window.__WIP_ROUTE_PANEL_SCROLL_PATCH__ === PATCH_ID) return;
  window.__WIP_ROUTE_PANEL_SCROLL_PATCH__ = PATCH_ID;

  let syncRaf = 0;
  let resizeObserver = null;

  function injectStyles() {
    let style = document.getElementById('wip-route-panel-scroll-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'wip-route-panel-scroll-style';
      document.head.appendChild(style);
    }
    style.textContent = `
      #route-status{display:none!important}
      #route-steps{
        box-sizing:border-box!important;
        overflow-y:auto!important;
        overscroll-behavior:contain!important;
        scrollbar-gutter:stable!important;
        scroll-padding-bottom:1.75rem!important;
        padding-bottom:1.75rem!important;
        min-height:0!important;
      }
      #route-steps > :last-child{
        margin-bottom:1rem!important;
      }
    `;
  }

  function removeRouteStatus() {
    const status = document.getElementById('route-status');
    if (status) status.remove();
  }

  function mapContainer() {
    const view = document.getElementById('view-map');
    const map = document.getElementById('map');
    if (view) {
      const rect = view.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return view;
    }
    return map;
  }

  function syncPanelHeightNow() {
    syncRaf = 0;
    removeRouteStatus();

    const panel = document.getElementById('route-steps');
    const mapBox = mapContainer();
    if (!panel || !mapBox) return;

    panel.dataset.wipRoutePanelScroll = PATCH_ID;
    panel.style.setProperty('overflow-y', 'auto', 'important');
    panel.style.setProperty('overscroll-behavior', 'contain', 'important');

    const mapRect = mapBox.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    if (mapRect.height <= 0 || mapRect.width <= 0 || panelRect.top <= 0) return;

    // La box itinéraire ne doit jamais dépasser la box qui contient la carte.
    // On utilise l'espace réellement disponible entre le haut actuel du panneau
    // et le bas de la carte, après suppression du bandeau route-status.
    const bottomGap = 10;
    const availableFromPanelTop = Math.floor(mapRect.bottom - panelRect.top - bottomGap);
    const mapHeightLimit = Math.floor(mapRect.height - bottomGap * 2);
    const maxHeight = Math.max(120, Math.min(availableFromPanelTop, mapHeightLimit));

    panel.style.setProperty('max-height', `${maxHeight}px`, 'important');
    panel.style.setProperty('height', 'auto', 'important');
  }

  function schedulePanelSync() {
    if (syncRaf) return;
    syncRaf = requestAnimationFrame(syncPanelHeightNow);
  }

  function observeGeometry() {
    if (resizeObserver || typeof ResizeObserver !== 'function') return;
    resizeObserver = new ResizeObserver(schedulePanelSync);
    [document.getElementById('view-map'), document.getElementById('map'), document.getElementById('map-toolbar'), document.getElementById('route-steps')]
      .filter(Boolean)
      .forEach(node => resizeObserver.observe(node));
  }

  function install() {
    injectStyles();
    removeRouteStatus();
    observeGeometry();
    schedulePanelSync();
  }

  install();
  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('resize', schedulePanelSync, { passive: true });
  window.addEventListener('orientationchange', schedulePanelSync, { passive: true });
  document.addEventListener('click', () => setTimeout(schedulePanelSync, 0), true);

  const observer = new MutationObserver(() => {
    removeRouteStatus();
    observeGeometry();
    schedulePanelSync();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
