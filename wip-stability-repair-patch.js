(() => {
  const PATCH_ID = 'wip-stability-sector-map-feedback-2026-07-10';
  window.__WIP_STABILITY_REPAIR_PATCH__ = PATCH_ID;

  let activityCategoryToNafs = new Map();
  let activityNafToCategories = new Map();
  let activityExpandedCategories = new Set();
  let activitySyncing = false;
  let mapAlignTimer = null;

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

  function sortValues(values) {
    return [...values].sort((a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }));
  }

  function getSelectedValuesLocal(id) {
    const select = document.getElementById(id);
    if (!select) return [];
    return [...select.selectedOptions]
      .map((option) => String(option.value || '').trim())
      .filter(Boolean);
  }

  function setSelectedValuesLocal(id, values) {
    const select = document.getElementById(id);
    if (!select) return;
    const wanted = new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean));
    [...select.options].forEach((option) => {
      option.selected = wanted.has(option.value);
    });
  }

  function getActivityScopeData() {
    try {
      if (typeof getFilterScopeData === 'function') return getFilterScopeData();
    } catch (error) {}
    try {
      return (globalData || []).filter((item) => typeof itemBelongsToActivePssr !== 'function' || itemBelongsToActivePssr(item));
    } catch (error) {
      return [];
    }
  }

  function buildActivityMaps(data) {
    activityCategoryToNafs = new Map();
    activityNafToCategories = new Map();

    (data || []).forEach((item) => {
      const category = String(item?.[COL.categorie] || '').trim();
      const naf = String(item?.[COL.naf] || '').trim();
      if (!category || !naf) return;
      if (!activityCategoryToNafs.has(category)) activityCategoryToNafs.set(category, new Set());
      if (!activityNafToCategories.has(naf)) activityNafToCategories.set(naf, new Set());
      activityCategoryToNafs.get(category).add(naf);
      activityNafToCategories.get(naf).add(category);
    });
  }

  function ensureActivityUi() {
    const accordion = document.getElementById('acc-secteur-activite');
    if (!accordion) return false;

    if (!document.getElementById('f-activity-tree')) {
      accordion.innerHTML = `
        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="modern-label">Secteur d’activité</label>
            <div class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div class="p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 space-y-2">
                <div id="activity-filter-summary" class="text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-slate-300">Aucun secteur sélectionné</div>
                <div id="activity-filter-badges" class="hidden flex flex-wrap gap-1.5"></div>
                <div class="flex flex-wrap gap-2 pt-1">
                  <button type="button" onclick="toggleAllActivityTree(true)" class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:border-komatsu-500 transition">Tout déplier</button>
                  <button type="button" onclick="toggleAllActivityTree(false)" class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:border-komatsu-500 transition">Tout replier</button>
                  <button type="button" onclick="clearActivityFilter()" class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:border-red-400 hover:text-red-500 transition">Réinitialiser</button>
                </div>
              </div>
              <div id="f-activity-tree" class="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                <div class="p-3 text-[11px] text-gray-400 dark:text-slate-500">Chargement des secteurs...</div>
              </div>
            </div>
            <select id="f-categorie" multiple class="hidden" aria-hidden="true"><option value=""></option></select>
            <select id="f-naf" multiple class="hidden" aria-hidden="true"><option value=""></option></select>
            <p class="mt-1 text-[10px] text-gray-400 dark:text-slate-500">Cochez une catégorie pour sélectionner tous les codes NAF / APE associés, ou cochez uniquement certains codes.</p>
          </div>
        </div>`;
    }

    const container = document.getElementById('f-activity-tree');
    if (container && container.dataset.wipActivityEvents !== 'true') {
      container.dataset.wipActivityEvents = 'true';
      container.addEventListener('click', (event) => {
        const toggle = event.target.closest('[data-activity-toggle]');
        if (!toggle) return;
        const category = String(toggle.dataset.category || '');
        if (!category) return;
        if (activityExpandedCategories.has(category)) activityExpandedCategories.delete(category);
        else activityExpandedCategories.add(category);
        renderActivityTreeRepair();
      });

      container.addEventListener('change', (event) => {
        const categoryInput = event.target.closest('input[data-activity-category]');
        const nafInput = event.target.closest('input[data-activity-naf]');
        if (categoryInput) {
          setActivityCategorySelectionRepair(categoryInput.dataset.category || '', categoryInput.checked);
          return;
        }
        if (nafInput) setActivityNafSelectionRepair(nafInput.dataset.naf || '', nafInput.checked);
      });
    }

    return true;
  }

  function populateActivityHiddenSelects(keepCategories = [], keepNafs = []) {
    const categories = sortValues(activityCategoryToNafs.keys());
    const nafs = sortValues(activityNafToCategories.keys());
    const categorySelect = document.getElementById('f-categorie');
    const nafSelect = document.getElementById('f-naf');
    if (!categorySelect || !nafSelect) return;

    categorySelect.multiple = true;
    nafSelect.multiple = true;
    categorySelect.innerHTML = '<option value=""></option>' + categories.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
    nafSelect.innerHTML = '<option value=""></option>' + nafs.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('');

    setSelectedValuesLocal('f-categorie', keepCategories.filter((value) => activityCategoryToNafs.has(value)));
    setSelectedValuesLocal('f-naf', keepNafs.filter((value) => activityNafToCategories.has(value)));
  }

  function syncActivityCategoriesFromNafsRepair() {
    const selectedNafs = getSelectedValuesLocal('f-naf');
    const categories = new Set();
    selectedNafs.forEach((naf) => {
      (activityNafToCategories.get(naf) || new Set()).forEach((category) => categories.add(category));
    });
    setSelectedValuesLocal('f-categorie', sortValues(categories));
  }

  function updateActivitySummaryRepair() {
    const summary = document.getElementById('activity-filter-summary');
    const badges = document.getElementById('activity-filter-badges');
    if (!summary || !badges) return;

    const selectedNafs = getSelectedValuesLocal('f-naf');
    const selectedCategories = getSelectedValuesLocal('f-categorie');
    if (!selectedNafs.length && !selectedCategories.length) {
      summary.textContent = 'Aucun secteur sélectionné';
      badges.classList.add('hidden');
      badges.innerHTML = '';
      return;
    }

    summary.textContent = `${selectedCategories.length} catégorie${selectedCategories.length > 1 ? 's' : ''} · ${selectedNafs.length} code${selectedNafs.length > 1 ? 's' : ''} NAF / APE`;
    const values = [...selectedCategories.slice(0, 3), ...selectedNafs.slice(0, 8)];
    const hiddenCount = Math.max(0, selectedCategories.length + selectedNafs.length - values.length);
    badges.innerHTML = values.map((value) => `<span class="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider max-w-full truncate">${esc(value)}</span>`).join('') +
      (hiddenCount ? `<span class="inline-flex items-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">+${hiddenCount}</span>` : '');
    badges.classList.remove('hidden');
  }

  function hashStringLocal(value) {
    let hash = 0;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function renderActivityTreeRepair() {
    const container = document.getElementById('f-activity-tree');
    if (!container) return;
    const categories = sortValues(activityCategoryToNafs.keys());
    const selectedNafs = new Set(getSelectedValuesLocal('f-naf'));

    if (!categories.length) {
      container.innerHTML = '<div class="p-3 text-[11px] text-gray-400 dark:text-slate-500">Aucun secteur disponible.</div>';
      updateActivitySummaryRepair();
      return;
    }

    container.innerHTML = categories.map((category) => {
      const nafs = sortValues(activityCategoryToNafs.get(category) || []);
      const selectedCount = nafs.filter((naf) => selectedNafs.has(naf)).length;
      const expanded = activityExpandedCategories.has(category) || selectedCount > 0;
      const allSelected = nafs.length > 0 && selectedCount === nafs.length;
      const countText = selectedCount > 0 && selectedCount < nafs.length ? ` · ${selectedCount}/${nafs.length}` : ` · ${nafs.length}`;
      const categoryId = `activity-cat-wip-${hashStringLocal(category)}`;

      return `<div class="activity-category bg-white dark:bg-slate-900">
        <div class="flex items-center gap-2 p-2.5 hover:bg-gray-50 dark:hover:bg-slate-950 transition">
          <button type="button" data-activity-toggle data-category="${esc(category)}" class="shrink-0 w-7 h-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-400 dark:text-slate-500 hover:text-komatsu-600 dark:hover:text-komatsu-400 transition flex items-center justify-center" aria-label="Déplier ${esc(category)}">
            <svg class="w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
          <label for="${categoryId}" class="flex-1 min-w-0 flex items-center gap-2 cursor-pointer select-none">
            <input id="${categoryId}" type="checkbox" data-activity-category data-category="${esc(category)}" ${allSelected ? 'checked' : ''} class="accent-yellow-500 shrink-0">
            <span class="flex-1 min-w-0 text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-slate-200 truncate" title="${esc(category)}">${esc(category)}</span>
            <span class="shrink-0 text-[10px] font-bold text-gray-400 dark:text-slate-500">${esc(countText)}</span>
          </label>
        </div>
        <div class="${expanded ? 'block' : 'hidden'} px-3 pb-3 pl-11 space-y-1.5">
          ${nafs.map((naf) => `<label class="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-2.5 py-1.5 cursor-pointer hover:border-komatsu-500 transition select-none">
            <input type="checkbox" data-activity-naf data-naf="${esc(naf)}" ${selectedNafs.has(naf) ? 'checked' : ''} class="accent-yellow-500 shrink-0">
            <span class="text-[11px] font-bold text-gray-600 dark:text-slate-300 truncate" title="${esc(naf)}">${esc(naf)}</span>
          </label>`).join('')}
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('input[data-activity-category]').forEach((input) => {
      const category = input.dataset.category || '';
      const nafs = sortValues(activityCategoryToNafs.get(category) || []);
      const selectedCount = nafs.filter((naf) => selectedNafs.has(naf)).length;
      input.indeterminate = selectedCount > 0 && selectedCount < nafs.length;
    });
    updateActivitySummaryRepair();
  }

  function setActivityCategorySelectionRepair(category, checked) {
    if (!category || activitySyncing) return;
    activitySyncing = true;
    try {
      const selectedNafs = new Set(getSelectedValuesLocal('f-naf'));
      (activityCategoryToNafs.get(category) || new Set()).forEach((naf) => {
        if (checked) selectedNafs.add(naf);
        else selectedNafs.delete(naf);
      });
      if (checked) activityExpandedCategories.add(category);
      setSelectedValuesLocal('f-naf', sortValues(selectedNafs));
      syncActivityCategoriesFromNafsRepair();
    } finally {
      activitySyncing = false;
    }
    renderActivityTreeRepair();
    try { window.runFilter(); } catch (error) { try { runFilter(); } catch (ignored) {} }
  }

  function setActivityNafSelectionRepair(naf, checked) {
    if (!naf || activitySyncing) return;
    activitySyncing = true;
    try {
      const selectedNafs = new Set(getSelectedValuesLocal('f-naf'));
      if (checked) selectedNafs.add(naf);
      else selectedNafs.delete(naf);
      setSelectedValuesLocal('f-naf', sortValues(selectedNafs));
      (activityNafToCategories.get(naf) || new Set()).forEach((category) => activityExpandedCategories.add(category));
      syncActivityCategoriesFromNafsRepair();
    } finally {
      activitySyncing = false;
    }
    renderActivityTreeRepair();
    try { window.runFilter(); } catch (error) { try { runFilter(); } catch (ignored) {} }
  }

  function clearActivityFilterRepair() {
    setSelectedValuesLocal('f-categorie', []);
    setSelectedValuesLocal('f-naf', []);
    renderActivityTreeRepair();
    try { window.runFilter(); } catch (error) { try { runFilter(); } catch (ignored) {} }
  }

  function toggleAllActivityTreeRepair(expand) {
    activityExpandedCategories = expand ? new Set(activityCategoryToNafs.keys()) : new Set();
    renderActivityTreeRepair();
  }

  window.clearActivityFilter = clearActivityFilterRepair;
  window.toggleAllActivityTree = toggleAllActivityTreeRepair;

  function rebuildActivityFilter(keepCategories = getSelectedValuesLocal('f-categorie'), keepNafs = getSelectedValuesLocal('f-naf')) {
    if (!ensureActivityUi()) return;
    buildActivityMaps(getActivityScopeData());
    populateActivityHiddenSelects(keepCategories, keepNafs);
    syncActivityCategoriesFromNafsRepair();
    renderActivityTreeRepair();
  }

  function assignGlobalFunction(name, fn) {
    window[name] = fn;
    try {
      if (name === 'runFilter') runFilter = fn;
      else if (name === 'populateFilterOptions') populateFilterOptions = fn;
      else if (name === 'selectSector') selectSector = fn;
      else if (name === 'drawRoute') drawRoute = fn;
      else if (name === 'calculateRouteFromVisiblePoints') calculateRouteFromVisiblePoints = fn;
      else if (name === 'excludeRoutePoint') excludeRoutePoint = fn;
      else if (name === 'generateManualRoute') generateManualRoute = fn;
      else if (name === 'removeManualRouteItem') removeManualRouteItem = fn;
      else if (name === 'moveManualRouteItem') moveManualRouteItem = fn;
      else if (name === 'renderRouteSteps') renderRouteSteps = fn;
      else if (name === 'drawOsrmRoute') drawOsrmRoute = fn;
      else if (name === 'drawFallbackRoute') drawFallbackRoute = fn;
    } catch (error) {}
  }

  function installPopulateRepair() {
    const current = window.populateFilterOptions;
    if (typeof current !== 'function' || current.__wipActivityPopulateRepair) return;
    const wrapped = function populateFilterOptionsActivityRepair() {
      const keepCategories = getSelectedValuesLocal('f-categorie');
      const keepNafs = getSelectedValuesLocal('f-naf');
      const result = current.apply(this, arguments);
      rebuildActivityFilter(keepCategories, keepNafs);
      return result;
    };
    wrapped.__wipActivityPopulateRepair = true;
    assignGlobalFunction('populateFilterOptions', wrapped);
  }

  function activityMatches(item, selectedCategories, selectedNafs) {
    if (selectedNafs.length) return selectedNafs.includes(norm(item?.[COL.naf] || ''));
    if (selectedCategories.length) return selectedCategories.includes(norm(item?.[COL.categorie] || ''));
    return true;
  }

  function installRunFilterRepair() {
    const current = window.runFilter;
    if (typeof current !== 'function' || current.__wipActivityRunRepair) return;
    const wrapped = function runFilterActivityRepair() {
      const rawCategories = getSelectedValuesLocal('f-categorie');
      const rawNafs = getSelectedValuesLocal('f-naf');
      const selectedCategories = rawCategories.map(norm);
      const selectedNafs = rawNafs.map(norm);

      setSelectedValuesLocal('f-categorie', []);
      setSelectedValuesLocal('f-naf', []);
      let result;
      try {
        result = current.apply(this, arguments);
      } finally {
        setSelectedValuesLocal('f-categorie', rawCategories);
        setSelectedValuesLocal('f-naf', rawNafs);
      }

      if (selectedCategories.length || selectedNafs.length) {
        try {
          currentFilteredData = (currentFilteredData || []).filter((item) => activityMatches(item, selectedCategories, selectedNafs));
          if (typeof renderGrid === 'function') renderGrid(currentFilteredData);
          if (typeof renderTop200 === 'function') renderTop200();
          if (typeof updateActiveCounter === 'function') updateActiveCounter();
          if (typeof isMapVisible === 'function' && isMapVisible() && typeof renderMap === 'function') renderMap(currentFilteredData);
        } catch (error) {
          console.warn('Filtre secteur d’activité WIP impossible.', error);
        }
      }
      updateActivitySummaryRepair();
      return result;
    };
    wrapped.__wipActivityRunRepair = true;
    assignGlobalFunction('runFilter', wrapped);
  }

  function installSelectSectorRepair() {
    const current = window.selectSector;
    if (typeof current !== 'function' || current.__wipActivitySelectRepair) return;
    const wrapped = function selectSectorActivityRepair() {
      const result = current.apply(this, arguments);
      setSelectedValuesLocal('f-categorie', []);
      setSelectedValuesLocal('f-naf', []);
      rebuildActivityFilter([], []);
      try { window.runFilter(); } catch (error) {}
      return result;
    };
    wrapped.__wipActivitySelectRepair = true;
    assignGlobalFunction('selectSector', wrapped);
  }

  function disableFeedbackBlink() {
    if (!document.getElementById('wip-stability-repair-style')) {
      const style = document.createElement('style');
      style.id = 'wip-stability-repair-style';
      style.textContent = `
        #wip-feedback-button{animation:none!important;filter:none!important}
        #wip-feedback-button:hover,#wip-feedback-button:focus,#wip-feedback-button:focus-visible{animation:none!important;filter:none!important}
      `;
      document.head.appendChild(style);
    }
    const button = document.getElementById('wip-feedback-button');
    if (button) {
      button.classList.remove('animate-pulse', 'v20-modern-bulb');
      button.style.animation = 'none';
    }
  }

  function routeBoundsForAlignment() {
    try {
      if (routeLine?.getBounds) {
        const bounds = routeLine.getBounds();
        if (bounds?.isValid?.()) return bounds;
      }
    } catch (error) {}

    let points = [];
    try {
      if (Array.isArray(window.__lastRoutePointsV18) && window.__lastRoutePointsV18.length) points = window.__lastRoutePointsV18;
      else if (Array.isArray(manualRouteOrder) && manualRouteOrder.length) {
        points = manualRouteOrder.map((rowIndex) => (globalData || []).find((row) => row._rowIndex === rowIndex)).filter(Boolean);
      } else points = currentFilteredData || [];
    } catch (error) {}

    try {
      const excluded = window.__routeExcludedV18 instanceof Set ? window.__routeExcludedV18 : new Set();
      const latLngs = points
        .filter((item) => item && !excluded.has(item._rowIndex) && Number.isFinite(item._lat) && Number.isFinite(item._lon))
        .map((item) => [item._lat, item._lon]);
      if (!latLngs.length || typeof L === 'undefined') return null;
      return L.latLngBounds(latLngs);
    } catch (error) {
      return null;
    }
  }

  function alignRouteMapFarLeft() {
    try {
      if (!map || typeof isMapVisible === 'function' && !isMapVisible()) return;
      const mapEl = document.getElementById('map');
      const routePanel = document.getElementById('route-steps');
      if (!mapEl) return;

      const mapWidth = mapEl.getBoundingClientRect().width || 0;
      if (!mapWidth) return;
      const panelVisible = routePanel && !routePanel.classList.contains('hidden') && routePanel.style.display !== 'none';
      const panelWidth = panelVisible ? (routePanel.getBoundingClientRect().width || 0) : 0;
      const reservedRight = Math.min(
        Math.max(panelWidth + 36, mapWidth * 0.34),
        mapWidth * 0.49
      );

      const bounds = routeBoundsForAlignment();
      if (bounds?.isValid?.()) {
        map.invalidateSize(false);
        map.fitBounds(bounds, {
          paddingTopLeft: [28, 36],
          paddingBottomRight: [reservedRight, 36],
          maxZoom: 11,
          animate: false
        });
      } else if (panelWidth > 0) {
        map.panBy([Math.min(panelWidth * 0.75, mapWidth * 0.42), 0], { animate: false });
      }
    } catch (error) {
      console.warn('Réalignement carte WIP impossible.', error);
    }
  }

  function scheduleMapAlignment() {
    clearTimeout(mapAlignTimer);
    [40, 140, 360, 760].forEach((delay, index, delays) => {
      setTimeout(() => {
        alignRouteMapFarLeft();
        if (index === delays.length - 1) mapAlignTimer = null;
      }, delay);
    });
  }

  function wrapMapMutationFunction(name) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipMapLeftRepair) return;
    const wrapped = function mapMutationAlignmentRepair() {
      let result;
      try {
        result = current.apply(this, arguments);
      } catch (error) {
        scheduleMapAlignment();
        throw error;
      }
      if (result && typeof result.then === 'function') {
        return result.finally(scheduleMapAlignment);
      }
      scheduleMapAlignment();
      return result;
    };
    wrapped.__wipMapLeftRepair = true;
    assignGlobalFunction(name, wrapped);
  }

  function observeRoutePanel() {
    const panel = document.getElementById('route-steps');
    if (!panel || panel.dataset.wipMapAlignObserver === 'true') return;
    panel.dataset.wipMapAlignObserver = 'true';
    const observer = new MutationObserver(() => scheduleMapAlignment());
    observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  function installMapAlignmentRepair() {
    [
      'drawRoute',
      'calculateRouteFromVisiblePoints',
      'excludeRoutePoint',
      'generateManualRoute',
      'removeManualRouteItem',
      'moveManualRouteItem',
      'renderRouteSteps',
      'drawOsrmRoute',
      'drawFallbackRoute'
    ].forEach(wrapMapMutationFunction);
    observeRoutePanel();
  }

  function install() {
    disableFeedbackBlink();
    ensureActivityUi();
    installPopulateRepair();
    installRunFilterRepair();
    installSelectSectorRepair();
    rebuildActivityFilter();
    installMapAlignmentRepair();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [150, 700, 1800, 3600, 6200, 9000, 12000, 14500].forEach((delay) => setTimeout(install, delay));
  });
  [400, 1200, 2600, 4800, 7600, 10500, 13200].forEach((delay) => setTimeout(install, delay));
})();