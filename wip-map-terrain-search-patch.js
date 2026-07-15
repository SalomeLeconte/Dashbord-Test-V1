(() => {
  const PATCH_ID = 'wip-map-terrain-search-2026-07-15';
  window.__WIP_MAP_TERRAIN_SEARCH_PATCH__ = PATCH_ID;

  let smartLayer = null;
  let smartMarkers = new Map();
  let installTimer = null;

  function norm(value) {
    try { return normalizeText(value || ''); }
    catch (error) {
      return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }
  }

  function esc(value) {
    try { return escapeHtml(value); }
    catch (error) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[char]));
    }
  }

  function num(value) {
    try { return parseNumber(value); }
    catch (error) {
      const n = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
  }

  function fmt(value) {
    try { return formatNumber(value); }
    catch (error) { return new Intl.NumberFormat('fr-FR').format(num(value)); }
  }

  function money(value) {
    try { return formatMoney(value); }
    catch (error) {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num(value));
    }
  }

  function rowBelongsToActivePssr(row) {
    try {
      if (typeof itemBelongsToActivePssr === 'function') return itemBelongsToActivePssr(row);
    } catch (error) {}
    try {
      if (Array.isArray(selectedSectorDepts) && selectedSectorDepts.length) return selectedSectorDepts.includes(row?._deptNorm);
    } catch (error) {}
    return true;
  }

  function getActiveDepts() {
    try {
      if (Array.isArray(selectedSectorDepts) && selectedSectorDepts.length) {
        return [...new Set(selectedSectorDepts.map((dept) => String(dept || '').padStart(2, '0')).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
      }
    } catch (error) {}
    try {
      if (typeof selectedDepts === 'function') return selectedDepts();
    } catch (error) {}
    return [...new Set((globalData || []).filter(rowBelongsToActivePssr).map((row) => row._deptNorm).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  }

  function isClientRow(row) {
    const value = norm(row?.[COL?.position] || row?.['Client_Irium.Position Client'] || row?.['Position Client'] || '');
    return value === 'cl' || value.includes('client');
  }

  function clientNumber(row) {
    const keys = [
      COL?.clientNumero,
      'Client_Irium.Client (Numéro)',
      'Client_Irium.Client Numéro',
      'Client (Numéro)',
      'Numéro client',
      'Numero client',
      'N° client',
      'Num client',
      'Client Irium'
    ].filter(Boolean);
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
  }

  function getCa2025(row) {
    try { return getAmount(row, 'GLOBAL', '2025'); } catch (error) {}
    const keys = ['CA 2025', 'CA Global 2025', COL?.ca2025, COL?.caGlobal].filter(Boolean);
    for (const key of keys) {
      const value = num(row?.[key]);
      if (value) return value;
    }
    return 0;
  }

  function getVisits(row) {
    try { return getVisits2026(row); } catch (error) { return 0; }
  }

  function getObjective(row) {
    try { return getObjectiveVisits(row); } catch (error) { return 0; }
  }

  function getRemaining(row) {
    try { return getRemainingVisits(row); } catch (error) { return Math.max(0, getObjective(row) - getVisits(row)); }
  }

  function closeSectorAccordion() {
    const panel = document.getElementById('acc-secteur-activite');
    if (!panel) return;
    panel.classList.remove('block');
    panel.classList.add('hidden');
    panel.style.display = 'none';
    const icon = document.getElementById('icon-acc-secteur-activite');
    icon?.classList.remove('rotate-180');
    const button = panel.previousElementSibling;
    if (button?.tagName === 'BUTTON') button.setAttribute('aria-expanded', 'false');
  }

  function scheduleSectorClose() {
    [20, 180, 520, 940, 1600, 3200].forEach((delay) => setTimeout(closeSectorAccordion, delay));
  }

  function wrapSelectSectorToKeepSectorClosed() {
    const current = window.selectSector;
    if (typeof current !== 'function' || current.__wipSectorClosedByDefault) return;
    const wrapped = function selectSectorWithClosedActivityFilter() {
      const result = current.apply(this, arguments);
      scheduleSectorClose();
      return result;
    };
    wrapped.__wipSectorClosedByDefault = true;
    wrapped.__wipSectorDefaultOpen = true;
    window.selectSector = wrapped;
    try { selectSector = wrapped; } catch (error) {}
  }

  function terrainStats() {
    const depts = getActiveDepts();
    const grouped = new Map(depts.map((dept) => [dept, {
      dept,
      total: 0,
      clients: 0,
      prospects: 0,
      caClients: 0,
      caProspects: 0,
      visits: 0,
      objective: 0,
      remaining: 0,
      rows: []
    }]));

    (globalData || []).forEach((row) => {
      if (!rowBelongsToActivePssr(row)) return;
      const dept = row._deptNorm || String(row?.[COL?.dept] || '').padStart(2, '0');
      if (!dept || (depts.length && !depts.includes(dept))) return;
      if (!grouped.has(dept)) grouped.set(dept, {
        dept,
        total: 0,
        clients: 0,
        prospects: 0,
        caClients: 0,
        caProspects: 0,
        visits: 0,
        objective: 0,
        remaining: 0,
        rows: []
      });

      const bucket = grouped.get(dept);
      const ca = getCa2025(row);
      bucket.rows.push(row);
      bucket.total += 1;
      if (isClientRow(row)) {
        bucket.clients += 1;
        bucket.caClients += ca;
      } else {
        bucket.prospects += 1;
        bucket.caProspects += ca;
      }
      bucket.visits += getVisits(row);
      bucket.objective += getObjective(row);
      bucket.remaining += getRemaining(row);
    });

    grouped.forEach((bucket) => {
      bucket.remaining = Math.max(0, bucket.remaining || bucket.objective - bucket.visits);
      bucket.donePct = bucket.objective > 0 ? Math.min(100, Math.round((bucket.visits / bucket.objective) * 100)) : 0;
      bucket.priorityScore = bucket.total + bucket.prospects * 1.5 + bucket.remaining * 2;
    });

    return [...grouped.values()].sort((a, b) => a.dept.localeCompare(b.dept, 'fr', { numeric: true }));
  }

  function terrainFill(stats, stat) {
    if (!stat || !stat.total) return { fillColor: '#e5e7eb', fillOpacity: 0.12, color: '#94a3b8' };
    const max = Math.max(1, ...stats.map((item) => item.priorityScore || 0));
    const ratio = Math.min(1, (stat.priorityScore || 0) / max);
    if (ratio >= 0.72) return { fillColor: '#f97316', fillOpacity: 0.50, color: '#c2410c' };
    if (ratio >= 0.42) return { fillColor: '#facc15', fillOpacity: 0.42, color: '#ca8a04' };
    return { fillColor: '#22c55e', fillOpacity: 0.28, color: '#15803d' };
  }

  function terrainStatsHtml(stats) {
    const totals = stats.reduce((acc, item) => {
      acc.total += item.total;
      acc.clients += item.clients;
      acc.prospects += item.prospects;
      acc.remaining += item.remaining;
      acc.caClients += item.caClients;
      acc.caProspects += item.caProspects;
      return acc;
    }, { total: 0, clients: 0, prospects: 0, remaining: 0, caClients: 0, caProspects: 0 });

    return `
      <div class="wip-terrain-summary">
        <div class="wip-terrain-kpi"><span>Clients</span><b>${fmt(totals.clients)}</b></div>
        <div class="wip-terrain-kpi"><span>Prospects</span><b>${fmt(totals.prospects)}</b></div>
        <div class="wip-terrain-kpi"><span>Visites restantes</span><b>${fmt(totals.remaining)}</b></div>
        <div class="wip-terrain-kpi"><span>CA clients 2025</span><b>${money(totals.caClients)}</b></div>
      </div>
      <div class="wip-terrain-legend">
        <span><i class="high"></i> Département prioritaire</span>
        <span><i class="mid"></i> Activité moyenne</span>
        <span><i class="low"></i> Activité faible</span>
      </div>
      <div class="wip-terrain-list">
        ${stats.map((item) => `
          <button type="button" class="wip-terrain-dept-card" data-terrain-dept="${esc(item.dept)}">
            <span class="dept">Dépt ${esc(item.dept)}</span>
            <span>${fmt(item.clients)} clients · ${fmt(item.prospects)} prospects</span>
            <span>${fmt(item.remaining)} visite(s) restantes · ${money(item.caClients + item.caProspects)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  async function renderReadableTerrainMap() {
    const title = document.getElementById('v18-terrain-title');
    const statsBox = document.getElementById('v18-terrain-stats');
    const mapDiv = document.getElementById('v18-terrain-map');
    if (!statsBox || !mapDiv) return;

    const stats = terrainStats();
    const depts = stats.map((item) => item.dept);
    const statsByDept = new Map(stats.map((item) => [item.dept, item]));

    if (title) title.textContent = `Mon terrain — ${document.getElementById('active-user-name')?.textContent || 'PSSR'}`;
    statsBox.innerHTML = terrainStatsHtml(stats);

    if (typeof L === 'undefined') return;
    try {
      if (window.__terrainMapV18) { window.__terrainMapV18.remove(); window.__terrainMapV18 = null; }
      if (window.__terrainLeafletMap) { window.__terrainLeafletMap.remove(); window.__terrainLeafletMap = null; }
    } catch (error) {}

    mapDiv.innerHTML = '';
    const terrainMap = L.map('v18-terrain-map', { zoomControl: true }).setView([46.6, 2.2], 6);
    window.__terrainMapV18 = terrainMap;
    window.__terrainLeafletMap = terrainMap;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(terrainMap);

    try {
      const response = await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson', { cache: 'force-cache' });
      const geo = await response.json();
      const labelLayer = L.layerGroup().addTo(terrainMap);

      const layer = L.geoJSON(geo, {
        filter: (feature) => depts.includes(String(feature.properties?.code || feature.properties?.CODE_DEPT || '').padStart(2, '0')),
        style: (feature) => {
          const code = String(feature.properties?.code || feature.properties?.CODE_DEPT || '').padStart(2, '0');
          const fill = terrainFill(stats, statsByDept.get(code));
          return { color: fill.color, weight: 2, fillColor: fill.fillColor, fillOpacity: fill.fillOpacity };
        },
        onEachFeature: (feature, leafletLayer) => {
          const code = String(feature.properties?.code || feature.properties?.CODE_DEPT || '').padStart(2, '0');
          const stat = statsByDept.get(code) || { clients: 0, prospects: 0, remaining: 0, caClients: 0, caProspects: 0, donePct: 0, total: 0 };
          leafletLayer.bindTooltip(
            `<div class="wip-terrain-tooltip"><b>Dépt ${esc(code)}</b><br>${fmt(stat.clients)} clients · ${fmt(stat.prospects)} prospects<br>${fmt(stat.remaining)} visite(s) restantes<br>${money(stat.caClients + stat.caProspects)} CA 2025</div>`,
            { sticky: true }
          );
          leafletLayer.on('click', () => {
            terrainMap.fitBounds(leafletLayer.getBounds(), { padding: [28, 28], maxZoom: 9 });
          });

          try {
            const center = leafletLayer.getBounds().getCenter();
            const marker = L.marker(center, {
              icon: L.divIcon({
                className: '',
                html: `<div class="wip-terrain-label"><b>${esc(code)}</b><span>${fmt(stat.clients)} C · ${fmt(stat.prospects)} P</span></div>`,
                iconSize: [82, 38],
                iconAnchor: [41, 19]
              }),
              interactive: false
            });
            labelLayer.addLayer(marker);
          } catch (error) {}
        }
      }).addTo(terrainMap);

      if (layer.getBounds?.().isValid?.()) terrainMap.fitBounds(layer.getBounds(), { padding: [26, 26] });

      statsBox.querySelectorAll('[data-terrain-dept]').forEach((button) => {
        button.addEventListener('click', () => {
          const dept = button.dataset.terrainDept || '';
          layer.eachLayer((leafletLayer) => {
            const code = String(leafletLayer.feature?.properties?.code || leafletLayer.feature?.properties?.CODE_DEPT || '').padStart(2, '0');
            if (code === dept) terrainMap.fitBounds(leafletLayer.getBounds(), { padding: [28, 28], maxZoom: 9 });
          });
        });
      });
    } catch (error) {
      mapDiv.innerHTML = '<div class="p-6 text-sm text-gray-500">Carte départementale indisponible. Les indicateurs restent disponibles à droite.</div>';
    }
  }

  function installReadableTerrain() {
    window.renderMonTerrainMap = renderReadableTerrainMap;
    try { renderMonTerrainMap = renderReadableTerrainMap; } catch (error) {}
    window.openMonTerrain = function openReadableTerrain() {
      const modal = document.getElementById('v18-terrain-modal');
      if (!modal) return;
      modal.classList.add('open');
      setTimeout(renderReadableTerrainMap, 80);
    };
    try { openMonTerrain = window.openMonTerrain; } catch (error) {}
  }

  function ensureSmartLayer() {
    try {
      if (!map && typeof initMap === 'function') initMap();
    } catch (error) {}
    let mapInstance;
    try { mapInstance = map; } catch (error) { mapInstance = window.map; }
    if (!mapInstance || typeof L === 'undefined') return null;
    if (!smartLayer) smartLayer = L.layerGroup().addTo(mapInstance);
    return smartLayer;
  }

  function smartSearchRows() {
    return (globalData || [])
      .filter(rowBelongsToActivePssr)
      .filter(isClientRow)
      .sort((a, b) => getCa2025(b) - getCa2025(a));
  }

  function scoreRow(row, query) {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return 1;
    const fields = [
      row?.[COL?.nom],
      clientNumber(row),
      row?.[COL?.siret],
      row?.[COL?.ville],
      row?.[COL?.adresse],
      row?._deptNorm
    ].map(norm).join(' ');
    let score = 0;
    terms.forEach((term) => {
      if (fields.includes(term)) score += term.length > 3 ? 3 : 2;
    });
    if (norm(row?.[COL?.nom] || '').startsWith(terms[0])) score += 5;
    if (norm(clientNumber(row)).startsWith(terms[0])) score += 4;
    if (norm(row?.[COL?.siret] || '').startsWith(terms[0])) score += 4;
    return score;
  }

  function renderSmartResults(query = '') {
    const list = document.getElementById('wip-smart-client-results');
    const count = document.getElementById('wip-smart-client-count');
    if (!list) return;

    const rows = smartSearchRows()
      .map((row) => ({ row, score: scoreRow(row, query) }))
      .filter(({ score }) => !norm(query) || score > 0)
      .sort((a, b) => b.score - a.score || getCa2025(b.row) - getCa2025(a.row))
      .slice(0, 24)
      .map(({ row }) => row);

    if (count) count.textContent = `${fmt(rows.length)} résultat(s) affiché(s)`;
    if (!rows.length) {
      list.innerHTML = '<div class="wip-smart-empty">Aucun client trouvé dans le portefeuille PSSR actif.</div>';
      return;
    }

    list.innerHTML = rows.map((row) => {
      const coords = Number.isFinite(row._lat) && Number.isFinite(row._lon);
      return `
        <button type="button" class="wip-smart-result" onclick="addSmartClientToMap(${row._rowIndex})">
          <span class="name">${esc(row?.[COL?.nom] || 'Client')}</span>
          <span class="meta">${esc([clientNumber(row) ? `N° ${clientNumber(row)}` : '', row?.[COL?.ville], row?._deptNorm].filter(Boolean).join(' · '))}</span>
          <span class="sub">${esc(row?.[COL?.adresse] || 'Adresse non renseignée')}</span>
          <span class="tag">${coords ? 'coordonnées OK' : 'géocodage à l’ajout'}</span>
        </button>
      `;
    }).join('');
  }

  function ensureSmartModal() {
    if (document.getElementById('wip-smart-client-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="wip-smart-client-modal" class="wip-smart-modal" role="dialog" aria-modal="true" aria-label="Ajouter un client sur la carte">
        <div class="wip-smart-backdrop" onclick="closeSmartClientSearch()"></div>
        <div class="wip-smart-dialog">
          <div class="wip-smart-head">
            <div>
              <div class="wip-smart-kicker">Cartographie</div>
              <h3>Ajouter un client du PSSR sur la carte</h3>
              <p>Recherche par nom, numéro client, SIRET, ville ou département. Le client ajouté apparaît en bleu.</p>
            </div>
            <button type="button" class="wip-smart-close" onclick="closeSmartClientSearch()">Fermer</button>
          </div>
          <div class="wip-smart-search">
            <input id="wip-smart-client-input" type="search" placeholder="Ex : nom client, 12345, SIRET, ville..." autocomplete="off">
            <span id="wip-smart-client-count"></span>
          </div>
          <div id="wip-smart-client-results" class="wip-smart-results"></div>
        </div>
      </div>
    `);

    const input = document.getElementById('wip-smart-client-input');
    input?.addEventListener('input', () => renderSmartResults(input.value));
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSmartClientSearch();
    });
  }

  window.openSmartClientSearch = function openSmartClientSearch() {
    ensureSmartModal();
    try { if (typeof setTab === 'function') setTab('map'); } catch (error) {}
    const modal = document.getElementById('wip-smart-client-modal');
    const input = document.getElementById('wip-smart-client-input');
    modal?.classList.add('open');
    renderSmartResults(input?.value || '');
    setTimeout(() => input?.focus(), 80);
  };

  window.closeSmartClientSearch = function closeSmartClientSearch() {
    document.getElementById('wip-smart-client-modal')?.classList.remove('open');
  };

  function blueIcon() {
    return L.divIcon({
      className: '',
      html: '<div class="wip-smart-blue-marker"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14]
    });
  }

  window.addSmartClientToMap = async function addSmartClientToMap(rowIndex) {
    const row = (globalData || []).find((item) => item._rowIndex === rowIndex);
    if (!row) return;
    try { if (typeof setTab === 'function') setTab('map'); } catch (error) {}

    if (!Number.isFinite(row._lat) || !Number.isFinite(row._lon)) {
      try {
        if (typeof updateRouteStatus === 'function') updateRouteStatus('Géocodage du client sélectionné en cours...', true);
        if (typeof geocodeItem === 'function') await geocodeItem(row);
      } catch (error) {}
    }

    if (!Number.isFinite(row._lat) || !Number.isFinite(row._lon)) {
      if (typeof updateRouteStatus === 'function') updateRouteStatus('Impossible d’ajouter ce client : aucune coordonnée exploitable.', true);
      return;
    }

    const layer = ensureSmartLayer();
    let mapInstance;
    try { mapInstance = map; } catch (error) { mapInstance = window.map; }
    if (!layer || !mapInstance || typeof L === 'undefined') return;

    if (smartMarkers.has(rowIndex)) {
      try { layer.removeLayer(smartMarkers.get(rowIndex)); } catch (error) {}
      smartMarkers.delete(rowIndex);
    }

    const marker = L.marker([row._lat, row._lon], { icon: blueIcon(), zIndexOffset: 1300 }).bindPopup(`
      <div class="text-xs space-y-1 min-w-[210px]">
        <div class="font-bold">${esc(row?.[COL?.nom] || 'Client ajouté')}</div>
        <div>${esc(row?.[COL?.ville] || '')} (${esc(row?._deptNorm || '')})</div>
        <div>${esc(row?.[COL?.adresse] || '')}</div>
        <div class="font-bold text-blue-700">Ajout manuel depuis la recherche intelligente</div>
        <button onclick="openDetails(${row._rowIndex})" class="mt-1 bg-slate-900 text-white text-[10px] px-2 py-1 rounded font-bold">Détails</button>
      </div>
    `);

    layer.addLayer(marker);
    smartMarkers.set(rowIndex, marker);
    marker.openPopup();
    mapInstance.setView([row._lat, row._lon], Math.max(mapInstance.getZoom(), 12), { animate: true });
    if (typeof updateRouteStatus === 'function') updateRouteStatus('Client ajouté sur la carte en bleu.', true);
    closeSmartClientSearch();
  };

  function placeSmartButton() {
    const gmaps = document.getElementById('v26c-gmaps-btn') ||
      document.getElementById('v25-gmaps-btn') ||
      document.getElementById('v24-gmaps-btn') ||
      document.getElementById('v18-google-maps-btn') ||
      [...document.querySelectorAll('button')].find((button) => {
        const text = norm(button.textContent).replace(/\s+/g, ' ').trim();
        return text === 'gmaps' || text === 'maps' || text.includes('google maps');
      });

    if (!gmaps) return;
    let button = document.getElementById('wip-smart-map-add-btn');
    if (!button) {
      button = document.createElement('button');
      button.id = 'wip-smart-map-add-btn';
      button.type = 'button';
      button.className = 'wip-smart-map-add-btn';
      button.title = 'Ajouter un client du PSSR sur la carte';
      button.setAttribute('aria-label', 'Ajouter un client du PSSR sur la carte');
      button.textContent = '+';
      button.addEventListener('click', window.openSmartClientSearch);
    }
    if (gmaps.nextElementSibling !== button) gmaps.insertAdjacentElement('afterend', button);
  }

  function injectStyles() {
    if (document.getElementById('wip-map-terrain-search-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-map-terrain-search-style';
    style.textContent = `
      #acc-secteur-activite.hidden{display:none!important}
      .wip-terrain-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-bottom:.75rem}
      .wip-terrain-kpi{border:1px solid #e5e7eb;background:#fff;border-radius:14px;padding:.7rem}
      .dark .wip-terrain-kpi{background:#0f172a;border-color:#334155}
      .wip-terrain-kpi span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.07em;font-weight:1000;color:#94a3b8}
      .wip-terrain-kpi b{display:block;margin-top:.15rem;font-size:16px;color:#0f172a}
      .dark .wip-terrain-kpi b{color:#f8fafc}
      .wip-terrain-legend{display:flex;flex-wrap:wrap;gap:.45rem;margin:.55rem 0 .75rem;font-size:10px;font-weight:900;color:#64748b}
      .wip-terrain-legend span{display:inline-flex;align-items:center;gap:.3rem}
      .wip-terrain-legend i{width:11px;height:11px;border-radius:3px;display:inline-block}
      .wip-terrain-legend .high{background:#f97316}.wip-terrain-legend .mid{background:#facc15}.wip-terrain-legend .low{background:#22c55e}
      .wip-terrain-list{display:grid;gap:.5rem}
      .wip-terrain-dept-card{text-align:left;border:1px solid #e5e7eb;background:#fff;border-radius:14px;padding:.65rem;color:#475569;display:grid;gap:.15rem;font-size:11px}
      .wip-terrain-dept-card:hover{border-color:#eab308}
      .dark .wip-terrain-dept-card{background:#0f172a;border-color:#334155;color:#cbd5e1}
      .wip-terrain-dept-card .dept{font-size:12px;font-weight:1000;color:#0f172a}.dark .wip-terrain-dept-card .dept{color:#f8fafc}
      .wip-terrain-label{background:rgba(255,255,255,.94);border:1px solid rgba(15,23,42,.16);border-radius:10px;padding:4px 6px;text-align:center;box-shadow:0 7px 18px rgba(15,23,42,.12);font-size:10px;line-height:1.05;color:#0f172a}
      .wip-terrain-label b{display:block;font-size:12px}.wip-terrain-label span{font-weight:800;color:#475569}
      .dark .wip-terrain-label{background:rgba(15,23,42,.92);border-color:#334155;color:#f8fafc}.dark .wip-terrain-label span{color:#cbd5e1}
      .wip-terrain-tooltip{font-size:11px;font-weight:700}
      .wip-smart-map-add-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:11px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-size:20px;font-weight:1000;line-height:1;box-shadow:0 6px 14px rgba(37,99,235,.12);transition:.15s ease}
      .wip-smart-map-add-btn:hover{transform:translateY(-1px);border-color:#2563eb;background:#dbeafe}
      .dark .wip-smart-map-add-btn{background:rgba(37,99,235,.15);border-color:rgba(96,165,250,.34);color:#93c5fd}
      .wip-smart-blue-marker{width:28px;height:28px;border-radius:999px;background:#2563eb;border:4px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.34),0 8px 22px rgba(30,64,175,.38)}
      .wip-smart-modal{position:fixed;inset:0;z-index:13000;display:none;align-items:center;justify-content:center;padding:1rem}
      .wip-smart-modal.open{display:flex}
      .wip-smart-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.62);backdrop-filter:blur(4px)}
      .wip-smart-dialog{position:relative;width:min(720px,96vw);max-height:88vh;overflow:hidden;border-radius:20px;background:#fff;border:1px solid #e5e7eb;box-shadow:0 24px 70px rgba(2,6,23,.35);display:flex;flex-direction:column}
      .dark .wip-smart-dialog{background:#020617;border-color:#334155}
      .wip-smart-head{display:flex;justify-content:space-between;gap:1rem;padding:1rem 1.1rem;border-bottom:1px solid #e5e7eb}
      .dark .wip-smart-head{border-color:#1e293b}
      .wip-smart-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:1000;color:#2563eb}
      .wip-smart-head h3{margin:.15rem 0;font-size:1.05rem;font-weight:1000;color:#0f172a}
      .dark .wip-smart-head h3{color:#f8fafc}
      .wip-smart-head p{margin:0;font-size:12px;color:#64748b}.dark .wip-smart-head p{color:#94a3b8}
      .wip-smart-close{height:34px;border-radius:10px;padding:0 .75rem;background:#f1f5f9;color:#475569;font-size:11px;font-weight:1000;text-transform:uppercase}
      .dark .wip-smart-close{background:#0f172a;color:#cbd5e1}
      .wip-smart-search{padding:.85rem 1.1rem;border-bottom:1px solid #e5e7eb;display:grid;gap:.45rem}
      .dark .wip-smart-search{border-color:#1e293b}
      #wip-smart-client-input{width:100%;border:1px solid #cbd5e1;border-radius:14px;padding:.75rem .9rem;font-size:14px;outline:none}
      #wip-smart-client-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.18)}
      .dark #wip-smart-client-input{background:#0f172a;color:#e2e8f0;border-color:#334155}
      #wip-smart-client-count{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8}
      .wip-smart-results{padding:.8rem 1.1rem;overflow:auto;display:grid;gap:.55rem}
      .wip-smart-result{text-align:left;border:1px solid #e5e7eb;border-radius:14px;background:#fff;padding:.75rem;display:grid;gap:.12rem;color:#334155}
      .wip-smart-result:hover{border-color:#2563eb;background:#eff6ff}
      .dark .wip-smart-result{background:#0f172a;border-color:#334155;color:#cbd5e1}.dark .wip-smart-result:hover{border-color:#60a5fa;background:rgba(37,99,235,.12)}
      .wip-smart-result .name{font-size:13px;font-weight:1000;color:#0f172a}.dark .wip-smart-result .name{color:#f8fafc}
      .wip-smart-result .meta{font-size:11px;font-weight:900;color:#2563eb}
      .wip-smart-result .sub{font-size:11px;color:#64748b}.dark .wip-smart-result .sub{color:#94a3b8}
      .wip-smart-result .tag{justify-self:start;margin-top:.25rem;border-radius:999px;padding:.16rem .45rem;background:#dbeafe;color:#1d4ed8;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.05em}
      .wip-smart-empty{padding:1rem;text-align:center;color:#64748b;font-size:13px}
      @media(max-width:767px){.wip-smart-modal{padding:max(.45rem,env(safe-area-inset-top,0px)) max(.45rem,env(safe-area-inset-right,0px)) max(.45rem,env(safe-area-inset-bottom,0px)) max(.45rem,env(safe-area-inset-left,0px))}.wip-smart-dialog{width:100%;max-height:94dvh;border-radius:14px}.wip-smart-head{padding:.85rem}.wip-smart-search{padding:.75rem}.wip-smart-results{padding:.75rem}.wip-terrain-summary{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    injectStyles();
    wrapSelectSectorToKeepSectorClosed();
    scheduleSectorClose();
    installReadableTerrain();
    placeSmartButton();
    ensureSmartModal();

    clearTimeout(installTimer);
    installTimer = setTimeout(() => {
      placeSmartButton();
      scheduleSectorClose();
    }, 600);
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [200, 800, 1800, 3600, 6200, 9200, 12600, 16000, 18000].forEach((delay) => setTimeout(install, delay));
  });
  [500, 1400, 2800, 5200, 7600, 10800, 14400, 17000].forEach((delay) => setTimeout(install, delay));
})();