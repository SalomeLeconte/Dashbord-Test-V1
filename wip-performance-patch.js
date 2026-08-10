(() => {
  const ROW_BATCH_SIZE = 200;
  const originalLoadCSVData = window.loadCSVData;
  const originalSelectSector = window.selectSector;
  const originalBypassSelection = window.bypassSelection;
  const originalRenderGrid = window.renderGrid;

  let dataLoadStarted = false;
  let dataLoadPromise = null;
  let visibleRowLimit = ROW_BATCH_SIZE;
  let lastGridData = null;

  function hasLoadedData() {
    try { return Array.isArray(globalData) && globalData.length > 0; }
    catch (error) { return false; }
  }

  function startDataLoad() {
    if (hasLoadedData()) return Promise.resolve(true);
    if (dataLoadPromise) return dataLoadPromise;
    if (typeof originalLoadCSVData !== 'function') return Promise.resolve(false);

    dataLoadStarted = true;
    dataLoadPromise = Promise.resolve(originalLoadCSVData()).then(success => {
      if (!success) {
        dataLoadStarted = false;
        dataLoadPromise = null;
      }
      return success;
    }).catch(error => {
      dataLoadStarted = false;
      dataLoadPromise = null;
      console.error('Chargement différé des données impossible.', error);
      return false;
    });

    return dataLoadPromise;
  }

  function updateLoadMoreControl(totalRows) {
    const tableView = document.getElementById('view-table');
    if (!tableView) return;

    let wrapper = document.getElementById('grid-load-more-wrapper');
    if (visibleRowLimit >= totalRows) {
      wrapper?.remove();
      return;
    }

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'grid-load-more-wrapper';
      wrapper.className = 'sticky bottom-0 z-20 flex justify-center border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95';
      wrapper.innerHTML = '<button id="grid-load-more" type="button" class="rounded-xl border border-komatsu-500/40 bg-komatsu-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-komatsu-700 transition hover:bg-komatsu-500/20 dark:text-komatsu-300">Afficher plus</button>';
      tableView.appendChild(wrapper);
      wrapper.querySelector('#grid-load-more')?.addEventListener('click', () => {
        visibleRowLimit += ROW_BATCH_SIZE;
        if (Array.isArray(lastGridData)) window.renderGrid(lastGridData);
      });
    }

    const button = wrapper.querySelector('#grid-load-more');
    if (button) {
      const nextCount = Math.min(ROW_BATCH_SIZE, totalRows - visibleRowLimit);
      button.textContent = `Afficher ${nextCount} résultat(s) de plus — ${Math.min(visibleRowLimit, totalRows)}/${totalRows}`;
    }
  }

  window.loadCSVData = function coordinatedInitialLoad() {
    return startDataLoad();
  };

  if (typeof originalSelectSector === 'function') {
    window.selectSector = function optimizedSelectSector(...args) {
      const result = originalSelectSector.apply(this, args);
      if (!hasLoadedData() && typeof window.setLoadingState === 'function') {
        window.setLoadingState('Chargement de data11.csv...');
      }
      startDataLoad();
      return result;
    };
  }

  if (typeof originalBypassSelection === 'function') {
    window.bypassSelection = function optimizedBypassSelection(...args) {
      const result = originalBypassSelection.apply(this, args);
      if (!hasLoadedData() && typeof window.setLoadingState === 'function') {
        window.setLoadingState('Chargement de data11.csv...');
      }
      startDataLoad();
      return result;
    };
  }

  window.addEventListener('online', () => {
    if (!dataLoadStarted) startDataLoad();
  });

  // Le parsing est réalisé dans un Worker : le téléchargement peut donc démarrer
  // immédiatement sans bloquer la sélection du portefeuille ni l'interface.
  startDataLoad();

  if (typeof originalRenderGrid === 'function') {
    window.renderGrid = function optimizedRenderGrid(data) {
      const safeData = Array.isArray(data) ? data : [];
      if (safeData !== lastGridData) {
        visibleRowLimit = ROW_BATCH_SIZE;
        lastGridData = safeData;
      }

      const visibleData = safeData.slice(0, visibleRowLimit);
      const isMobile = window.matchMedia('(max-width: 767px)').matches;

      if (isMobile) {
        window.renderMobileGridCards?.(visibleData);
        const tbody = document.getElementById('grid-tbody');
        if (tbody) tbody.innerHTML = '';
      } else {
        const originalMobileRenderer = window.renderMobileGridCards;
        window.renderMobileGridCards = () => {};
        try { originalRenderGrid(visibleData); }
        finally { window.renderMobileGridCards = originalMobileRenderer; }
      }

      updateLoadMoreControl(safeData.length);
    };
  }
})();

(() => {
  window.__WIP_FEATURE_PATCH__ = 'wip-final-map-terrain-route-reset-2026-07-10';
  let routeRecalcTimer = null;
  let terrainRunId = 0;

  const esc = (value) => {
    try { return escapeHtml(value); }
    catch (error) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[char]));
    }
  };

  const norm = (value) => {
    try { return normalizeText(value); }
    catch (error) {
      return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }
  };

  function excludedSet() {
    if (!(window.__routeExcludedV18 instanceof Set)) window.__routeExcludedV18 = new Set();
    return window.__routeExcludedV18;
  }

  function addChristopherDepartments() {
    try {
      const christopher = pssrData.find((pssr) =>
        norm(pssr?.prenom) === 'christopher' && norm(pssr?.nom).includes('borrhomee')
      );
      if (christopher) christopher.depts = [...new Set([...(christopher.depts || []), '27', '76'])];
    } catch (error) {
      console.warn('Ajout départements Christopher impossible.', error);
    }
  }

  function refreshPortfolioChoice() {
    addChristopherDepartments();
    try {
      if (document.getElementById('collaborator-grid') && typeof renderCollaboratorGrid === 'function') {
        renderCollaboratorGrid();
      }
    } catch (error) {
      console.warn('Rafraîchissement du choix portefeuille impossible.', error);
    }
  }

  function selectedDepartments() {
    try {
      if (Array.isArray(selectedSectorDepts) && selectedSectorDepts.length) {
        return [...new Set(selectedSectorDepts.map((dept) => normalizeDept(dept)).filter(Boolean))];
      }
    } catch (error) {}
    return [];
  }

  function isClient(item) {
    const value = norm(item?.[COL.position] || '');
    return value === 'cl' || value.includes('client');
  }

  function isTop10(item) {
    try {
      ensureTop200RankCache();
      const rank = Number(getTop200Rank(item));
      return Number.isFinite(rank) && rank > 0 && rank <= 10;
    } catch (error) { return false; }
  }

  function isNovelty(item) {
    try { return Boolean(hasNewMachine(item)); }
    catch (error) { return false; }
  }

  function tableNewMachineBadge(item) {
    if (!isNovelty(item)) return '';
    try {
      const badge = getDataBadges(item).find((entry) => norm(entry?.label) === 'nouvelle machine');
      if (badge) {
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black ${badge.cls}">${esc(badge.label)}</span>`;
      }
    } catch (error) {}
    return '<span class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">Nouvelle machine</span>';
  }

  function markerHtml(item) {
    const excluded = excludedSet().has(item?._rowIndex);
    const top10 = isTop10(item);
    const novelty = isNovelty(item);

    if (excluded) return '<div class="wip-marker wip-marker-excluded"></div>';
    if (top10 && novelty) return '<div class="wip-marker-new-ring"><div class="wip-marker wip-marker-gold"></div></div>';
    if (top10) return '<div class="wip-marker wip-marker-gold"></div>';
    if (novelty) return '<div class="wip-marker wip-marker-new"></div>';
    return '<div class="wip-marker wip-marker-standard"></div>';
  }

  function markerIcon(item) {
    return L.divIcon({
      className: '',
      html: markerHtml(item),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -14]
    });
  }

  function popupHtml(item) {
    const excluded = excludedSet().has(item?._rowIndex);
    const topBadge = isTop10(item) ? '<span class="wip-popup-badge gold">TOP 10</span>' : '';
    const noveltyBadge = tableNewMachineBadge(item);
    const excludedBadge = excluded ? '<span class="wip-popup-badge excluded">HORS ITINÉRAIRE</span>' : '';

    return `<div class="text-xs space-y-1 min-w-[220px]">
      <div class="font-bold">${esc(item?.[COL.nom] || 'Entreprise')}</div>
      <div>${esc(item?.[COL.ville] || '')} (${esc(item?._deptNorm || '')})</div>
      <div>${esc(item?.[COL.adresse] || '')}</div>
      <div class="wip-map-badges">${topBadge}${noveltyBadge}${excludedBadge}</div>
      <div class="font-bold text-amber-600">${esc(formatMoney(getTableFinancialAmount(item)))} <span class="text-[10px] text-gray-400">CA 2025</span></div>
      <div class="flex items-center gap-1 mt-2">
        <button onclick="openDetails(${item._rowIndex})" class="bg-slate-900 text-white text-[10px] px-2 py-1 rounded font-bold">Détails</button>
        ${excluded ? `<button onclick="excludeRoutePoint(${item._rowIndex})" class="wip-route-add" title="Rajouter et réoptimiser">+</button>` : ''}
      </div>
    </div>`;
  }

  function installMarkerRendering() {
    const render = function renderKnownMarkersWip(data) {
      if (!map || !markersLayer) return { markers: 0, bounds: [] };
      markersLayer.clearLayers();
      const bounds = [];
      let markers = 0;

      (data || []).forEach((item) => {
        if (!hasCoordinates(item)) return;
        const marker = L.marker([item._lat, item._lon], { icon: markerIcon(item) }).bindPopup(popupHtml(item));
        markersLayer.addLayer(marker);
        bounds.push([item._lat, item._lon]);
        markers += 1;
      });

      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
      return { markers, bounds };
    };
    window.renderKnownMarkers = render;
    try { renderKnownMarkers = render; } catch (error) {}
  }

  function preserveExcludedDuringInternalClear() {
    if (typeof clearRoute !== 'function' || clearRoute.__wipPreserveExcluded) return;
    const oldClearRoute = clearRoute;
    const wrapped = function clearRouteWip(showStatus = true) {
      const set = excludedSet();
      const snapshot = new Set(set);
      const result = oldClearRoute.apply(this, arguments);
      if (showStatus === false) {
        set.clear();
        snapshot.forEach((value) => set.add(value));
      }
      return result;
    };
    wrapped.__wipPreserveExcluded = true;
    window.clearRoute = wrapped;
    try { clearRoute = wrapped; } catch (error) {}
  }

  function installRouteCalculationFilter() {
    if (typeof calculateRouteFromVisiblePoints !== 'function' || calculateRouteFromVisiblePoints.__wipExcludedFilter) return;
    const oldCalculate = calculateRouteFromVisiblePoints;
    const wrapped = async function calculateRouteFilteredWip(optimize = true) {
      const saved = currentFilteredData;
      currentFilteredData = (saved || []).filter((item) => !excludedSet().has(item?._rowIndex));
      try {
        return await oldCalculate.call(this, optimize);
      } finally {
        currentFilteredData = saved;
        setTimeout(() => {
          try { renderKnownMarkers(saved || []); } catch (error) {}
        }, 0);
      }
    };
    wrapped.__wipExcludedFilter = true;
    window.calculateRouteFromVisiblePoints = wrapped;
    try { calculateRouteFromVisiblePoints = wrapped; } catch (error) {}
  }

  function alignRouteMapLeft() {
    try {
      if (!map || typeof isMapVisible === 'function' && !isMapVisible()) return;
      const panel = document.getElementById('route-steps');
      const mapEl = document.getElementById('map');
      if (!panel || !mapEl || panel.classList.contains('hidden') || panel.style.display === 'none') return;
      const panelWidth = panel.getBoundingClientRect().width || 0;
      const mapWidth = mapEl.getBoundingClientRect().width || 0;
      if (!panelWidth || !mapWidth) return;
      const offset = Math.min(Math.max(panelWidth * 0.55, 140), mapWidth * 0.30);
      map.panBy([offset, 0], { animate: false });
    } catch (error) {
      console.warn('Alignement carte itinéraire impossible.', error);
    }
  }

  function installRouteViewAlignment() {
    if (typeof drawRoute !== 'function' || drawRoute.__wipAligned) return;
    const oldDrawRoute = drawRoute;
    const wrapped = async function drawRouteAlignedWip() {
      const result = await oldDrawRoute.apply(this, arguments);
      setTimeout(alignRouteMapLeft, 80);
      setTimeout(alignRouteMapLeft, 240);
      return result;
    };
    wrapped.__wipAligned = true;
    window.drawRoute = wrapped;
    try { drawRoute = wrapped; } catch (error) {}
  }

  function scheduleRouteRecalculation() {
    clearTimeout(routeRecalcTimer);
    routeRecalcTimer = setTimeout(() => {
      if (typeof calculateRouteFromVisiblePoints === 'function') calculateRouteFromVisiblePoints(true);
    }, 220);
  }

  function installMultipleRouteRemoval() {
    const toggleRoutePoint = function excludeRoutePointWip(rowIndex) {
      const set = excludedSet();
      if (set.has(rowIndex)) set.delete(rowIndex);
      else set.add(rowIndex);

      try {
        if (Array.isArray(manualRouteOrder) && set.has(rowIndex)) {
          manualRouteOrder = manualRouteOrder.filter((index) => index !== rowIndex);
        }
      } catch (error) {}

      try { renderKnownMarkers(currentFilteredData || []); }
      catch (error) {}
      scheduleRouteRecalculation();
    };
    window.excludeRoutePoint = toggleRoutePoint;
    try { excludeRoutePoint = toggleRoutePoint; } catch (error) {}
  }

  function restoreOldReleasePopup() {
    const modal = document.getElementById('v18-release-modal');
    if (!modal) return;
    modal.querySelectorAll('.v23-release-shortcuts').forEach((element) => element.remove());

    const openOldPopup = function openReleaseNotesWip() {
      modal.querySelectorAll('.v23-release-shortcuts').forEach((element) => element.remove());
      modal.classList.add('open');
    };
    window.openReleaseNotes = openOldPopup;

    const noveltyButton = document.getElementById('v18-info-button');
    if (noveltyButton) {
      noveltyButton.onclick = openOldPopup;
      noveltyButton.title = 'Nouveautés WIP';
    }
  }

  function terrainRows(depts) {
    return (globalData || []).filter((item) => depts.includes(item?._deptNorm));
  }

  function terrainClientRows(depts) {
    return terrainRows(depts).filter(isClient);
  }

  function terrainStats(depts) {
    const grouped = new Map(depts.map((dept) => [dept, { dept, total: 0, clients: 0, prospects: 0, visits: 0, objective: 0 }]));
    terrainRows(depts).forEach((item) => {
      const stats = grouped.get(item._deptNorm);
      if (!stats) return;
      stats.total += 1;
      if (isClient(item)) stats.clients += 1;
      else stats.prospects += 1;
      try { stats.visits += getVisits2026(item); } catch (error) {}
      try { stats.objective += getObjectiveVisits(item); } catch (error) {}
    });
    return [...grouped.values()].sort((a, b) => a.dept.localeCompare(b.dept, 'fr', { numeric: true }));
  }

  function terrainStatsHtml(stats) {
    return stats.map((item) => {
      const remaining = Math.max(0, item.objective - item.visits);
      const donePct = item.objective > 0 ? Math.min(100, Math.round((item.visits / item.objective) * 100)) : 0;
      return `<div class="wip-terrain-dept-card">
        <div class="wip-terrain-dept-title"><span>Dépt ${esc(item.dept)}</span><span>${item.total} entreprise(s)</span></div>
        <div class="wip-terrain-dept-grid">
          <div>Clients : <b>${item.clients}</b></div>
          <div>Prospects : <b>${item.prospects}</b></div>
          <div>Visites faites : <b>${item.visits}</b></div>
          <div>Reste : <b>${remaining}</b></div>
          <div>Avancement : <b>${donePct}%</b></div>
        </div>
      </div>`;
    }).join('');
  }

  function buildHeatCells(rows) {
    const step = 0.12;
    const cells = new Map();
    rows.forEach((item) => {
      if (!hasCoordinates(item)) return;
      const latBucket = Math.round(item._lat / step);
      const lonBucket = Math.round(item._lon / step);
      const key = `${latBucket}:${lonBucket}`;
      if (!cells.has(key)) cells.set(key, { lat: 0, lon: 0, count: 0 });
      const cell = cells.get(key);
      cell.lat += item._lat;
      cell.lon += item._lon;
      cell.count += 1;
    });
    return [...cells.values()].map((cell) => ({
      lat: cell.lat / cell.count,
      lon: cell.lon / cell.count,
      count: cell.count
    }));
  }

  function heatColor(intensity) {
    const clamped = Math.max(0, Math.min(1, intensity));
    const hue = Math.round(50 * (1 - clamped));
    return `hsl(${hue} 96% 50%)`;
  }

  function redrawTerrainHeat(layer, rows) {
    layer.clearLayers();
    const cells = buildHeatCells(rows);
    const maxCount = Math.max(1, ...cells.map((cell) => cell.count));

    cells.forEach((cell) => {
      const intensity = cell.count / maxCount;
      const radius = 9000 + 22000 * Math.sqrt(intensity);
      L.circle([cell.lat, cell.lon], {
        radius: radius * 1.35,
        stroke: false,
        fillColor: heatColor(Math.max(0, intensity - 0.28)),
        fillOpacity: 0.10 + intensity * 0.14,
        interactive: false,
        className: 'wip-heat-halo'
      }).addTo(layer);
      L.circle([cell.lat, cell.lon], {
        radius,
        stroke: false,
        fillColor: heatColor(intensity),
        fillOpacity: 0.30 + intensity * 0.38,
        interactive: false,
        className: 'wip-heat-core'
      }).addTo(layer);
    });
  }

  async function renderMonTerrainWip() {
    const runId = ++terrainRunId;
    const mapDiv = document.getElementById('v18-terrain-map');
    const statsBox = document.getElementById('v18-terrain-stats');
    const title = document.getElementById('v18-terrain-title');
    if (!mapDiv || !statsBox || typeof L === 'undefined') return;

    const depts = selectedDepartments();
    if (!depts.length) {
      statsBox.innerHTML = '<div class="text-sm text-gray-500">Sélectionne un PSSR pour afficher son terrain.</div>';
      return;
    }

    const stats = terrainStats(depts);
    const clients = terrainClientRows(depts);
    if (title) title.textContent = `Mon terrain — ${document.getElementById('active-user-name')?.textContent || 'PSSR'}`;
    statsBox.innerHTML = terrainStatsHtml(stats);

    try {
      window.__terrainMapV18?.remove();
      if (window.__terrainLeafletMap && window.__terrainLeafletMap !== window.__terrainMapV18) window.__terrainLeafletMap.remove();
    } catch (error) {}

    mapDiv.innerHTML = '';
    const terrainMap = L.map('v18-terrain-map', { zoomControl: true }).setView([46.6, 2.2], 6);
    window.__terrainMapV18 = terrainMap;
    window.__terrainLeafletMap = terrainMap;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(terrainMap);

    let deptBounds = null;
    try {
      const response = await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson', { cache: 'force-cache' });
      const geojson = await response.json();
      if (runId !== terrainRunId) return;
      const deptLayer = L.geoJSON(geojson, {
        filter: (feature) => depts.includes(String(feature.properties?.code || feature.properties?.CODE_DEPT || '').padStart(2, '0')),
        style: () => ({ color: '#eab308', weight: 2, fillColor: '#facc15', fillOpacity: 0.025 }),
        onEachFeature: (feature, layer) => {
          const code = String(feature.properties?.code || feature.properties?.CODE_DEPT || '').padStart(2, '0');
          const item = stats.find((entry) => entry.dept === code);
          layer.bindTooltip(`<b>Dépt ${esc(code)}</b><br>${item?.clients || 0} clients • ${item?.prospects || 0} prospects`, { sticky: true });
        }
      }).addTo(terrainMap);
      if (deptLayer.getBounds?.().isValid()) {
        deptBounds = deptLayer.getBounds();
        terrainMap.fitBounds(deptBounds, { padding: [25, 25] });
      }
    } catch (error) {
      console.warn('Contours départements indisponibles.', error);
    }

    const heatLayer = L.layerGroup().addTo(terrainMap);
    redrawTerrainHeat(heatLayer, clients);

    const missing = clients.filter((item) => !hasCoordinates(item) && buildAddressQuery(item));
    for (let index = 0; index < missing.length; index += 1) {
      if (runId !== terrainRunId || !document.getElementById('v18-terrain-modal')?.classList.contains('open')) break;
      try { await geocodeItem(missing[index]); } catch (error) {}
      if (index % 4 === 0 || index === missing.length - 1) redrawTerrainHeat(heatLayer, clients);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    if (deptBounds?.isValid()) terrainMap.fitBounds(deptBounds, { padding: [25, 25] });
  }

  function installTerrainOverride() {
    window.renderMonTerrainMap = renderMonTerrainWip;
    try { renderMonTerrainMap = renderMonTerrainWip; } catch (error) {}
    window.openMonTerrain = function openMonTerrainWip() {
      const modal = document.getElementById('v18-terrain-modal');
      if (!modal) return;
      modal.classList.add('open');
      setTimeout(renderMonTerrainWip, 80);
    };
  }

  function resetControl(control) {
    if (!control || control.disabled) return;
    if (control.matches('input[type="checkbox"],input[type="radio"]')) {
      control.checked = false;
      return;
    }
    if (control.matches('input[type="range"]')) {
      control.value = '0';
      return;
    }
    if (control.id === 'f-ca-annee') {
      control.value = 'total';
      return;
    }
    if (control.tagName === 'SELECT') {
      const emptyOption = [...control.options].find((option) => option.value === '');
      if (emptyOption) control.value = '';
      else control.selectedIndex = 0;
      return;
    }
    control.value = '';
  }

  function resetEveryFilter() {
    document.querySelectorAll('#filters-panel input,#filters-panel select,#filters-panel textarea').forEach(resetControl);
    document.querySelectorAll('#filters-panel button[data-active]').forEach((button) => { button.dataset.active = 'false'; });

    try { setNewMachineFilterActive(false); } catch (error) {}
    try { setOldMachineFilterActive(false); } catch (error) {}
    try { setWarrantyFilterActive(false); } catch (error) {}
    try { clearPriorityCheckboxes(); } catch (error) {}

    ['f-categorie', 'f-naf'].forEach((id) => {
      const control = document.getElementById(id);
      if (control) {
        control.value = '';
        try { control.dispatchEvent(new Event('change', { bubbles: true })); } catch (error) {}
      }
    });

    try { top200UseActiveFilters = false; } catch (error) {}
    try { top200Limit = 200; } catch (error) {}
    try { top200VisitFilter = ''; } catch (error) {}
    const limit = document.getElementById('top200-limit-select');
    if (limit) limit.value = '200';

    excludedSet().clear();
    try { clearRoute(false); } catch (error) {}
    try { setupCARange(); } catch (error) {}
    try { invalidateTop200Ranks(); } catch (error) {}
    try { updateTop200QuickFilters(); } catch (error) {}
    try { updateTop200FilterButton(); } catch (error) {}
    try { runFilter(); } catch (error) { console.error('Réinitialisation filtres impossible.', error); }
  }

  function installResetAllFilters() {
    window.resetAllFilters = resetEveryFilter;
    try { resetAllFilters = resetEveryFilter; } catch (error) {}
  }

  function injectStyles() {
    if (document.getElementById('wip-feature-patch-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-feature-patch-style';
    style.textContent = `
      .wip-marker{width:24px;height:24px;border-radius:999px;box-sizing:border-box;box-shadow:0 7px 18px rgba(15,23,42,.28)}
      .wip-marker-standard{background:#eab308;border:3px solid #fff}
      .wip-marker-gold{background:radial-gradient(circle at 35% 30%,#fff7ae 0 18%,#ffd700 42%,#b7791f 100%);border:3px solid #fff7ae;box-shadow:0 0 0 3px rgba(255,215,0,.4),0 8px 20px rgba(180,120,0,.45)}
      .wip-marker-new{background:#10b981;border:4px solid #fff;box-shadow:0 0 0 4px rgba(220,38,38,.88),0 8px 22px rgba(220,38,38,.36)}
      .wip-marker-excluded{background:#dc2626;border:4px solid #fff;box-shadow:0 0 0 4px rgba(127,29,29,.9),0 8px 22px rgba(127,29,29,.45)}
      .wip-marker-new-ring{width:32px;height:32px;border-radius:999px;border:4px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(220,38,38,.22)}
      .wip-marker-new-ring .wip-marker{width:20px;height:20px}
      .wip-map-badges{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:.35rem 0}
      .wip-popup-badge{display:inline-flex;border-radius:999px;padding:2px 6px;font-size:9px;font-weight:900}.wip-popup-badge.gold{color:#78350f;background:#fef3c7;border:1px solid #f59e0b}.wip-popup-badge.excluded{color:#991b1b;background:#fef2f2;border:1px solid #ef4444}
      .wip-route-add{width:24px;height:24px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;font-weight:1000;line-height:1;color:#fff;background:#16a34a;border:1px solid #15803d;box-shadow:0 6px 14px rgba(22,163,74,.28)}
      .wip-terrain-dept-card{border:1px solid #e5e7eb;border-radius:14px;padding:12px;background:#fff}.dark .wip-terrain-dept-card{background:#020617;border-color:#1e293b}.wip-terrain-dept-title{display:flex;justify-content:space-between;gap:8px;font-weight:900;font-size:12px}.wip-terrain-dept-grid{margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px}
      .wip-heat-halo,.wip-heat-core{filter:blur(4px);mix-blend-mode:multiply}
      .dark .wip-heat-halo,.dark .wip-heat-core{mix-blend-mode:screen}
    `;
    document.head.appendChild(style);
  }

  function installFeaturePatch() {
    refreshPortfolioChoice();
    injectStyles();
    preserveExcludedDuringInternalClear();
    installRouteCalculationFilter();
    installRouteViewAlignment();
    installMultipleRouteRemoval();
    installMarkerRendering();
    restoreOldReleasePopup();
    installTerrainOverride();
    installResetAllFilters();

    try {
      if (typeof isMapVisible === 'function' && isMapVisible()) renderKnownMarkers(currentFilteredData || []);
    } catch (error) {}
  }

  addChristopherDepartments();
  if (document.readyState !== 'loading') refreshPortfolioChoice();

  document.addEventListener('DOMContentLoaded', () => {
    refreshPortfolioChoice();
    [3600, 5000, 6800, 8200].forEach((delay) => setTimeout(installFeaturePatch, delay));
  });
  [4200, 6000, 7600].forEach((delay) => setTimeout(installFeaturePatch, delay));
})();
