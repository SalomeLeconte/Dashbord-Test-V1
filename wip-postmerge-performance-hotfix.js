(() => {
  const PATCH_ID = 'wip-postmerge-performance-hotfix-2026-09-01-v2';
  if (window.__WIP_POSTMERGE_PERFORMANCE_HOTFIX__ === PATCH_ID) return;
  window.__WIP_POSTMERGE_PERFORMANCE_HOTFIX__ = PATCH_ID;

  function loadScript(id, src) {
    const existing = document.getElementById(id);
    if (existing?.dataset.loaded === 'true') return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = false;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(`Chargement impossible : ${src}`));
      }, { once: true });
      if (!existing) document.body.appendChild(script);
    });
  }

  async function install() {
    try {
      // IDs et versions renouvelés : les balises issues des anciens 404 ne sont
      // jamais réutilisées, même dans une session déjà ouverte avant le correctif.
      await loadScript('wip-hotfix-p0-grid-windowing-v2', './perf-runtime/p0-04-grid-windowing.js?v=20260901b');
      await loadScript('wip-hotfix-p0-responsive-render-v2', './perf-runtime/p0-05-responsive-render.js?v=20260901b');

      if (Array.isArray(window.currentFilteredData) && typeof window.renderGrid === 'function') {
        window.renderGrid(window.currentFilteredData);
      }
      if (typeof window.renderTop200 === 'function') window.renderTop200();
    } catch (error) {
      console.error('Hotfix runtime WIP impossible.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
