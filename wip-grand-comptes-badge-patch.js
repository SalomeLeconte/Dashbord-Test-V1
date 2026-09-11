(() => {
  const PATCH_ID = 'wip-grand-comptes-badges-2026-09-11-v1';
  if (window.__WIP_GRAND_COMPTES_BADGES__ === PATCH_ID) return;
  window.__WIP_GRAND_COMPTES_BADGES__ = PATCH_ID;

  function renameBadgeText(root = document) {
    const selectors = [
      '#view-table span.rounded-full',
      '#view-top200 span.rounded-full',
      '#mobile-grid-cards span.rounded-full',
      '#mobile-top200-cards span.rounded-full',
      '#details-modal span.rounded-full',
      '.leaflet-popup-content span.rounded-full'
    ];

    root.querySelectorAll?.(selectors.join(',')).forEach((badge) => {
      const text = String(badge.textContent || '').trim();
      if (text === 'Client éligible') {
        badge.textContent = 'Grands Comptes';
      } else if (text.startsWith('Client éligible •')) {
        badge.textContent = text.replace(/^Client éligible/, 'Grands Comptes');
      }
    });
  }

  let timer = null;
  function queueRename(delay = 0) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => renameBadgeText(document), delay);
  }

  const observer = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.addedNodes?.length || mutation.type === 'characterData')) return;
    queueRename(0);
  });

  function start() {
    renameBadgeText(document);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  document.addEventListener('dashboard:grid-rendered', () => queueRename(0), { passive: true });
  document.addEventListener('dashboard:data-ready', () => queueRename(50), { passive: true });
})();
