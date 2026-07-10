(() => {
  const PATCH_ID = 'wip-pssr-reset-release-highlights-2026-07-10';
  window.__WIP_FOLLOWUP_PATCH__ = PATCH_ID;
  const HIGHLIGHT_MS = 15000;
  let installedSelectSectorWrapper = null;

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
      const blank = [...control.options].find((option) => option.value === '');
      control.value = blank ? '' : (control.options[0]?.value || '');
      return;
    }
    control.value = '';
  }

  function resetFiltersBeforePssrChange() {
    document.querySelectorAll('#filters-panel input,#filters-panel select,#filters-panel textarea').forEach(resetControl);
    document.querySelectorAll('#filters-panel button[data-active]').forEach((button) => {
      button.dataset.active = 'false';
    });

    try { setNewMachineFilterActive(false); } catch (error) {}
    try { setOldMachineFilterActive(false); } catch (error) {}
    try { setWarrantyFilterActive(false); } catch (error) {}
    try { clearPriorityCheckboxes(); } catch (error) {}

    try { top200UseActiveFilters = false; } catch (error) {}
    try { top200Limit = 200; } catch (error) {}
    try { top200VisitFilter = ''; } catch (error) {}

    const topLimit = document.getElementById('top200-limit-select');
    if (topLimit) topLimit.value = '200';
    document.querySelectorAll('.top200-visit-btn').forEach((button) => button.classList.remove('active'));

    const routeSet = window.__routeExcludedV18;
    if (routeSet instanceof Set) routeSet.clear();
    try { clearRoute(false); } catch (error) {}
    try { invalidateTop200Ranks(); } catch (error) {}
  }

  function installPssrReset() {
    const current = window.selectSector;
    if (typeof current !== 'function' || current === installedSelectSectorWrapper || current.__wipPssrReset) return;

    const wrapped = function selectSectorWithMandatoryReset(...args) {
      resetFiltersBeforePssrChange();
      return current.apply(this, args);
    };
    wrapped.__wipPssrReset = true;
    installedSelectSectorWrapper = wrapped;
    window.selectSector = wrapped;
    try { selectSector = wrapped; } catch (error) {}
  }

  const FEATURES = [
    {
      group: 'Performance et navigation',
      items: [
        ['Chargement après sélection du portefeuille', 'Le sélecteur PSSR reste immédiatement cliquable : les données lourdes sont chargées après le choix.', 'portfolio'],
        ['Affichage progressif du tableau', 'Les résultats sont rendus par blocs de 200 lignes avec « Afficher plus » pour réduire le temps de blocage.', 'table'],
        ['Affichage responsive optimisé', 'Une seule vue, mobile ou bureau, est construite à la fois pour limiter le nombre de nœuds DOM.', 'table']
      ]
    },
    {
      group: 'Portefeuilles et filtres',
      items: [
        ['Réinitialisation obligatoire au changement de PSSR', 'Tous les filtres, options TOP et exclusions d’itinéraire sont remis à zéro avant de charger le nouveau portefeuille.', 'portfolio'],
        ['Départements PSSR enrichis', 'Le portefeuille de Christopher Borrhomée inclut aussi les départements 27 et 76.', 'portfolio'],
        ['Recherche par numéro client Irium', 'Un filtre dédié permet de rechercher directement le numéro client.', 'client-number'],
        ['Filtre Cantons', 'La liste des cantons est liée au périmètre départemental du PSSR.', 'canton'],
        ['Filtre Rang TOP PSSR', 'Le tableau peut être limité aux meilleurs rangs du portefeuille.', 'top-rank'],
        ['Filtres parc machines enrichis', 'Volume de flotte, modèle, numéro de série, âge machine, machines récentes et machines de 5 ans ou plus.', 'fleet'],
        ['Filtre fin de garantie', 'Identification des machines dont la fin de garantie est renseignée.', 'warranty'],
        ['Filtre client éligible', 'Filtrage des clients selon les règles d’éligibilité intégrées au dashboard.', 'eligible'],
        ['Filtres CA enrichis', 'Choix de l’année, cumul, seuils CA Global/PDR/Service et paliers rapides.', 'ca'],
        ['Secteur d’activité et NAF', 'Filtres Catégorie et NAF restaurés et alimentés sur le périmètre actif.', 'sector'],
        ['Filtres objectifs et visites 2026', 'Filtrage par objectifs, visites réalisées et visites restantes.', 'visits'],
        ['Zone Undercarriage en préparation', 'Une zone dédiée présente les options en cours de développement sans les faire passer pour fonctionnelles.', 'undercarriage'],
        ['Réinitialisation globale', 'Le bouton Réinitialiser remet à zéro tous les champs, toggles, filtres TOP et états cartographiques.', 'reset']
      ]
    },
    {
      group: 'Tableaux, TOP et détails',
      items: [
        ['Numéro client Irium visible', 'Le numéro client est affiché dans les vues bureau et mobile.', 'table'],
        ['Badges de priorisation', 'TOP PSSR, nouvelle machine, machine 5 ans+, fin de garantie, visites restantes et client éligible.', 'table'],
        ['TOP 200 enrichi', 'Contrôles de limite, filtres de visites et informations complémentaires pour la préparation des tournées.', 'top200'],
        ['Vue mobile par cartes', 'Les tableaux disposent d’une présentation mobile dédiée et plus lisible.', 'table'],
        ['Détails entreprise enrichis', 'Identité, localisation, contacts, notes de visite, CA, parc, CRM, opportunités, secteur et graphiques de synthèse.', 'details'],
        ['Déduplication des informations', 'Les champs de contact et de CRM en double sont nettoyés dans la fiche détaillée.', 'details']
      ]
    },
    {
      group: 'Cartographie et itinéraires',
      items: [
        ['Géocodage automatique avec cache', 'Les adresses sans coordonnées peuvent être géocodées progressivement et les échecs sont mémorisés pour éviter les requêtes répétées.', 'map'],
        ['GPS navigateur', 'La position utilisateur peut être ajoutée à la carte et utilisée en départ, arrivée ou aller-retour.', 'gps'],
        ['Itinéraire optimisé', 'Les points visibles peuvent être ordonnés automatiquement pour préparer une tournée.', 'route'],
        ['Suppression multiple de points', 'La poubelle retire un ou plusieurs points de l’itinéraire sans les supprimer de la carte.', 'route'],
        ['Points retirés conservés en rouge', 'Un point exclu reste visible en rouge sur la cartographie générale.', 'map'],
        ['Réajout avec bouton +', 'Le bouton + à côté de Détails réintègre le point et relance automatiquement l’optimisation.', 'map'],
        ['TOP 10 en GOLD', 'Les entreprises classées dans le TOP 10 du PSSR sont identifiées par un marqueur GOLD.', 'map'],
        ['Nouvelles machines sur la carte', 'Les nouveautés reprennent le badge « Nouvelle machine » du tableau et une mise en évidence dédiée.', 'map'],
        ['Export vers Google Maps', 'L’itinéraire calculé peut être ouvert dans Google Maps.', 'gmaps'],
        ['Recentrage après recalcul', 'La carte est décalée après le calcul pour que les points restent accessibles malgré le panneau d’itinéraire.', 'route']
      ]
    },
    {
      group: 'Mon terrain',
      items: [
        ['Vue Mon terrain par PSSR', 'La vue est limitée aux départements associés au portefeuille sélectionné.', 'terrain'],
        ['Heat map de densité clients', 'Les marqueurs individuels sont remplacés par une carte de chaleur : plus la densité de clients est forte, plus la zone devient rouge.', 'terrain'],
        ['Statistiques par département', 'Clients, prospects, visites réalisées, reste à faire et avancement sont affichés par département.', 'terrain']
      ]
    }
  ];

  function releaseHtml() {
    const count = FEATURES.reduce((sum, section) => sum + section.items.length, 0);
    return `
      <div class="wip-release-intro">
        <div>
          <div class="wip-release-kicker">Comparatif WIP / MAIN</div>
          <div class="wip-release-title">${count} évolutions et améliorations disponibles dans WIP</div>
          <div class="wip-release-sub">Clique sur une fonctionnalité pour fermer cette fenêtre et entourer son emplacement en rouge pendant 15 secondes.</div>
        </div>
      </div>
      <div class="wip-release-sections">
        ${FEATURES.map((section) => `
          <section class="wip-release-section">
            <h4>${esc(section.group)}</h4>
            <div class="wip-release-grid">
              ${section.items.map(([title, description, target]) => `
                <button type="button" class="wip-release-item" onclick="focusWipFeature('${esc(target)}')">
                  <span class="wip-release-item-title">${esc(title)}</span>
                  <span class="wip-release-item-desc">${esc(description)}</span>
                  <span class="wip-release-locate">Voir l’emplacement</span>
                </button>
              `).join('')}
            </div>
          </section>
        `).join('')}
      </div>`;
  }

  function closeReleaseModal() {
    try { if (typeof closeReleaseNotes === 'function') closeReleaseNotes(); }
    catch (error) {
      document.getElementById('v18-release-modal')?.classList.remove('open');
    }
  }

  function openAccordion(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.classList.add('block');
    document.getElementById(`icon-${id}`)?.classList.add('rotate-180');
  }

  function findButtonByText(text) {
    const wanted = norm(text);
    return [...document.querySelectorAll('button')].find((button) => norm(button.textContent).includes(wanted)) || null;
  }

  function highlightElement(element) {
    if (!element) return;
    document.querySelectorAll('.wip-highlight-15s').forEach((node) => node.classList.remove('wip-highlight-15s'));
    element.classList.add('wip-highlight-15s');
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    window.setTimeout(() => element.classList.remove('wip-highlight-15s'), HIGHLIGHT_MS);
  }

  function openFiltersForMobile() {
    try { if (window.innerWidth < 768 && typeof toggleMobileFilters === 'function') toggleMobileFilters(true); }
    catch (error) {}
  }

  function resolveFeatureTarget(target) {
    switch (target) {
      case 'portfolio':
        try { reopenNominativeSelection(); } catch (error) {}
        return document.getElementById('collaborator-grid');
      case 'table':
        try { setTab('table'); } catch (error) {}
        return document.getElementById('view-table') || document.getElementById('grid-tbody');
      case 'top200':
        try { setTab('top200'); } catch (error) {}
        return document.getElementById('view-top200') || document.getElementById('tab-top200');
      case 'details':
        try { setTab('table'); } catch (error) {}
        return document.querySelector('#grid-tbody button[onclick^="openDetails"],#mobile-grid-cards button[onclick^="openDetails"]') || document.getElementById('view-table');
      case 'map':
        try { setTab('map'); } catch (error) {}
        return document.getElementById('map');
      case 'route':
        try { setTab('map'); } catch (error) {}
        return document.getElementById('route-status') || document.getElementById('route-steps') || document.getElementById('map-toolbar');
      case 'gps':
        try { setTab('map'); } catch (error) {}
        return findButtonByText('Autoriser GPS') || document.getElementById('map-toolbar');
      case 'gmaps':
        try { setTab('map'); } catch (error) {}
        return document.getElementById('v26c-gmaps-btn') || document.getElementById('v24-gmaps-btn') || findButtonByText('GMaps') || document.getElementById('map-toolbar');
      case 'terrain':
        try { openMonTerrain(); } catch (error) {}
        return document.getElementById('v18-terrain-map') || document.getElementById('v18-terrain-button');
      case 'client-number':
        openFiltersForMobile(); openAccordion('acc-brutes');
        return document.getElementById('f-client-numero') || document.getElementById('f-siret');
      case 'canton':
        openFiltersForMobile(); openAccordion('acc-localisation');
        return document.getElementById('f-canton-select') || document.getElementById('f-ville');
      case 'top-rank':
        openFiltersForMobile(); openAccordion('acc-priorite-client');
        return document.getElementById('f-top-rank') || document.getElementById('top200-quick-filters');
      case 'fleet':
        openFiltersForMobile(); openAccordion('acc-flotte');
        return document.getElementById('acc-flotte') || document.getElementById('f-nb-machines');
      case 'warranty':
        openFiltersForMobile(); openAccordion('acc-flotte');
        return document.getElementById('f-warranty-end-toggle') || document.getElementById('acc-flotte');
      case 'eligible':
        openFiltersForMobile(); openAccordion('acc-priorite-client');
        return document.getElementById('f-client-eligible-only') || document.getElementById('acc-priorite-client');
      case 'ca':
        openFiltersForMobile(); openAccordion('acc-potentiel');
        return document.getElementById('f-ca-annee') || document.getElementById('acc-potentiel');
      case 'sector':
        openFiltersForMobile(); openAccordion('acc-secteur-activite');
        return document.getElementById('f-categorie') || document.getElementById('f-naf');
      case 'visits':
        openFiltersForMobile(); openAccordion('acc-visites');
        return document.getElementById('f-objectif-visites') || document.getElementById('f-visites-2026');
      case 'undercarriage':
        openFiltersForMobile(); openAccordion('acc-undercarriage');
        return document.getElementById('acc-undercarriage') || document.getElementById('f-undercarriage-type');
      case 'reset':
        openFiltersForMobile();
        return findButtonByText('Réinitialiser') || document.getElementById('filters-panel');
      default:
        return null;
    }
  }

  window.focusWipFeature = function focusWipFeature(target) {
    closeReleaseModal();
    setTimeout(() => {
      const element = resolveFeatureTarget(target);
      setTimeout(() => highlightElement(element || resolveFeatureTarget(target)), target === 'terrain' ? 180 : 40);
    }, 80);
  };

  function installReleasePopup() {
    const modal = document.getElementById('v18-release-modal');
    if (!modal) return;
    const body = modal.querySelector('.p-5.overflow-y-auto') || modal.querySelector('[class*="overflow-y-auto"]');
    if (body && body.dataset.wipExhaustive !== PATCH_ID) {
      body.dataset.wipExhaustive = PATCH_ID;
      body.innerHTML = releaseHtml();
    }

    const open = function openExhaustiveReleaseNotes() {
      const targetBody = modal.querySelector('.p-5.overflow-y-auto') || modal.querySelector('[class*="overflow-y-auto"]');
      if (targetBody) {
        targetBody.dataset.wipExhaustive = PATCH_ID;
        targetBody.innerHTML = releaseHtml();
      }
      modal.classList.add('open');
    };
    window.openReleaseNotes = open;
    try { openReleaseNotes = open; } catch (error) {}

    const button = document.getElementById('v18-info-button');
    if (button) {
      button.onclick = open;
      button.title = 'Toutes les nouveautés WIP par rapport à MAIN';
    }
  }

  function injectStyles() {
    if (document.getElementById('wip-followup-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-followup-style';
    style.textContent = `
      .wip-highlight-15s{outline:4px solid #dc2626!important;outline-offset:5px!important;box-shadow:0 0 0 9px rgba(220,38,38,.18),0 16px 42px rgba(220,38,38,.28)!important;animation:wipHighlightPulse 1s ease-in-out infinite!important;position:relative!important;z-index:10035!important}
      @keyframes wipHighlightPulse{0%,100%{box-shadow:0 0 0 6px rgba(220,38,38,.12),0 16px 42px rgba(220,38,38,.20)}50%{box-shadow:0 0 0 14px rgba(220,38,38,.27),0 18px 48px rgba(220,38,38,.34)}}
      .wip-release-intro{border:1px solid #fde68a;background:linear-gradient(135deg,#fffbeb,#fff7ed);border-radius:16px;padding:14px 16px;margin-bottom:14px}.dark .wip-release-intro{background:linear-gradient(135deg,rgba(120,53,15,.24),rgba(124,45,18,.16));border-color:#854d0e}.wip-release-kicker{font-size:9px;font-weight:1000;letter-spacing:.13em;text-transform:uppercase;color:#b45309}.wip-release-title{margin-top:4px;font-size:16px;font-weight:1000;color:#111827}.dark .wip-release-title{color:#f8fafc}.wip-release-sub{margin-top:5px;font-size:11px;line-height:1.45;color:#64748b}.dark .wip-release-sub{color:#94a3b8}
      .wip-release-sections{display:flex;flex-direction:column;gap:15px}.wip-release-section h4{font-size:10px;font-weight:1000;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin:0 0 7px}.dark .wip-release-section h4{color:#94a3b8}.wip-release-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}.wip-release-item{display:flex;flex-direction:column;align-items:flex-start;text-align:left;min-height:112px;border:1px solid #e5e7eb;background:#fff;border-radius:13px;padding:11px 12px;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}.wip-release-item:hover{transform:translateY(-1px);border-color:#ef4444;box-shadow:0 10px 24px rgba(15,23,42,.08)}.dark .wip-release-item{background:#0f172a;border-color:#334155}.wip-release-item-title{font-size:11px;font-weight:1000;color:#0f172a}.dark .wip-release-item-title{color:#f8fafc}.wip-release-item-desc{margin-top:5px;font-size:10px;line-height:1.4;color:#64748b;flex:1}.dark .wip-release-item-desc{color:#94a3b8}.wip-release-locate{margin-top:8px;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;color:#dc2626}
    `;
    document.head.appendChild(style);
  }

  function install() {
    injectStyles();
    installPssrReset();
    installReleasePopup();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [200, 1200, 4000, 5600, 7200, 8800, 10400].forEach((delay) => setTimeout(install, delay));
  });
  [600, 2400, 4800, 6400, 8000, 9600, 11200].forEach((delay) => setTimeout(install, delay));
})();
