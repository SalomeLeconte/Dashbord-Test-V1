(() => {
  const MAX_VISIBLE_ROWS = 200;

  const originalLoadCSVData = window.loadCSVData;
  const originalSelectSector = window.selectSector;
  const originalBypassSelection = window.bypassSelection;
  const originalRenderGrid = window.renderGrid;

  let dataLoadStarted = false;

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

  // Le DOMContentLoaded du dashboard appelle loadCSVData().
  // On neutralise ce premier appel pour garder le sélecteur PSSR immédiatement interactif.
  window.loadCSVData = function deferredInitialLoad() {
    if (typeof window.setLoadingState === 'function') {
      window.setLoadingState('Sélectionnez un portefeuille pour charger les données.');
    }
  };

  // Le clic masque d'abord l'overlay avec des données encore vides, puis le CSV est chargé
  // après une frame de rendu afin que le clic soit traité immédiatement.
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

  // Limite le coût DOM initial et évite de construire simultanément les vues mobile et desktop.
  if (typeof originalRenderGrid === 'function') {
    window.renderGrid = function optimizedRenderGrid(data) {
      const safeData = Array.isArray(data) ? data : [];
      const visibleData = safeData.slice(0, MAX_VISIBLE_ROWS);
      const isMobile = window.matchMedia('(max-width: 767px)').matches;

      if (isMobile) {
        if (typeof window.renderMobileGridCards === 'function') {
          window.renderMobileGridCards(visibleData);
        }
        const tbody = document.getElementById('grid-tbody');
        if (tbody) tbody.innerHTML = '';
        return;
      }

      const originalMobileRenderer = window.renderMobileGridCards;
      window.renderMobileGridCards = () => {};

      try {
        return originalRenderGrid(visibleData);
      } finally {
        window.renderMobileGridCards = originalMobileRenderer;
      }
    };
  }
})();
