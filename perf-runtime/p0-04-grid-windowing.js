(() => {
  const PAGE_SIZE = 100;
  let sourceData = [];
  let visibleCount = PAGE_SIZE;
  let baseRenderGrid = null;

  function addLoadMoreControl() {
    document.getElementById('p0-grid-load-more')?.remove();
    if (visibleCount >= sourceData.length) return;

    const button = document.createElement('button');
    button.id = 'p0-grid-load-more';
    button.type = 'button';
    button.className = 'mx-auto my-3 block rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-black text-gray-700 dark:text-slate-200 hover:border-yellow-500 transition';
    button.textContent = `Afficher 100 suivants — ${Math.min(visibleCount, sourceData.length).toLocaleString('fr-FR')} / ${sourceData.length.toLocaleString('fr-FR')}`;
    button.addEventListener('click', () => {
      visibleCount = Math.min(sourceData.length, visibleCount + PAGE_SIZE);
      renderWindow();
    });

    const mobile = document.getElementById('mobile-grid-cards');
    const table = document.getElementById('grid-tbody')?.closest('table');
    const host = window.matchMedia('(max-width: 767px)').matches ? mobile : table?.parentElement;
    host?.appendChild(button);
  }

  function renderWindow() {
    if (!baseRenderGrid) return;
    baseRenderGrid(sourceData.slice(0, visibleCount));
    addLoadMoreControl();
  }

  function install() {
    if (window.__p0GridWindowingInstalled) return;
    if (typeof window.renderGrid !== 'function') {
      window.setTimeout(install, 50);
      return;
    }

    window.__p0GridWindowingInstalled = true;
    baseRenderGrid = window.renderGrid;
    window.renderGrid = function p0WindowedRenderGrid(data) {
      sourceData = Array.isArray(data) ? data : [];
      visibleCount = Math.min(PAGE_SIZE, sourceData.length || PAGE_SIZE);
      renderWindow();
    };

    if (Array.isArray(window.currentFilteredData)) window.renderGrid(window.currentFilteredData);
  }

  install();
})();
