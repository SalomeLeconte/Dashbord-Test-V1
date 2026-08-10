(() => {
  const PATCH_ID = 'wip-release-2026-08-07-final-clean-v2';
  window.__WIP_RELEASE_REFINE_PATCH__ = PATCH_ID;

  const RELEASE_DATE = '07/08/2026';
  const RELEASE_TIME = '15:00';

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

  const RELEASE_FEATURES = [
    {
      group: 'Filtres et tableaux',
      items: [
        ['Filtres type Excel dans TOP 200', 'Ajout de menus rapides dans les en-têtes : client, localisation, CA, nombre de machines, visites 2026 et priorités.', 'top200'],
        ['Filtres type Excel dans Données', 'Ajout de menus rapides dans l’onglet Données : client, localisation, indicateur financier et flotte identifiée.', 'table'],
        ['Triangles ouvrables et refermables', 'Un clic ouvre le menu de colonne ; un deuxième clic sur le même triangle le referme.', 'table'],
        ['Filtre secteur d’activité stabilisé', 'Le filtre secteur / NAF fonctionne comme un arbre de sélection et ne se referme plus de manière imprévisible.', 'sector']
      ]
    },
    {
      group: 'TOP 200 et priorisation',
      items: [
        ['TOP 200 recalculé côté dashboard', 'Le TOP 200 peut être recalculé à partir du CA, des clients éligibles et des machines récentes.', 'top200'],
        ['Machines récentes restaurées', 'La détection des machines récentes utilise le flag NEW et le détail Machines récentes par client.', 'top200'],
        ['Objectifs de visite 2026', 'Lecture améliorée des objectifs, visites déjà faites et reste à faire dans l’onglet TOP 200.', 'visits']
      ]
    },
    {
      group: 'Undercarriage',
      items: [
        ['Filtre Train de roulement', 'Le filtre undercarriage est intégré dans la section 7. UNDERCARRIAGE.', 'undercarriage'],
        ['Classes AA à CC', 'Lecture des classes BULL, EXCA et MVM avec la bonne priorité : AA est le plus prioritaire, CC le plus faible.', 'undercarriage'],
        ['Critères machine détaillés', 'Filtrage par type, classe, priorité, SMR, activité moyenne, travel EXCA % et travel hours.', 'undercarriage'],
        ['Détail client enrichi', 'Ajout d’un tableau undercarriage par machine dans la fiche client.', 'details']
      ]
    },
    {
      group: 'Canton et géographie',
      items: [
        ['Filtre canton adaptatif', 'Liste des cantons adaptée selon le département sélectionné.', 'canton'],
        ['Réduction par ville', 'Quand une ville est saisie, la liste canton est réduite aux cantons cohérents autour de cette ville.', 'canton'],
        ['Cantons autour de moi', 'Option GPS avec rayon 10 / 25 / 50 km, utilisable uniquement en HTTPS.', 'canton'],
        ['Référentiel communes-cantons', 'Déduction automatique du canton depuis commune, département et coordonnées quand disponibles.', 'canton']
      ]
    },
    {
      group: 'Cartographie et itinéraire',
      items: [
        ['Mon terrain plus lisible', 'Remplacement de la heat map peu lisible par une lecture départementale plus claire.', 'terrain'],
        ['Recherche intelligente cartographique', 'Ajout d’un bouton + près de Google Maps pour rechercher un client du PSSR et l’ajouter en bleu sur la carte.', 'map'],
        ['Points bleus dans l’itinéraire', 'Les clients ajoutés via recherche intelligente sont pris en compte dans l’itinéraire optimisé.', 'route'],
        ['Suppression des points bleus', 'La poubelle et le bouton Effacer gèrent aussi les points ajoutés via la recherche intelligente.', 'route'],
        ['Statut itinéraire simplifié', 'Le message “Clique sur Tracer itinéraire” a été retiré des statuts redondants.', 'route']
      ]
    },
    {
      group: 'Nettoyage interface',
      items: [
        ['Responsive iPhone / iPad', 'Ajustements d’affichage sur mobile, iPad portrait et iPad paysage.', 'portfolio']
      ]
    }
  ];

  function releaseHtml() {
    const featureCount = RELEASE_FEATURES.reduce((sum, section) => sum + section.items.length, 0);
    return `
      <div class="wip-release-intro wip-release-20260807">
        <div>
          <div class="wip-release-kicker">Version ${esc(RELEASE_DATE)} — ${esc(RELEASE_TIME)}</div>
          <div class="wip-release-title">${featureCount} nouveautés WIP à tester</div>
        </div>
      </div>
      <div class="wip-release-sections">
        ${RELEASE_FEATURES.map((section) => `
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

  function installReleasePopupRefinement() {
    const modal = document.getElementById('v18-release-modal');
    if (!modal) return;
    const versionTitle = modal.querySelector('#v18-release-version-title') || modal.querySelector('h3');
    if (versionTitle) versionTitle.textContent = `Version du ${RELEASE_DATE}`;

    const renderBody = () => {
      const body = modal.querySelector('.p-5.overflow-y-auto') || modal.querySelector('[class*="overflow-y-auto"]');
      if (!body) return;
      body.dataset.wipInteractiveRelease = PATCH_ID;
      body.innerHTML = releaseHtml();
    };

    renderBody();

    const open = function openReleaseNotes20260807() {
      renderBody();
      modal.classList.add('open');
    };

    window.openReleaseNotes = open;
    try { openReleaseNotes = open; } catch (error) {}

    const button = document.getElementById('v18-info-button');
    if (button) {
      button.onclick = open;
      button.title = `Nouveautés WIP ${RELEASE_DATE}`;
    }
  }

  function injectStyles() {
    if (document.getElementById('wip-release-refine-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-release-refine-style';
    style.textContent = `
      .wip-release-20260807{border:1px solid rgba(234,179,8,.35);background:linear-gradient(135deg,rgba(250,204,21,.12),rgba(255,255,255,.96));border-radius:16px;padding:14px}.dark .wip-release-20260807{background:linear-gradient(135deg,rgba(250,204,21,.14),rgba(15,23,42,.96));border-color:rgba(234,179,8,.28)}
      .wip-release-kicker{font-size:10px;font-weight:1000;letter-spacing:.12em;text-transform:uppercase;color:#b45309}.dark .wip-release-kicker{color:#facc15}
      .wip-release-title{margin-top:4px;font-size:18px;font-weight:1000;color:#0f172a}.dark .wip-release-title{color:#f8fafc}
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
