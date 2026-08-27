(() => {
  const PATCH_ID = 'wip-ui-cleanup-terrain-speed-2026-08-27';
  if (window.__WIP_UI_CLEANUP_TERRAIN_SPEED_PATCH__ === PATCH_ID) return;
  window.__WIP_UI_CLEANUP_TERRAIN_SPEED_PATCH__ = PATCH_ID;

  const GEOJSON_URL_PART = 'france-geojson/master/departements.geojson';
  let installQueued = false;
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

  function ownHeaderText(node) {
    if (!node) return '';
    const clone = node.cloneNode(true);
    clone.querySelectorAll('select,input,textarea,option,table,tbody,.wip-undercarriage-integrated-body,#wip-undercarriage-filter').forEach((child) => child.remove());
    return clone.textContent || '';
  }

  function isUndercarriageHeader(node) {
    const text = norm(ownHeaderText(node));
    if (!text) return false;
    return /^7\s*[.)-]?\s*undercarriage\b/.test(text) && text.length <= 60;
  }

  function blockForHeader(header) {
    if (!header) return null;
    const integrated = header.closest?.('#wip-undercarriage-integrated-accordion');
    if (integrated) return integrated;
    const details = header.closest?.('details');
    if (details && norm(details.textContent || '').includes('undercarriage')) return details;
    const button = header.closest?.('button');
    if (button && isUndercarriageHeader(button)) return button;
    return header;
  }

  function blockScore(block, order) {
    if (!block) return 0;
    let score = order;
    if (block.querySelector?.('#wip-undercarriage-filter')) score += 1000;
    if (block.id === 'wip-undercarriage-integrated-accordion') score += 900;
    if (block.matches?.('details')) score += 100;
    if ((block.textContent || '').length > 120) score += 80;
    if (block.querySelector?.('select,input,button')) score += 60;
    return score;
  }

  function removeFirstUndercarriageDuplicate() {
    const candidates = [...document.querySelectorAll('summary,button,[role="button"],div')]
      .filter(isUndercarriageHeader);
    const blocks = [];
    candidates.forEach((header) => {
      const block = blockForHeader(header);
      if (!block || blocks.includes(block)) return;
      blocks.push(block);
    });

    if (blocks.length <= 1) return;

    let keep = blocks[blocks.length - 1];
    let bestScore = -1;
    blocks.forEach((block, index) => {
      const score = blockScore(block, index);
      if (score >= bestScore) {
        bestScore = score;
        keep = block;
      }
    });

    blocks.forEach((block) => {
      if (block === keep) {
        block.classList.remove('wip-uc-duplicate-hidden');
        block.style.removeProperty('display');
        return;
      }
      block.classList.add('wip-uc-duplicate-hidden');
      block.setAttribute('aria-hidden', 'true');
    });
  }

  function hideLegacyRouteStartPanel() {
    document.querySelectorAll('#wip-route-start-home,.wip-route-start-home').forEach((node) => {
      node.classList.add('wip-legacy-route-start-hidden');
      node.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('input[name="wip-route-start-mode"]').forEach((input) => {
      const root = input.closest?.('#wip-route-start-home,.wip-route-start-home')
        || input.closest?.('section,details,label,.rounded-xl,.rounded-2xl,div');
      if (!root || root.id === 'wip-safe-home-route-panel' || root.closest?.('#wip-safe-home-route-panel')) return;
      root.classList.add('wip-legacy-route-start-hidden');
      root.setAttribute('aria-hidden', 'true');
    });
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
    terrainGeojsonPromise = fetch(`https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson`, { cache: 'force-cache' })
      .then((response) => response.ok ? response.clone().json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((json) => {
        terrainGeojsonData = json;
        return json;
      })
      .catch((error) => {
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

  function installStyles() {
    if (document.getElementById('wip-ui-cleanup-terrain-speed-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-ui-cleanup-terrain-speed-style';
    style.textContent = `
      .wip-uc-duplicate-hidden{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;pointer-events:none!important}
      #wip-route-start-home.wip-legacy-route-start-hidden,
      .wip-route-start-home.wip-legacy-route-start-hidden,
      .wip-legacy-route-start-hidden{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;pointer-events:none!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    hideLegacyRouteStartPanel();
    removeFirstUndercarriageDuplicate();
    installTerrainSpeed();
  }

  function queueInstall() {
    if (installQueued) return;
    installQueued = true;
    setTimeout(() => {
      installQueued = false;
      try { install(); } catch (error) { console.warn('Patch UI terrain cleanup impossible.', error); }
    }, 80);
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', queueInstall);
  document.addEventListener('dashboard:grid-rendered', queueInstall);
  setTimeout(install, 600);
  setTimeout(install, 1800);
  setTimeout(install, 4200);
  try { new MutationObserver(queueInstall).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
