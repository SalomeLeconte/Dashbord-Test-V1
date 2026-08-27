(() => {
  const PATCH_ID = 'wip-canton-cleanup-2026-08-27';
  if (window.__WIP_CANTON_CLEANUP_PATCH__ === PATCH_ID) return;
  window.__WIP_CANTON_CLEANUP_PATCH__ = PATCH_ID;

  let queued = false;

  function norm(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hide(node) {
    if (!node || !node.isConnected) return;
    node.classList.add('wip-canton-legacy-hidden');
    node.setAttribute('aria-hidden', 'true');
  }

  function compactText(node) {
    if (!node) return '';
    const clone = node.cloneNode(true);
    clone.querySelectorAll('option').forEach((option) => option.remove());
    return norm(clone.textContent || '');
  }

  function findSafeContainer(node) {
    if (!node) return null;
    const candidates = [
      node.closest?.('label'),
      node.closest?.('.field'),
      node.closest?.('.filter-field'),
      node.closest?.('.rounded-xl'),
      node.closest?.('.rounded-2xl'),
      node.closest?.('section'),
      node.closest?.('div')
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate.id === 'sidebar' || candidate.id === 'filters' || candidate.tagName === 'BODY') continue;
      const text = norm(candidate.textContent || '');
      if (!text.includes('canton') && !text.includes('in progress')) continue;
      const rect = candidate.getBoundingClientRect?.();
      if (rect && rect.height > 260) continue;
      return candidate;
    }
    return node;
  }

  function hideLegacyCantonBlock() {
    document.querySelectorAll('select').forEach((select) => {
      const selected = norm(select.selectedOptions?.[0]?.textContent || select.value || '');
      const allOptions = norm([...select.options].map((option) => option.textContent || '').join(' '));
      if (selected.includes('in progress') || allOptions.includes('in progress non fonctionnel')) {
        hide(findSafeContainer(select));
      }
    });

    document.querySelectorAll('label,div,p,section,details').forEach((node) => {
      const text = compactText(node);
      if (!text) return;

      const isLegacyTitle = text.includes('cantons') && text.includes('in progress');
      const isLegacyNote = text.includes('menu deroulant canton en cours de developpement')
        || text.includes('liste liee aux departements du pssr')
        || text.includes('filtrage exact necessite une colonne canton')
        || text.includes('utilisez uniquement le champ ville / canton au-dessus');

      if (!isLegacyTitle && !isLegacyNote) return;
      hide(findSafeContainer(node));
    });
  }

  function installStyles() {
    if (document.getElementById('wip-canton-cleanup-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-canton-cleanup-style';
    style.textContent = `
      .wip-canton-legacy-hidden{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;pointer-events:none!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    hideLegacyCantonBlock();
  }

  function queueInstall() {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      try { install(); } catch (error) { console.warn('Patch nettoyage canton impossible.', error); }
    }, 80);
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', queueInstall);
  document.addEventListener('dashboard:grid-rendered', queueInstall);
  setTimeout(install, 500);
  setTimeout(install, 1600);
  setTimeout(install, 3600);
  try { new MutationObserver(queueInstall).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
