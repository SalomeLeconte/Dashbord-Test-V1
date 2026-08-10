(() => {
  const PATCH_ID = 'wip-canton-note-cleanup-2026-08-10';
  if (window.__WIP_CANTON_NOTE_CLEANUP_PATCH__ === PATCH_ID) return;
  window.__WIP_CANTON_NOTE_CLEANUP_PATCH__ = PATCH_ID;

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  function isObsoleteCantonNote(element) {
    if (!element || element.closest('#wip-canton-adaptive-filter')) return false;
    if (element.querySelector?.('select,input,button,textarea')) return false;
    const text = norm(element.textContent || '');
    if (!text || text.length > 420) return false;
    return text.includes('menu deroulant canton en cours de developpement')
      || text.includes('utilisez uniquement le champ ville / canton au-dessus')
      || text.includes('liste liee aux departements du pssr')
      || text.includes('le filtrage exact necessite une colonne canton par client');
  }

  function removeObsoleteCantonNotes() {
    document.querySelectorAll('p,small,span,div').forEach((element) => {
      if (isObsoleteCantonNote(element)) element.remove();
    });
  }

  removeObsoleteCantonNotes();
  document.addEventListener('DOMContentLoaded', () => {
    [80, 250, 600, 1200, 2400, 5000, 9000].forEach((delay) => window.setTimeout(removeObsoleteCantonNotes, delay));
  });
  [120, 450, 900, 1800, 3600, 7200, 12000].forEach((delay) => window.setTimeout(removeObsoleteCantonNotes, delay));
  try {
    new MutationObserver(() => window.setTimeout(removeObsoleteCantonNotes, 0))
      .observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {}
})();
