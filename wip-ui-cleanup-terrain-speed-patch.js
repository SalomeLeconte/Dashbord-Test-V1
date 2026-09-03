(() => {
  const PATCH_ID = 'wip-terrain-speed-2026-09-03-v3';
  if (window.__WIP_UI_CLEANUP_TERRAIN_SPEED_PATCH__ === PATCH_ID) return;
  window.__WIP_UI_CLEANUP_TERRAIN_SPEED_PATCH__ = PATCH_ID;

  const GEOJSON_URL_PART = 'france-geojson/master/departements.geojson';
  let terrainGeojsonPromise = null;
  let terrainGeojsonData = null;
  let terrainSignature = '';

  function norm(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function terrainSig() {
    let depts = '';
    try {
      if (Array.isArray(window.selectedSectorDepts)) depts = window.selectedSectorDepts.join('|');
    } catch (error) {}
    const user = document.getElementById('active-user-name')?.textContent || '';
    const dataSize = Array.isArray(window.globalData) ? window.globalData.length : 0;
    return `${norm(user)}::${depts}::${dataSize}`;
  }

  function prefetchTerrainGeojson() {
    if (terrainGeojsonPromise || typeof fetch !== 'function') return terrainGeojsonPromise;
    terrainGeojsonPromise = fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson', { cache: 'force-cache' })
      .then((response) => response.ok ? response.clone().json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((json) => {
        terrainGeojsonData = json;
        return json;
      })
      .catch(() => {
        terrainGeojsonPromise = null;
        return null;
      });
    return terrainGeojsonPromise;
  }

  function installGeojsonFetchCache() {
    if (window.fetch?.__wipTerrainGeojsonCache) return;
    const originalFetch = window.fetch.bind(window);
    const wrappedFetch = function wipTerrainCachedFetch(input, init) {
      const url = String(typeof input === 'string' ? input : input?.url || '');
      if (url.includes(GEOJSON_URL_PART) && terrainGeojsonData) {
        return Promise.resolve(new Response(JSON.stringify(terrainGeojsonData), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-WIP-Terrain-Cache': '1' }
        }));
      }
      return originalFetch(input, init);
    };
    wrappedFetch.__wipTerrainGeojsonCache = true;
    window.fetch = wrappedFetch;
  }

  function installTerrainSpeed() {
    installGeojsonFetchCache();
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => prefetchTerrainGeojson(), { timeout: 2500 });
    else setTimeout(prefetchTerrainGeojson, 1200);

    const currentRender = window.renderMonTerrainMap;
    if (typeof currentRender === 'function' && !currentRender.__wipTerrainSpeed) {
      const wrappedRender = function renderMonTerrainMapFast(...args) {
        const sig = terrainSig();
        const mapDiv = document.getElementById('v18-terrain-map');
        const existingMap = window.__terrainMapV18 || window.__terrainLeafletMap;
        if (terrainSignature === sig && existingMap && mapDiv?.querySelector?.('.leaflet-container')) {
          setTimeout(() => {
            try { existingMap.invalidateSize?.(); } catch (error) {}
          }, 40);
          return existingMap;
        }
        terrainSignature = sig;
        prefetchTerrainGeojson();
        return currentRender.apply(this, args);
      };
      wrappedRender.__wipTerrainSpeed = true;
      window.renderMonTerrainMap = wrappedRender;
      try { renderMonTerrainMap = wrappedRender; } catch (error) {}
    }

    const currentOpen = window.openMonTerrain;
    if (typeof currentOpen === 'function' && !currentOpen.__wipTerrainSpeed) {
      const wrappedOpen = function openMonTerrainFast(...args) {
        prefetchTerrainGeojson();
        const result = currentOpen.apply(this, args);
        setTimeout(() => {
          try {
            const map = window.__terrainMapV18 || window.__terrainLeafletMap;
            map?.invalidateSize?.();
          } catch (error) {}
        }, 140);
        return result;
      };
      wrappedOpen.__wipTerrainSpeed = true;
      window.openMonTerrain = wrappedOpen;
      try { openMonTerrain = wrappedOpen; } catch (error) {}
    }
  }

  function install() {
    try { installTerrainSpeed(); } catch (error) { console.warn('Optimisation Mon terrain impossible.', error); }
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', install);
  setTimeout(install, 900);
})();
