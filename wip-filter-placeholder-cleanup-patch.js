(() => {
  const PATCH_ID = 'wip-filter-placeholder-cleanup-toggle-2026-08-07';
  if (window.__WIP_FILTER_PLACEHOLDER_CLEANUP_PATCH__ === PATCH_ID) return;
  window.__WIP_FILTER_PLACEHOLDER_CLEANUP_PATCH__ = PATCH_ID;

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  let activeColumnButtonKey = '';

  function visibleText(element) {
    return norm(element?.textContent || '');
  }

  function candidateContainers() {
    return [...document.querySelectorAll('aside, section, details, div, fieldset, li')]
      .filter((element) => element !== document.body && element !== document.documentElement);
  }

  function smallestContainer(matchFn) {
    const matches = candidateContainers().filter(matchFn);
    if (!matches.length) return null;
    return matches.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
  }

  function removeCantonInProgress() {
    const box = smallestContainer((element) => {
      const text = visibleText(element);
      return text.includes('cantons - in progress')
        && (text.includes('in progress - non fonctionnel') || text.includes('menu deroulant canton en cours'));
    });
    if (box) box.remove();
  }

  function removeUndercarriagePlaceholder() {
    const box = smallestContainer((element) => {
      const text = visibleText(element);
      return text.includes('filtre non fonctionnel')
        && text.includes('undercarriage')
        && text.includes('type undercarriage');
    });
    if (box) box.remove();
  }

  function findUndercarriageSlot() {
    const nodes = [...document.querySelectorAll('button, summary, h2, h3, h4, label, div, section, details')];
    const header = nodes.find((node) => {
      const text = visibleText(node);
      return text.includes('7. undercarriage') || text === 'undercarriage' || text.includes(' undercarriage');
    });
    if (!header) return null;

    const details = header.closest('details');
    if (details) return details;

    let current = header;
    for (let i = 0; i < 7 && current?.parentElement; i += 1) {
      const parent = current.parentElement;
      const text = visibleText(parent);
      if (text.includes('7. undercarriage') && text.length < 4000) return parent;
      current = parent;
    }
    return header.parentElement || header;
  }

  function moveUndercarriageFilterIntoSlot() {
    const filter = document.getElementById('wip-undercarriage-filter');
    if (!filter || filter.dataset.wipMovedIntoSection === 'true') return;

    const slot = findUndercarriageSlot();
    if (!slot || slot.contains(filter)) {
      if (slot && slot.contains(filter)) filter.dataset.wipMovedIntoSection = 'true';
      return;
    }

    filter.dataset.wipMovedIntoSection = 'true';
    filter.classList.remove('bg-orange-50/70', 'dark:bg-orange-500/10');
    filter.classList.add('mt-3', 'wip-undercarriage-active-filter');
    slot.appendChild(filter);
  }

  function cleanupDuplicateStandaloneUndercarriage() {
    const filters = [...document.querySelectorAll('#wip-undercarriage-filter')];
    if (filters.length <= 1) return;
    filters.slice(1).forEach((node) => node.remove());
  }

  function columnButtonKey(button) {
    if (!button) return '';
    const table = button.dataset.table || button.getAttribute('data-table') || '';
    const key = button.dataset.key || button.getAttribute('data-key') || '';
    return table && key ? `${table}::${key}` : '';
  }

  function installColumnFilterToggle() {
    if (document.documentElement.dataset.wipColumnFilterToggleInstalled === 'true') return;
    document.documentElement.dataset.wipColumnFilterToggleInstalled = 'true';

    document.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-table][data-key]');
      if (!button) return;
      const key = columnButtonKey(button);
      const menu = document.getElementById('wip-column-filter-menu');

      if (menu && key && activeColumnButtonKey === key) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        menu.remove();
        activeColumnButtonKey = '';
        return;
      }

      window.setTimeout(() => {
        const currentMenu = document.getElementById('wip-column-filter-menu');
        activeColumnButtonKey = currentMenu ? key : '';
      }, 0);
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest('button[data-table][data-key]')) return;
      if (!event.target.closest('#wip-column-filter-menu')) activeColumnButtonKey = '';
    }, true);
  }

  function installStyle() {
    if (document.getElementById('wip-filter-placeholder-cleanup-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-filter-placeholder-cleanup-style';
    style.textContent = `
      .wip-undercarriage-active-filter{border-color:#f59e0b!important;background:#fff!important}
      .dark .wip-undercarriage-active-filter{background:rgba(15,23,42,.92)!important}
      .wip-undercarriage-active-filter>summary{color:#c2410c!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    installColumnFilterToggle();
    removeCantonInProgress();
    removeUndercarriagePlaceholder();
    moveUndercarriageFilterIntoSlot();
    cleanupDuplicateStandaloneUndercarriage();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [80, 250, 600, 1200, 2400, 4200, 7000, 10500, 14000, 18000].forEach((delay) => window.setTimeout(install, delay));
  });
  [120, 450, 900, 1800, 3200, 5600, 8600, 12500, 16500].forEach((delay) => window.setTimeout(install, delay));

  const observer = new MutationObserver(() => window.setTimeout(install, 0));
  try { observer.observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
