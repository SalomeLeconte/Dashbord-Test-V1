(() => {
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  function clear(id) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = '';
  }

  function install() {
    if (window.__p0ResponsiveRenderInstalled) return;
    if (typeof window.renderGrid !== 'function' || typeof window.renderMobileGridCards !== 'function' || typeof window.renderTop200 !== 'function' || typeof window.renderMobileTop200Cards !== 'function') {
      window.setTimeout(install, 50);
      return;
    }

    window.__p0ResponsiveRenderInstalled = true;

    const baseMobileGrid = window.renderMobileGridCards;
    window.renderMobileGridCards = function p0ResponsiveMobileGrid(data) {
      if (!isMobile()) {
        clear('mobile-grid-cards');
        return;
      }
      return baseMobileGrid.apply(this, arguments);
    };

    const baseGrid = window.renderGrid;
    window.renderGrid = function p0ResponsiveGrid(data) {
      if (!isMobile()) {
        clear('mobile-grid-cards');
        return baseGrid.apply(this, arguments);
      }

      const tbody = document.getElementById('grid-tbody');
      if (!tbody) return baseGrid.apply(this, arguments);
      const originalId = tbody.id;
      tbody.id = 'grid-tbody-p0-disabled';
      try {
        return baseGrid.apply(this, arguments);
      } finally {
        tbody.id = originalId;
        tbody.innerHTML = '';
      }
    };

    const baseMobileTop200 = window.renderMobileTop200Cards;
    window.renderMobileTop200Cards = function p0ResponsiveMobileTop200(data) {
      if (!isMobile()) {
        clear('mobile-top200-cards');
        return;
      }
      return baseMobileTop200.apply(this, arguments);
    };

    const baseTop200 = window.renderTop200;
    window.renderTop200 = function p0ResponsiveTop200() {
      if (!isMobile()) {
        clear('mobile-top200-cards');
        return baseTop200.apply(this, arguments);
      }

      const tbody = document.getElementById('top200-tbody');
      if (tbody) tbody.innerHTML = '';
      if (typeof window.getTop200Data !== 'function') return baseTop200.apply(this, arguments);

      const topData = window.getTop200Data();
      const visitsDone = topData.reduce((sum, item) => sum + window.getVisits2026(item), 0);
      const visitsObjective = topData.reduce((sum, item) => sum + window.getObjectiveVisits(item), 0);
      const visitsRemaining = topData.reduce((sum, item) => sum + window.getRemainingVisits(item), 0);
      const recentMachinesCount = topData.reduce((sum, item) => sum + window.getRecentMachineCount(item), 0);
      const oldMachinesCount = topData.reduce((sum, item) => sum + window.getOldMachineCount(item), 0);
      const donePercent = visitsObjective > 0 ? Math.min(100, Math.round((visitsDone / visitsObjective) * 100)) : 0;

      window.setText('top-visits-done', window.formatNumber(visitsObjective));
      window.setText('top-visits-remaining', window.formatNumber(visitsRemaining));
      window.setText('top-visits-percent', `${donePercent}%`);
      window.setText('recentmachines-count', window.formatNumber(recentMachinesCount));
      window.setText('oldmachines-count', window.formatNumber(oldMachinesCount));
      window.renderMobileTop200Cards(topData);
    };
  }

  install();
})();
