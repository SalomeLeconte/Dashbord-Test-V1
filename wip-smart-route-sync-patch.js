(() => {
  const PATCH_ID = 'wip-smart-route-sync-2026-07-15';
  window.__WIP_SMART_ROUTE_SYNC_PATCH__ = PATCH_ID;

  const smartRouteRows = window.__wipSmartRouteRows || (window.__wipSmartRouteRows = new Map());

  function rowId(row) {
    return row && row._rowIndex !== undefined ? row._rowIndex : null;
  }

  function hasCoordinates(row) {
    return row && Number.isFinite(row._lat) && Number.isFinite(row._lon);
  }

  function belongsToActivePssr(row) {
    try {
      if (typeof itemBelongsToActivePssr === 'function') return itemBelongsToActivePssr(row);
    } catch (error) {}
    try {
      if (Array.isArray(selectedSectorDepts) && selectedSectorDepts.length) return selectedSectorDepts.includes(row?._deptNorm);
    } catch (error) {}
    return true;
  }

  function activeSmartRows() {
    return [...smartRouteRows.values()].filter((row) => hasCoordinates(row) && belongsToActivePssr(row));
  }

  function mergeRows(baseRows, extraRows) {
    const merged = [];
    const seen = new Set();
    [...(baseRows || []), ...(extraRows || [])].forEach((row) => {
      const id = rowId(row);
      if (id === null || seen.has(id)) return;
      seen.add(id);
      merged.push(row);
    });
    return merged;
  }

  function getCurrentFilteredData() {
    try { return Array.isArray(currentFilteredData) ? currentFilteredData : []; }
    catch (error) { return []; }
  }

  function setCurrentFilteredData(rows) {
    try { currentFilteredData = rows; } catch (error) {}
    try { window.currentFilteredData = rows; } catch (error) {}
  }

  function withSmartRows(fn, thisArg, args) {
    const extras = activeSmartRows();
    if (!extras.length) return fn.apply(thisArg, args);

    const saved = getCurrentFilteredData();
    const merged = mergeRows(saved, extras);
    setCurrentFilteredData(merged);

    let result;
    try {
      result = fn.apply(thisArg, args);
    } catch (error) {
      setCurrentFilteredData(saved);
      throw error;
    }

    if (result && typeof result.then === 'function') {
      return result.finally(() => setCurrentFilteredData(saved));
    }

    setCurrentFilteredData(saved);
    return result;
  }

  function clearBlueMarkerLayer(layer, mapInstance) {
    if (!layer) return;
    if (typeof layer.eachLayer === 'function') {
      const children = [];
      layer.eachLayer((child) => children.push(child));
      children.forEach((child) => clearBlueMarkerLayer(child, mapInstance));
    }

    const icon = layer._icon;
    const popupContent = (() => {
      try { return String(layer.getPopup?.()?.getContent?.() || ''); }
      catch (error) { return ''; }
    })();

    const isBlueSmartMarker = Boolean(
      icon?.querySelector?.('.wip-smart-blue-marker') ||
      popupContent.includes('Ajout manuel depuis la recherche intelligente')
    );

    if (!isBlueSmartMarker) return;

    try {
      if (layer.remove) layer.remove();
      else if (mapInstance?.removeLayer) mapInstance.removeLayer(layer);
    } catch (error) {}
  }

  function clearSmartMarkersFromMap() {
    let mapInstance;
    try { mapInstance = map; } catch (error) { mapInstance = window.map; }
    if (!mapInstance || typeof mapInstance.eachLayer !== 'function') return;
    const layers = [];
    mapInstance.eachLayer((layer) => layers.push(layer));
    layers.forEach((layer) => clearBlueMarkerLayer(layer, mapInstance));
  }

  function clearSmartRouteRows() {
    smartRouteRows.clear();
    clearSmartMarkersFromMap();
    try { if (typeof updateRouteStatus === 'function') updateRouteStatus('Itinéraire effacé. Points ajoutés par recherche supprimés.', true); } catch (error) {}
  }

  window.clearSmartClientMapAdditions = clearSmartRouteRows;
  window.getSmartRouteRows = activeSmartRows;

  function wrapSmartAdd() {
    const current = window.addSmartClientToMap;
    if (typeof current !== 'function' || current.__wipSmartRouteSync) return;

    const wrapped = async function addSmartClientToMapRouteAware(rowIndex) {
      const result = await current.apply(this, arguments);
      const row = (globalData || []).find((item) => item._rowIndex === rowIndex);
      if (hasCoordinates(row)) {
        smartRouteRows.set(rowIndex, row);
        try {
          if (typeof updateRouteStatus === 'function') {
            updateRouteStatus(`Client ajouté en bleu et inclus dans le prochain itinéraire optimisé (${activeSmartRows().length} ajout manuel).`, true);
          }
        } catch (error) {}
      }
      return result;
    };

    wrapped.__wipSmartRouteSync = true;
    window.addSmartClientToMap = wrapped;
    try { addSmartClientToMap = wrapped; } catch (error) {}
  }

  function wrapRouteBuilder(name) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipSmartRouteRows) return;

    const wrapped = function routeBuilderWithSmartRows() {
      return withSmartRows(current, this, arguments);
    };

    wrapped.__wipSmartRouteRows = true;
    window[name] = wrapped;
    try {
      if (name === 'calculateRouteFromVisiblePoints') calculateRouteFromVisiblePoints = wrapped;
      else if (name === 'prepareRoutePointsForChoice') prepareRoutePointsForChoice = wrapped;
    } catch (error) {}
  }

  function wrapClearRoute() {
    const current = window.clearRoute;
    if (typeof current !== 'function' || current.__wipSmartClearRoute) return;

    const wrapped = function clearRouteAndSmartRows(showStatus = true) {
      const shouldClearSmartRows = showStatus !== false;
      const result = current.apply(this, arguments);
      if (shouldClearSmartRows) clearSmartRouteRows();
      return result;
    };

    wrapped.__wipSmartClearRoute = true;
    window.clearRoute = wrapped;
    try { clearRoute = wrapped; } catch (error) {}
  }

  function wrapSelectSector() {
    const current = window.selectSector;
    if (typeof current !== 'function' || current.__wipSmartRouteClearOnPssr) return;

    const wrapped = function selectSectorAndClearSmartRows() {
      clearSmartRouteRows();
      return current.apply(this, arguments);
    };

    wrapped.__wipSmartRouteClearOnPssr = true;
    window.selectSector = wrapped;
    try { selectSector = wrapped; } catch (error) {}
  }

  function install() {
    wrapSmartAdd();
    wrapRouteBuilder('calculateRouteFromVisiblePoints');
    wrapRouteBuilder('prepareRoutePointsForChoice');
    wrapClearRoute();
    wrapSelectSector();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [250, 900, 1800, 3600, 6200, 9400, 12800, 16400, 18800].forEach((delay) => setTimeout(install, delay));
  });
  [550, 1400, 2600, 5200, 7600, 10800, 14600, 17600].forEach((delay) => setTimeout(install, delay));
})();
