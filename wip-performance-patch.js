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

  // Rend les résultats par blocs et évite de construire simultanément les vues mobile et desktop.
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
