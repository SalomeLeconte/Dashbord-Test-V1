(() => {
  const PATCH_ID = 'wip-release-target-precision-2026-08-07';
  if (window.__WIP_RELEASE_TARGET_PRECISION_PATCH__ === PATCH_ID) return;
  window.__WIP_RELEASE_TARGET_PRECISION_PATCH__ = PATCH_ID;

  const HIGHLIGHT_MS = 15000;

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const TITLE_TARGETS = new Map([
    ['filtres type excel dans top 200', 'top200-column-filters'],
    ['filtres type excel dans donnees', 'data-column-filters'],
    ['triangles ouvrables et refermables', 'column-filter-toggle'],
    ['filtre secteur dactivite stabilise', 'sector-filter'],
    ['top 200 recalcule cote dashboard', 'top200-controls'],
    ['machines recentes restaurees', 'new-machine-filter'],
    ['objectifs de visite 2026', 'top200-visit-controls'],
    ['filtre train de roulement', 'undercarriage-accordion'],
    ['classes aa a cc', 'undercarriage-class-select'],
    ['criteres machine detailles', 'undercarriage-criteria'],
    ['detail client enrichi', 'details-button'],
    ['filtre canton adaptatif', 'canton-select'],
    ['reduction par ville', 'city-filter'],
    ['cantons autour de moi', 'canton-gps'],
    ['referentiel communes-cantons', 'canton-select'],
    ['mon terrain plus lisible', 'terrain-button'],
    ['recherche intelligente cartographique', 'smart-map-add'],
    ['points bleus dans litineraire', 'route-build-button'],
    ['suppression des points bleus', 'route-clear-button'],
    ['statut itineraire simplifie', 'route-status'],
    ['responsive iphone / ipad', 'responsive-control']
  ]);

  function first(selectors) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (error) {}
    }
    return null;
  }

  function textIncludes(element, expected) {
    return norm(element?.textContent || '').includes(norm(expected));
  }

  function buttonByText(expected) {
    return [...document.querySelectorAll('button, a, summary, label')]
      .filter((node) => !node.closest('#v18-release-modal'))
      .find((node) => textIncludes(node, expected)) || null;
  }

  function inputNearLabel(expected) {
    const label = [...document.querySelectorAll('label')].find((node) => textIncludes(node, expected));
    if (!label) return null;
    return label.querySelector('input,select,textarea,button') || label;
  }

  function columnButton(table, key) {
    return first([
      `button[data-table="${table}"][data-key="${key}"]`,
      `[data-table="${table}"][data-key="${key}"]`
    ]);
  }

  function openFiltersForMobile() {
    try {
      if (window.innerWidth < 768 && typeof toggleMobileFilters === 'function') toggleMobileFilters(true);
    } catch (error) {}
  }

  function openPanel(id) {
    const node = document.getElementById(id);
    if (!node) return;
    if (node.tagName === 'DETAILS') node.open = true;
    node.classList.remove('hidden');
    node.classList.add('block');
    document.getElementById(`icon-${id}`)?.classList.add('rotate-180');
  }

  function openUndercarriage() {
    openFiltersForMobile();
    const integrated = document.getElementById('wip-undercarriage-integrated-accordion');
    if (integrated?.tagName === 'DETAILS') integrated.open = true;
    openPanel('acc-undercarriage');
  }

  function setTableTab() {
    try { if (typeof setTab === 'function') setTab('table'); } catch (error) {}
  }

  function setTop200Tab() {
    try { if (typeof setTab === 'function') setTab('top200'); } catch (error) {}
  }

  function setMapTab() {
    try { if (typeof setTab === 'function') setTab('map'); } catch (error) {}
  }

  function preciseHeaderGroup(button) {
    if (!button) return null;
    return button.closest('th') || button.closest('[role="columnheader"]') || button;
  }

  function resolveTarget(target) {
    switch (target) {
      case 'top200-column-filters':
        setTop200Tab();
        return preciseHeaderGroup(columnButton('top', 'client'))
          || preciseHeaderGroup(columnButton('top', 'ca'))
          || first(['#view-top200 thead', '#top200-table thead', '#view-top200']);

      case 'data-column-filters':
        setTableTab();
        return preciseHeaderGroup(columnButton('data', 'client'))
          || preciseHeaderGroup(columnButton('data', 'ca'))
          || first(['#view-table thead', '.desktop-data-table thead', '#view-table']);

      case 'column-filter-toggle':
        setTop200Tab();
        return columnButton('top', 'client') || columnButton('data', 'client') || first(['button[data-table][data-key]']);

      case 'sector-filter':
        openFiltersForMobile();
        openPanel('acc-secteur-activite');
        return first(['#f-categorie', '#f-naf', '#acc-secteur-activite select', '#acc-secteur-activite button']) || document.getElementById('acc-secteur-activite');

      case 'top200-controls':
        setTop200Tab();
        return first(['#top200-limit-select', '#top200-quick-filters', '#top200-filter-btn', '#tab-top200']);

      case 'new-machine-filter':
        openFiltersForMobile();
        openPanel('acc-flotte');
        return first(['#f-new-machine-toggle', '#f-machine-recentes', '#f-age-machine', '#acc-flotte input[type="checkbox"]'])
          || inputNearLabel('machines recentes') || document.getElementById('acc-flotte');

      case 'top200-visit-controls':
        setTop200Tab();
        return first(['#top200-visit-controls', '.top200-visit-btn', '#view-top200 [data-key="visits"]', '#view-top200']);

      case 'undercarriage-accordion':
        openUndercarriage();
        return document.getElementById('wip-undercarriage-integrated-accordion') || document.getElementById('acc-undercarriage');

      case 'undercarriage-class-select':
        openUndercarriage();
        return first(['#wip-undercarriage-filter [data-uc="class"]', '#wip-undercarriage-filter [data-uc="priority"]']);

      case 'undercarriage-criteria':
        openUndercarriage();
        return first(['#wip-undercarriage-filter [data-uc="smr"]', '#wip-undercarriage-filter [data-uc="activity"]', '#wip-undercarriage-filter [data-uc="travelPct"]', '#wip-undercarriage-filter']);

      case 'details-button':
        setTableTab();
        return first(['.wip-uc-badge', 'button[onclick^="openDetails("]', '#grid-tbody button', '#mobile-grid-cards button']);

      case 'canton-select':
        openFiltersForMobile();
        openPanel('acc-localisation');
        return first(['#f-canton-adaptive-select', '#wip-canton-adaptive-filter select', '#f-canton-select', '#f-canton']) || inputNearLabel('canton');

      case 'city-filter':
        openFiltersForMobile();
        openPanel('acc-localisation');
        return first(['#f-ville', '#filter-ville', 'input[placeholder*="ville" i]', 'input[placeholder*="commune" i]']) || inputNearLabel('ville');

      case 'canton-gps':
        openFiltersForMobile();
        openPanel('acc-localisation');
        return first(['#wip-canton-gps-btn', '#wip-canton-nearby-toggle', '#wip-canton-adaptive-filter button', '#wip-canton-adaptive-filter input[type="checkbox"]'])
          || buttonByText('autour de moi') || buttonByText('gps');

      case 'terrain-button':
        setMapTab();
        return first(['#v18-terrain-button', '#mon-terrain-btn']) || buttonByText('mon terrain');

      case 'smart-map-add':
        setMapTab();
        return first(['#wip-smart-client-add-btn', '#wip-map-smart-add-btn', '#map-toolbar button[title*="recherche" i]', '#map-toolbar button[aria-label*="recherche" i]'])
          || buttonByText('+') || buttonByText('gmaps');

      case 'route-build-button':
        setMapTab();
        return first(['#route-calculate-btn', '#calculate-route-btn', '#map-toolbar button[data-route="calculate"]'])
          || buttonByText('tracer itineraire') || buttonByText('itineraire optimise') || first(['#route-chooser', '#map-toolbar']);

      case 'route-clear-button':
        setMapTab();
        return first(['#route-clear-btn', '#clear-route-btn', '#map-toolbar button[data-route="clear"]'])
          || buttonByText('effacer') || first(['#route-steps', '#map-toolbar']);

      case 'route-status':
        setMapTab();
        return first(['#route-status', '#route-steps', '#route-chooser']);

      case 'responsive-control':
        return first(['.mobile-filter-button', '#filters-panel', 'header button', 'main']);

      default:
        if (typeof window.__oldFocusWipFeature === 'function') {
          window.__oldFocusWipFeature(target);
          return null;
        }
        return null;
    }
  }

  function closeReleaseModal() {
    try { if (typeof closeReleaseNotes === 'function') return closeReleaseNotes(); } catch (error) {}
    document.getElementById('v18-release-modal')?.classList.remove('open');
  }

  function highlight(element) {
    if (!element) return;
    document.querySelectorAll('.wip-precise-release-highlight,.wip-highlight-15s').forEach((node) => {
      node.classList.remove('wip-precise-release-highlight', 'wip-highlight-15s');
    });
    element.classList.add('wip-precise-release-highlight');
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    window.setTimeout(() => element.classList.remove('wip-precise-release-highlight'), HIGHLIGHT_MS);
  }

  function focusPrecise(target) {
    closeReleaseModal();
    window.setTimeout(() => highlight(resolveTarget(target)), 180);
  }

  function retargetReleaseButtons() {
    document.querySelectorAll('#v18-release-modal .wip-release-item').forEach((button) => {
      const title = button.querySelector('.wip-release-item-title')?.textContent || button.textContent || '';
      const key = TITLE_TARGETS.get(norm(title));
      if (!key) return;
      button.dataset.wipPreciseTarget = key;
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        focusPrecise(key);
      };
      const locate = button.querySelector('.wip-release-locate');
      if (locate) locate.textContent = 'Voir précisément';
    });
  }

  function wrapOpenReleaseNotes() {
    if (window.openReleaseNotes?.__wipPreciseTargets) return;
    const original = window.openReleaseNotes;
    if (typeof original !== 'function') return;
    const wrapped = function openReleaseNotesWithPreciseTargets(...args) {
      const result = original.apply(this, args);
      [0, 80, 240, 600].forEach((delay) => window.setTimeout(retargetReleaseButtons, delay));
      return result;
    };
    wrapped.__wipPreciseTargets = true;
    window.openReleaseNotes = wrapped;
    try { openReleaseNotes = wrapped; } catch (error) {}
  }

  function installStyle() {
    if (document.getElementById('wip-release-target-precision-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-release-target-precision-style';
    style.textContent = `
      .wip-precise-release-highlight{position:relative!important;z-index:9999!important;outline:3px solid #ef4444!important;outline-offset:4px!important;box-shadow:0 0 0 8px rgba(239,68,68,.18),0 0 24px rgba(239,68,68,.45)!important;border-radius:10px!important;animation:wipPrecisePulse .9s ease-in-out infinite alternate!important}
      @keyframes wipPrecisePulse{from{outline-offset:3px}to{outline-offset:7px}}
      .wip-release-item[data-wip-precise-target] .wip-release-locate{color:#dc2626!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    if (!window.__oldFocusWipFeature && typeof window.focusWipFeature === 'function') {
      window.__oldFocusWipFeature = window.focusWipFeature;
    }
    window.focusWipFeaturePrecise = focusPrecise;
    wrapOpenReleaseNotes();
    retargetReleaseButtons();
    installStyle();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => [120, 400, 900, 1600, 3000, 6000].forEach((delay) => window.setTimeout(install, delay)));
  [150, 500, 1000, 2200, 4200, 7600, 11000].forEach((delay) => window.setTimeout(install, delay));

  try {
    const modal = document.getElementById('v18-release-modal');
    if (modal) new MutationObserver(() => window.setTimeout(retargetReleaseButtons, 0)).observe(modal, { childList: true, subtree: true });
  } catch (error) {}
})();