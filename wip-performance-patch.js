(() => {
  const ROW_BATCH_SIZE = 200;

  const originalLoadCSVData = window.loadCSVData;
  const originalSelectSector = window.selectSector;
  const originalBypassSelection = window.bypassSelection;
  const originalRenderGrid = window.renderGrid;

  let dataLoadStarted = false;
  let visibleRowLimit = ROW_BATCH_SIZE;
  let lastGridData = null;

  function startDataLoadAfterPaint() {
    if (dataLoadStarted || typeof originalLoadCSVData !== 'function') return;
    dataLoadStarted = true;

    requestAnimationFrame(() => {
      setTimeout(() => {
        Promise.resolve(originalLoadCSVData()).catch((error) => {
          console.error('Chargement différé des données impossible.', error);
        });
      }, 0);
    });
  }

  function updateLoadMoreControl(totalRows) {
    const tableView = document.getElementById('view-table');
    if (!tableView) return;

    let wrapper = document.getElementById('grid-load-more-wrapper');
    const hasMore = visibleRowLimit < totalRows;

    if (!hasMore) {
      if (wrapper) wrapper.remove();
      return;
    }

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'grid-load-more-wrapper';
      wrapper.className = 'sticky bottom-0 z-20 flex justify-center border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95';
      wrapper.innerHTML = `
        <button id="grid-load-more" type="button" class="rounded-xl border border-komatsu-500/40 bg-komatsu-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-komatsu-700 transition hover:bg-komatsu-500/20 dark:text-komatsu-300">
          Afficher plus
        </button>
      `;
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

  window.loadCSVData = function deferredInitialLoad() {
    if (typeof window.setLoadingState === 'function') {
      window.setLoadingState('Sélectionnez un portefeuille pour charger les données.');
    }
  };

  if (typeof originalSelectSector === 'function') {
    window.selectSector = function optimizedSelectSector(...args) {
      const result = originalSelectSector.apply(this, args);
      startDataLoadAfterPaint();
      return result;
    };
  }

  if (typeof originalBypassSelection === 'function') {
    window.bypassSelection = function optimizedBypassSelection(...args) {
      const result = originalBypassSelection.apply(this, args);
      startDataLoadAfterPaint();
      return result;
    };
  }

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
        if (typeof window.renderMobileGridCards === 'function') {
          window.renderMobileGridCards(visibleData);
        }
        const tbody = document.getElementById('grid-tbody');
        if (tbody) tbody.innerHTML = '';
      } else {
        const originalMobileRenderer = window.renderMobileGridCards;
        window.renderMobileGridCards = () => {};

        try {
          originalRenderGrid(visibleData);
        } finally {
          window.renderMobileGridCards = originalMobileRenderer;
        }
      }

      updateLoadMoreControl(safeData.length);
    };
  }
})();

(() => {
  const PATCH_ID = 'wip-map-terrain-novelty-2026-07-10';
  window.__WIP_FEATURE_PATCH__ = PATCH_ID;

  let installed = false;
  let routeRecalcTimer = null;
  let terrainRunId = 0;

  function esc(value) {
    try { return escapeHtml(value); }
    catch (error) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[char]));
    }
  }

  function norm(value) {
    try { return normalizeText(value); }
    catch (error) {
      return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }
  }

  function excludedSet() {
    if (!(window.__routeExcludedV18 instanceof Set)) window.__routeExcludedV18 = new Set();
    return window.__routeExcludedV18;
  }

  function selectedDepartments() {
    try {
      if (Array.isArray(selectedSectorDepts) && selectedSectorDepts.length) {
        return [...new Set(selectedSectorDepts.map((dept) => normalizeDept(dept)).filter(Boolean))];
      }
    } catch (error) {}
    return [];
  }

  function addChristopherDepartments() {
    try {
      const christopher = pssrData.find((pssr) =>
        norm(pssr?.prenom) === 'christopher' && norm(pssr?.nom).includes('borrhomee')
      );
      if (!christopher) return;
      christopher.depts = [...new Set([...(christopher.depts || []), '27', '76'])];
    } catch (error) {
      console.warn('Ajout des départements Christopher impossible.', error);
    }
  }

  function isTop10(item) {
    try {
      ensureTop200RankCache();
      return Number(getTop200Rank(item)) <= 10;
    } catch (error) {
      return false;
    }
  }

  function isNovelty(item) {
    try { return Boolean(hasNewMachine(item)); }
    catch (error) { return false; }
  }

  function markerVisual(item) {
    const excluded = excludedSet().has(item?._rowIndex);
    const top10 = isTop10(item);
    const novelty = isNovelty(item);

    if (excluded) {
      return '<div class="wip-marker wip-marker-excluded" title="Retiré de l’itinéraire"></div>';
    }
    if (top10 && novelty) {
      return '<div class="wip-marker-ring-new"><div class="wip-marker wip-marker-gold" title="Top 10 + nouveauté"></div></div>';
    }
    if (top10) {
      return '<div class="wip-marker wip-marker-gold" title="Top 10"></div>';
    }
    if (novelty) {
      return '<div class="wip-marker wip-marker-new" title="Nouvelle machine"></div>';
    }
    return '<div class="wip-marker wip-marker-standard"></div>';
  }

  function iconFor(item) {
    if (typeof L === 'undefined') return undefined;
    return L.divIcon({
      className: '',
      html: markerVisual(item),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -14]
    });
  }

  function popupFor(item) {
    const excluded = excludedSet().has(item?._rowIndex);
    const top10 = isTop10(item);
    const novelty = isNovelty(item);
    const badges = [
      top10 ? '<span class="wip-popup-badge wip-popup-gold">TOP 10</span>' : '',
      novelty ? '<span class="wip-popup-badge wip-popup-new">NOUVEAUTÉ</span>' : '',
      excluded ? '<span class="wip-popup-badge wip-popup-excluded">HORS ITINÉRAIRE</span>' : ''
    ].filter(Boolean).join(' ');

    return `
      <div class="text-xs space-y-1 min-w-[220px]">
        <div class="font-bold">${esc(item?.[COL.nom] || 'Entreprise')}</div>
        <div>${esc(item?.[COL.ville] || '')} (${esc(item?._deptNorm || '')})</div>
        <div>${esc(item?.[COL.adresse] || '')}</div>
        <div class="flex flex-wrap gap-1 py-1">${badges}</div>
        <div class="font-bold text-amber-600">${esc(formatMoney(getTableFinancialAmount(item)))} <span class="text-[10px] text-gray-400">CA 2025</span></div>
        <div class="flex items-center gap-1 mt-2">
          <button onclick="openDetails(${item._rowIndex})" class="bg-slate-900 text-white text-[10px] px-2 py-1 rounded font-bold">Détails</button>
          ${excluded ? `<button onclick="excludeRoutePoint(${item._rowIndex})" class="wip-route-add">Rajouter</button>` : ''}
        </div>
      </div>`;
  }

  function installMarkerRendering() {
    window.renderKnownMarkers = function renderKnownMarkersWip(data) {
      if (!map || !markersLayer) return { markers: 0, bounds: [] };
      markersLayer.clearLayers();
      const bounds = [];
      let markers = 0;

      (data || []).forEach((item) => {
        try {
          if (!hasCoordinates(item)) return;
          const marker = L.marker([item._lat, item._lon], { icon: iconFor(item) }).bindPopup(popupFor(item));
          markersLayer.addLayer(marker);
          bounds.push([item._lat, item._lon]);
          markers += 1;
        } catch (error) {
          console.warn('Marqueur WIP impossible.', error);
        }
      });

      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
      return { markers, bounds };
    };
  }

  function preserveExcludedOnInternalRouteClear() {
    if (typeof clearRoute !== 'function' || clearRoute.__wipPreserveExcluded) return;
    const oldClearRoute = clearRoute;

    clearRoute = function clearRouteWip(showStatus = true) {
      const set = excludedSet();
      const snapshot = new Set(set);
      const result = oldClearRoute.apply(this, arguments);

      if (showStatus === false) {
        set.clear();
        snapshot.forEach((value) => set.add(value));
      }
      return result;
    };
    clearRoute.__wipPreserveExcluded = true;
  }

  function scheduleRouteRecalculation() {
    clearTimeout(routeRecalcTimer);
    routeRecalcTimer = setTimeout(() => {
      if (typeof calculateRouteFromVisiblePoints === 'function') {
        calculateRouteFromVisiblePoints(true);
      }
    }, 240);
  }

  function installMultipleRouteRemoval() {
    window.excludeRoutePoint = function excludeRoutePointWip(rowIndex) {
      const set = excludedSet();
      if (set.has(rowIndex)) set.delete(rowIndex);
      else set.add(rowIndex);

      try {
        if (Array.isArray(manualRouteOrder) && set.has(rowIndex)) {
          manualRouteOrder = manualRouteOrder.filter((index) => index !== rowIndex);
        }
      } catch (error) {}

      try {
        if (typeof renderKnownMarkers === 'function') renderKnownMarkers(currentFilteredData || []);
      } catch (error) {}

      scheduleRouteRecalculation();
    };
  }

  function openAccordion(id) {
    const panel = document.getElementById(id);
    const icon = document.getElementById(`icon-${id}`);
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.classList.add('block');
    if (icon) icon.classList.add('rotate-180');
  }

  function focusNoveltyFilters() {
    try { if (typeof closeReleaseNotes === 'function') closeReleaseNotes(); } catch (error) {}
    try { if (typeof toggleMobileFilters === 'function' && window.innerWidth < 768) toggleMobileFilters(true); } catch (error) {}

    openAccordion('acc-flotte');
    const button = document.getElementById('f-new-machine-toggle');
    if (!button) return;

    const box = button.closest('.grid.grid-cols-1.gap-2') || button.parentElement || button;
    document.querySelectorAll('.wip-novelty-focus').forEach((element) => element.classList.remove('wip-novelty-focus'));
    box.classList.add('wip-novelty-focus');
    button.classList.add('wip-novelty-button-focus');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      box.classList.remove('wip-novelty-focus');
      button.classList.remove('wip-novelty-button-focus');
    }, 7000);
  }

  function installNoveltyButton() {
    const noveltyButton = document.getElementById('v18-info-button');
    if (noveltyButton) {
      noveltyButton.onclick = focusNoveltyFilters;
      noveltyButton.title = 'Afficher les nouveautés dans les filtres';
    }

    const machineButton = document.getElementById('f-new-machine-toggle');
    if (machineButton && !machineButton.dataset.wipNoveltyWrapped) {
      machineButton.dataset.wipNoveltyWrapped = '1';
      machineButton.addEventListener('click', () => {
        const box = machineButton.closest('.grid.grid-cols-1.gap-2') || machineButton.parentElement;
        if (!box) return;
        box.classList.add('wip-novelty-focus');
        setTimeout(() => box.classList.remove('wip-novelty-focus'), 3500);
      });
    }
  }

  function terrainRows(depts) {
    return (globalData || []).filter((item) => depts.includes(item?._deptNorm));
  }

  function terrainStats(depts) {
    const grouped = new Map(depts.map((dept) => [dept, {
      dept, total: 0, clients: 0, prospects: 0, visits: 0, objective: 0
    }]));

    terrainRows(depts).forEach((item) => {
      const stats = grouped.get(item._deptNorm);
      if (!stats) return;
      stats.total += 1;
      const position = norm(item?.[COL.position] || '');
      if (position === 'cl' || position.includes('client')) stats.clients += 1;
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
      return `
        <div class="wip-terrain-dept-card">
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

  function addTerrainCompanyMarker(layer, item) {
    if (!hasCoordinates(item)) return false;
    const marker = L.marker([item._lat, item._lon], { icon: iconFor(item) }).bindPopup(popupFor(item));
    layer.addLayer(marker);
    return true;
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
    const rows = terrainRows(depts);
    if (title) title.textContent = `Mon terrain — ${document.getElementById('active-user-name')?.textContent || 'PSSR'}`;
    statsBox.innerHTML = `${terrainStatsHtml(stats)}<div id="wip-terrain-points-status" class="wip-terrain-status">Chargement des entreprises sur la carte…</div>`;

    try {
      if (window.__terrainMapV18) window.__terrainMapV18.remove();
      if (window.__terrainLeafletMap && window.__terrainLeafletMap !== window.__terrainMapV18) window.__terrainLeafletMap.remove();
    } catch (error) {}

    mapDiv.innerHTML = '';
    const terrainMap = L.map('v18-terrain-map', { zoomControl: true }).setView([46.6, 2.2], 6);
    window.__terrainMapV18 = terrainMap;
    window.__terrainLeafletMap = terrainMap;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(terrainMap);

    const companyLayer = L.layerGroup().addTo(terrainMap);
    let visibleCompanies = 0;
    rows.forEach((item) => { if (addTerrainCompanyMarker(companyLayer, item)) visibleCompanies += 1; });

    try {
      const response = await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson', { cache: 'force-cache' });
      const geojson = await response.json();
      if (runId !== terrainRunId) return;

      const deptLayer = L.geoJSON(geojson, {
        filter: (feature) => depts.includes(String(feature.properties?.code || feature.properties?.CODE_DEPT || '').padStart(2, '0')),
        style: () => ({ color: '#eab308', weight: 2, fillColor: '#facc15', fillOpacity: 0.12 }),
        onEachFeature: (feature, layer) => {
          const code = String(feature.properties?.code || feature.properties?.CODE_DEPT || '').padStart(2, '0');
          const item = stats.find((entry) => entry.dept === code);
          layer.bindTooltip(`<b>Dépt ${esc(code)}</b><br>${item?.clients || 0} clients • ${item?.prospects || 0} prospects`, { sticky: true });
        }
      }).addTo(terrainMap);

      if (deptLayer.getBounds?.().isValid()) terrainMap.fitBounds(deptLayer.getBounds(), { padding: [25, 25] });
    } catch (error) {
      console.warn('Contours des départements indisponibles.', error);
    }

    const status = document.getElementById('wip-terrain-points-status');
    if (status) status.textContent = `${visibleCompanies}/${rows.length} entreprise(s) positionnée(s). Géocodage progressif des adresses restantes.`;

    const missing = rows.filter((item) => !hasCoordinates(item) && buildAddressQuery(item));
    for (let index = 0; index < missing.length; index += 1) {
      if (runId !== terrainRunId || !document.getElementById('v18-terrain-modal')?.classList.contains('open')) break;
      try {
        const result = await geocodeItem(missing[index]);
        if (result && addTerrainCompanyMarker(companyLayer, missing[index])) visibleCompanies += 1;
      } catch (error) {}

      if (status && (index % 5 === 0 || index === missing.length - 1)) {
        status.textContent = `${visibleCompanies}/${rows.length} entreprise(s) positionnée(s) sur le terrain PSSR.`;
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  function installTerrainOverride() {
    window.renderMonTerrainMap = renderMonTerrainWip;
    window.openMonTerrain = function openMonTerrainWip() {
      const modal = document.getElementById('v18-terrain-modal');
      if (!modal) return;
      modal.classList.add('open');
      setTimeout(renderMonTerrainWip, 80);
    };

    const oldClose = window.closeMonTerrain;
    window.closeMonTerrain = function closeMonTerrainWip() {
      terrainRunId += 1;
      if (typeof oldClose === 'function') return oldClose.apply(this, arguments);
      document.getElementById('v18-terrain-modal')?.classList.remove('open');
    };
  }

  function injectStyles() {
    if (document.getElementById('wip-feature-patch-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-feature-patch-style';
    style.textContent = `
      .wip-marker { width:24px; height:24px; border-radius:999px; box-sizing:border-box; box-shadow:0 7px 18px rgba(15,23,42,.28); }
      .wip-marker-standard { background:#eab308; border:3px solid #fff; }
      .wip-marker-gold { background:radial-gradient(circle at 35% 30%,#fff7ae 0 18%,#ffd700 42%,#b7791f 100%); border:3px solid #fff7ae; box-shadow:0 0 0 3px rgba(255,215,0,.35),0 8px 20px rgba(180,120,0,.45); }
      .wip-marker-new { background:#ef4444; border:4px solid #fff; box-shadow:0 0 0 4px rgba(220,38,38,.85),0 8px 22px rgba(220,38,38,.36); }
      .wip-marker-excluded { background:#dc2626; border:4px solid #fff; box-shadow:0 0 0 4px rgba(127,29,29,.9),0 8px 22px rgba(127,29,29,.45); }
      .wip-marker-ring-new { width:32px; height:32px; border-radius:999px; border:4px solid #dc2626; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 3px rgba(220,38,38,.22); }
      .wip-marker-ring-new .wip-marker { width:20px; height:20px; }
      .wip-popup-badge { display:inline-flex; border-radius:999px; padding:2px 6px; font-size:9px; font-weight:900; }
      .wip-popup-gold { color:#78350f; background:#fef3c7; border:1px solid #f59e0b; }
      .wip-popup-new,.wip-popup-excluded { color:#991b1b; background:#fef2f2; border:1px solid #ef4444; }
      .wip-route-add { border-radius:6px; padding:3px 6px; font-size:10px; font-weight:900; color:#166534; background:#f0fdf4; border:1px solid #86efac; }
      .wip-novelty-focus { outline:4px solid #dc2626 !important; outline-offset:3px; border-color:#ef4444 !important; box-shadow:0 0 0 8px rgba(220,38,38,.12),0 12px 34px rgba(220,38,38,.25) !important; animation:wipNoveltyPulse 1.1s ease-in-out infinite; }
      .wip-novelty-button-focus { background:#fef2f2 !important; border-color:#dc2626 !important; color:#b91c1c !important; }
      @keyframes wipNoveltyPulse { 0%,100% { box-shadow:0 0 0 6px rgba(220,38,38,.10),0 12px 34px rgba(220,38,38,.18); } 50% { box-shadow:0 0 0 11px rgba(220,38,38,.18),0 12px 40px rgba(220,38,38,.32); } }
      .wip-terrain-dept-card { border:1px solid #e5e7eb; border-radius:14px; padding:12px; background:#fff; }
      .dark .wip-terrain-dept-card { background:#020617; border-color:#1e293b; }
      .wip-terrain-dept-title { display:flex; justify-content:space-between; gap:8px; font-weight:900; font-size:12px; }
      .wip-terrain-dept-grid { margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px; }
      .wip-terrain-status { margin-top:8px; border:1px dashed #f59e0b; background:#fffbeb; color:#92400e; border-radius:12px; padding:9px; font-size:10px; font-weight:800; }
      .dark .wip-terrain-status { background:rgba(120,53,15,.18); color:#fde68a; border-color:#b45309; }
    `;
    document.head.appendChild(style);
  }

  function install() {
    addChristopherDepartments();
    injectStyles();
    preserveExcludedOnInternalRouteClear();
    installMultipleRouteRemoval();
    installMarkerRendering();
    installNoveltyButton();
    installTerrainOverride();
    installed = true;

    try {
      if (typeof isMapVisible === 'function' && isMapVisible()) renderKnownMarkers(currentFilteredData || []);
    } catch (error) {}
  }

  addChristopherDepartments();
  document.addEventListener('DOMContentLoaded', () => {
    [4200, 5600, 7600].forEach((delay) => setTimeout(install, delay));
  });
  [5000, 7000].forEach((delay) => setTimeout(install, delay));
})();
