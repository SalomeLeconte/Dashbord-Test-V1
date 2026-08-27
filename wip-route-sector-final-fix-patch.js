(() => {
  const PATCH_ID = 'wip-route-trash-sector-final-fix-2026-07-15';
  window.__WIP_ROUTE_TRASH_SECTOR_FINAL_FIX__ = PATCH_ID;

  const sectorState = window.__wipSectorAccordionState || (window.__wipSectorAccordionState = {
    initialized: false,
    wantedOpen: false,
    observer: null
  });

  function smartRowsMap() {
    return window.__wipSmartRouteRows instanceof Map ? window.__wipSmartRouteRows : null;
  }

  function normalizeIndex(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }

  function rowId(row) {
    return row && row._rowIndex !== undefined ? normalizeIndex(row._rowIndex) : null;
  }

  function getRow(rowIndex) {
    const id = normalizeIndex(rowIndex);
    const map = smartRowsMap();
    if (map?.has(id)) return map.get(id);
    return (window.globalData || globalData || []).find((row) => rowId(row) === id) || null;
  }

  function getMapInstance() {
    try { if (map) return map; } catch (error) {}
    return window.map || null;
  }

  function isBlueSmartLayer(layer) {
    const popupContent = (() => {
      try { return String(layer.getPopup?.()?.getContent?.() || ''); }
      catch (error) { return ''; }
    })();
    return Boolean(
      layer?.__wipSmartRouteRowIndex !== undefined ||
      layer?._icon?.querySelector?.('.wip-smart-blue-marker') ||
      popupContent.includes('Ajout manuel depuis la recherche intelligente')
    );
  }

  function sameCoordinates(layer, row) {
    if (!row || !Number.isFinite(row._lat) || !Number.isFinite(row._lon) || typeof layer.getLatLng !== 'function') return false;
    try {
      const latLng = layer.getLatLng();
      return Math.abs(Number(latLng.lat) - Number(row._lat)) < 0.000001 && Math.abs(Number(latLng.lng) - Number(row._lon)) < 0.000001;
    } catch (error) {
      return false;
    }
  }

  function walkLayers(layer, callback) {
    if (!layer) return;
    callback(layer);
    if (typeof layer.eachLayer === 'function') {
      const children = [];
      try { layer.eachLayer((child) => children.push(child)); } catch (error) {}
      children.forEach((child) => walkLayers(child, callback));
    }
  }

  function annotateBlueMarkers() {
    const mapInstance = getMapInstance();
    const mapRows = smartRowsMap();
    if (!mapInstance || !mapRows) return;
    const layers = [];
    try { mapInstance.eachLayer((layer) => walkLayers(layer, (child) => layers.push(child))); } catch (error) {}
    mapRows.forEach((row, id) => {
      layers.forEach((layer) => {
        if (isBlueSmartLayer(layer) && sameCoordinates(layer, row)) layer.__wipSmartRouteRowIndex = id;
      });
    });
  }

  function removeBlueMarkerForRow(rowIndex) {
    const id = normalizeIndex(rowIndex);
    const row = getRow(id);
    const mapInstance = getMapInstance();
    if (!mapInstance) return;
    const toRemove = [];
    try {
      mapInstance.eachLayer((layer) => {
        walkLayers(layer, (child) => {
          if (!isBlueSmartLayer(child)) return;
          if (child.__wipSmartRouteRowIndex === id || sameCoordinates(child, row)) toRemove.push(child);
        });
      });
    } catch (error) {}
    toRemove.forEach((layer) => {
      try { layer.remove?.(); } catch (error) {
        try { mapInstance.removeLayer(layer); } catch (innerError) {}
      }
    });
  }

  function clearAllBlueMarkers() {
    const mapInstance = getMapInstance();
    if (!mapInstance) return;
    const toRemove = [];
    try {
      mapInstance.eachLayer((layer) => {
        walkLayers(layer, (child) => {
          if (isBlueSmartLayer(child)) toRemove.push(child);
        });
      });
    } catch (error) {}
    toRemove.forEach((layer) => {
      try { layer.remove?.(); } catch (error) {
        try { mapInstance.removeLayer(layer); } catch (innerError) {}
      }
    });
  }

  function currentFilteredContains(rowIndex) {
    const id = normalizeIndex(rowIndex);
    try { return Array.isArray(currentFilteredData) && currentFilteredData.some((row) => rowId(row) === id); }
    catch (error) { return false; }
  }

  function hasDisplayedRoute() {
    try { if (routeLine) return true; } catch (error) {}
    try { if (Array.isArray(window.__lastRoutePointsV18) && window.__lastRoutePointsV18.length > 1) return true; } catch (error) {}
    return false;
  }

  function recalculateRouteAfterSmartChange() {
    if (!hasDisplayedRoute()) return;
    window.setTimeout(() => {
      try {
        if (typeof calculateRouteFromVisiblePoints === 'function') calculateRouteFromVisiblePoints(true);
        else if (typeof window.calculateRouteFromVisiblePoints === 'function') window.calculateRouteFromVisiblePoints(true);
      } catch (error) {}
    }, 80);
  }

  function removeSmartRow(rowIndex, options = {}) {
    const id = normalizeIndex(rowIndex);
    const mapRows = smartRowsMap();
    if (!mapRows?.has(id)) return false;
    mapRows.delete(id);
    removeBlueMarkerForRow(id);
    if (typeof updateRouteStatus === 'function') {
      try { updateRouteStatus('Point ajouté par recherche supprimé de l’itinéraire.', true); } catch (error) {}
    }
    if (options.recalculate !== false) recalculateRouteAfterSmartChange();
    return true;
  }

  function wrapExcludeRoutePoint() {
    const current = window.excludeRoutePoint;
    if (typeof current !== 'function' || current.__wipSmartTrashFinalFix) return;

    const wrapped = function excludeRoutePointWithSmartSupport(rowIndex) {
      const id = normalizeIndex(rowIndex);
      const wasSmart = removeSmartRow(id, { recalculate: false });

      if (wasSmart && !currentFilteredContains(id)) {
        recalculateRouteAfterSmartChange();
        return;
      }

      const result = current.apply(this, arguments);
      if (wasSmart) recalculateRouteAfterSmartChange();
      return result;
    };

    wrapped.__wipSmartTrashFinalFix = true;
    window.excludeRoutePoint = wrapped;
    try { excludeRoutePoint = wrapped; } catch (error) {}
  }

  function wrapSmartAdd() {
    const current = window.addSmartClientToMap;
    if (typeof current !== 'function' || current.__wipSmartAddFinalFix) return;

    const wrapped = async function addSmartClientToMapWithTrackedBlueMarker(rowIndex) {
      const result = await current.apply(this, arguments);
      const row = getRow(rowIndex);
      const id = rowId(row);
      const mapRows = smartRowsMap();
      if (mapRows && id !== null && row && Number.isFinite(row._lat) && Number.isFinite(row._lon)) {
        mapRows.set(id, row);
        window.setTimeout(annotateBlueMarkers, 40);
      }
      return result;
    };

    wrapped.__wipSmartAddFinalFix = true;
    window.addSmartClientToMap = wrapped;
    try { addSmartClientToMap = wrapped; } catch (error) {}
  }

  function wrapClearRoute() {
    const current = window.clearRoute;
    if (typeof current !== 'function' || current.__wipSmartClearFinalFix) return;

    const wrapped = function clearRouteWithSmartMarkerCleanup(showStatus = true) {
      const result = current.apply(this, arguments);
      if (showStatus !== false) {
        smartRowsMap()?.clear();
        clearAllBlueMarkers();
      }
      return result;
    };

    wrapped.__wipSmartClearFinalFix = true;
    window.clearRoute = wrapped;
    try { clearRoute = wrapped; } catch (error) {}
  }

  function sectorPanel() { return document.getElementById('acc-secteur-activite'); }
  function sectorButton() {
    const panel = sectorPanel();
    if (panel?.previousElementSibling?.tagName === 'BUTTON') return panel.previousElementSibling;
    return [...document.querySelectorAll('button')].find((button) => (button.textContent || '').toLowerCase().includes('secteur d')) || null;
  }
  function sectorIcon() { return document.getElementById('icon-acc-secteur-activite'); }

  function setSectorOpen(open) {
    const panel = sectorPanel();
    if (!panel) return;
    sectorState.wantedOpen = Boolean(open);
    panel.classList.toggle('hidden', !open);
    panel.classList.toggle('block', open);
    panel.style.display = open ? '' : 'none';
    sectorIcon()?.classList.toggle('rotate-180', open);
    sectorButton()?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function reconcileSectorState() {
    setSectorOpen(sectorState.wantedOpen);
  }

  function installSectorAccordionBehavior() {
    const panel = sectorPanel();
    const button = sectorButton();
    if (!panel || !button) return;

    if (!sectorState.initialized) {
      sectorState.initialized = true;
      sectorState.wantedOpen = false;
      setSectorOpen(false);
    } else {
      reconcileSectorState();
    }

    if (button.dataset.wipStandardSectorToggle !== 'true') {
      button.dataset.wipStandardSectorToggle = 'true';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setSectorOpen(!sectorState.wantedOpen);
      }, true);
    }

    if (!sectorState.observer) {
      sectorState.observer = new MutationObserver(() => {
        window.requestAnimationFrame(reconcileSectorState);
      });
    }
    try {
      sectorState.observer.disconnect();
      sectorState.observer.observe(panel, { attributes: true, attributeFilter: ['class', 'style'] });
    } catch (error) {}
  }

  function wrapSelectSectorForSectorReset() {
    const current = window.selectSector;
    if (typeof current !== 'function' || current.__wipSectorFinalClosed) return;

    const wrapped = function selectSectorWithNormalClosedSectorFilter() {
      const result = current.apply(this, arguments);
      sectorState.wantedOpen = false;
      window.setTimeout(() => {
        installSectorAccordionBehavior();
        setSectorOpen(false);
      }, 80);
      return result;
    };

    wrapped.__wipSectorFinalClosed = true;
    window.selectSector = wrapped;
    try { selectSector = wrapped; } catch (error) {}
  }

  function install() {
    wrapSmartAdd();
    wrapExcludeRoutePoint();
    wrapClearRoute();
    installSectorAccordionBehavior();
    wrapSelectSectorForSectorReset();
    window.setTimeout(annotateBlueMarkers, 80);
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [120, 420, 900, 1700, 3200, 5600, 8400, 11800, 15800, 19000].forEach((delay) => window.setTimeout(install, delay));
  });
  [250, 700, 1300, 2600, 4600, 7200, 10400, 14200, 17600].forEach((delay) => window.setTimeout(install, delay));
})();
