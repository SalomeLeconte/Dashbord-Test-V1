(() => {
  const PATCH_ID = 'wip-release-interactions-only-2026-07-10';
  window.__WIP_RELEASE_REFINE_PATCH__ = PATCH_ID;

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

  function sortChristopherDepartments() {
    try {
      if (!Array.isArray(pssrData)) return;
      const christopher = pssrData.find((pssr) =>
        norm(pssr?.prenom) === 'christopher' && norm(pssr?.nom).includes('borrhomee')
      );
      if (!christopher) return;
      christopher.depts = [...new Set([...(christopher.depts || []), '27', '76'])]
        .sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b), 'fr', { numeric: true }));
    } catch (error) {
      console.warn('Tri des départements de Christopher impossible.', error);
    }
  }

  function refreshPortfolioOrder() {
    sortChristopherDepartments();
    try {
      if (document.getElementById('collaborator-grid') && typeof renderCollaboratorGrid === 'function') {
        renderCollaboratorGrid();
      }
    } catch (error) {
      console.warn('Rafraîchissement de la liste PSSR impossible.', error);
    }
  }

  const INTERACTIVE_FEATURES = [
    {
      group: 'Portefeuille et filtres',
      items: [
        ['Changer de PSSR avec remise à zéro', 'Le changement de portefeuille remet les filtres et l’itinéraire à zéro avant d’afficher le nouveau PSSR.', 'portfolio'],
        ['Recherche par numéro client Irium', 'Recherche directe d’un client à partir de son numéro Irium.', 'client-number'],
        ['Filtre Cantons', 'Filtrage géographique sur les cantons du périmètre actif.', 'canton'],
        ['Filtre Rang TOP PSSR', 'Limitation des résultats aux meilleurs rangs du portefeuille.', 'top-rank'],
        ['Filtres parc machines', 'Filtres sur le volume de flotte, le modèle, le numéro de série et l’âge des machines.', 'fleet'],
        ['Filtre fin de garantie', 'Affichage des clients concernés par une fin de garantie renseignée.', 'warranty'],
        ['Filtre client éligible', 'Affichage des clients répondant aux règles d’éligibilité du dashboard.', 'eligible'],
        ['Filtres de chiffre d’affaires', 'Année, cumul, CA Global, PDR, Service, seuils et paliers rapides.', 'ca'],
        ['Secteur d’activité et NAF', 'Filtrage par catégorie d’activité et code NAF.', 'sector'],
        ['Objectifs et visites 2026', 'Filtrage sur les objectifs, visites réalisées et visites restantes.', 'visits'],
        ['Réinitialiser tous les filtres', 'Remise à zéro complète des filtres, toggles, critères TOP et états cartographiques.', 'reset']
      ]
    },
    {
      group: 'TOP et fiche entreprise',
      items: [
        ['TOP 200 enrichi', 'Accès aux contrôles de limite, filtres de visites et informations de préparation des tournées.', 'top200'],
        ['Détails entreprise enrichis', 'Ouverture de la fiche complète : identité, contacts, CA, parc, CRM, opportunités et secteur.', 'details']
      ]
    },
    {
      group: 'Cartographie et itinéraire',
      items: [
        ['Cartographie générale', 'Affichage cartographique des entreprises correspondant aux filtres actifs.', 'map'],
        ['Autoriser le GPS', 'Ajout de la position du navigateur pour préparer un départ, une arrivée ou un aller-retour.', 'gps'],
        ['Calculer un itinéraire optimisé', 'Ordonnancement automatique des points visibles pour préparer la tournée.', 'route'],
        ['Retirer puis rajouter des étapes', 'La poubelle retire plusieurs points de la tournée sans les supprimer de la carte ; le bouton + les réintègre et réoptimise.', 'route'],
        ['Ouvrir la tournée dans Google Maps', 'Transfert de l’itinéraire calculé vers Google Maps.', 'gmaps']
      ]
    },
    {
      group: 'Mon terrain',
      items: [
        ['Ouvrir Mon terrain', 'Affiche les départements du PSSR, la heat map de densité clients et les statistiques départementales.', 'terrain']
      ]
    }
  ];

  const BACKGROUND_IMPROVEMENTS = [
    'Chargement des données lourdes différé jusqu’à la sélection du portefeuille.',
    'Affichage du tableau par lots de 200 lignes pour réduire le blocage initial.',
    'Construction d’une seule vue DOM à la fois selon le format bureau ou mobile.',
    'Cache de géocodage et mémorisation temporaire des échecs pour limiter les requêtes répétées.',
    'Déduplication des informations répétées dans les fiches entreprise.',
    'Mise en cache et optimisation des rendus cartographiques successifs.',
    'Marqueurs TOP 10 en GOLD et signalement visuel des nouvelles machines.',
    'Points retirés d’un itinéraire conservés sur la carte en rouge.',
    'Recentrage automatique de la carte après recalcul de l’itinéraire.',
    'Départements 27 et 76 ajoutés au portefeuille de Christopher Borrhomée et affichés dans l’ordre numérique.'
  ];

  function releaseHtml() {
    const interactiveCount = INTERACTIVE_FEATURES.reduce((sum, section) => sum + section.items.length, 0);
    return `
      <div class="wip-release-intro">
        <div>
          <div class="wip-release-kicker">Nouveautés WIP interactives</div>
          <div class="wip-release-title">${interactiveCount} fonctionnalités à tester directement</div>
          <div class="wip-release-sub">Clique sur une fonctionnalité pour fermer cette fenêtre et entourer son emplacement en rouge pendant 15 secondes.</div>
        </div>
      </div>
      <div class="wip-release-sections">
        ${INTERACTIVE_FEATURES.map((section) => `
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
      </div>
      <section class="wip-background-improvements">
        <div class="wip-background-title">Améliorations en arrière-plan</div>
        <ul>${BACKGROUND_IMPROVEMENTS.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
      </section>`;
  }

  function installReleasePopupRefinement() {
    const modal = document.getElementById('v18-release-modal');
    if (!modal) return;

    const renderBody = () => {
      const body = modal.querySelector('.p-5.overflow-y-auto') || modal.querySelector('[class*="overflow-y-auto"]');
      if (!body) return;
      body.dataset.wipInteractiveRelease = PATCH_ID;
      body.innerHTML = releaseHtml();
    };

    renderBody();

    const open = function openInteractiveReleaseNotes() {
      renderBody();
      modal.classList.add('open');
    };

    window.openReleaseNotes = open;
    try { openReleaseNotes = open; } catch (error) {}

    const button = document.getElementById('v18-info-button');
    if (button) {
      button.onclick = open;
      button.title = 'Nouveautés WIP interactives';
    }
  }

  function injectStyles() {
    if (document.getElementById('wip-release-refine-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-release-refine-style';
    style.textContent = `
      .wip-background-improvements{margin-top:18px;padding:12px 14px;border-top:1px solid #e5e7eb;background:#f8fafc;border-radius:12px}.dark .wip-background-improvements{background:#020617;border-color:#334155}.wip-background-title{font-size:9px;font-weight:1000;letter-spacing:.11em;text-transform:uppercase;color:#94a3b8;margin-bottom:7px}.wip-background-improvements ul{margin:0;padding-left:17px;display:grid;gap:4px}.wip-background-improvements li{font-size:9px;line-height:1.35;color:#64748b}.dark .wip-background-improvements li{color:#94a3b8}
    `;
    document.head.appendChild(style);
  }

  function install() {
    refreshPortfolioOrder();
    injectStyles();
    installReleasePopupRefinement();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [300, 1400, 4200, 5800, 7400, 9000, 10600, 11600, 12600].forEach((delay) => setTimeout(install, delay));
  });
  [800, 2600, 5000, 6600, 8200, 9800, 11250, 12100, 13100].forEach((delay) => setTimeout(install, delay));
})();
