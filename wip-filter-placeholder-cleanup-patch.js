(() => {
  const PATCH_ID = 'wip-filter-placeholder-cleanup-toggle-2026-08-07-v2';
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
    const nodes = [...document.querySelectorAll('button, summary, h2, h3, h4, label, div, section, details')]
      .filter((node) => node.id !== 'wip-undercarriage-filter' && !node.closest('#wip-undercarriage-filter'));

    const header = nodes.find((node) => {
      const text = visibleText(node);
      return text === '7. undercarriage'
        || text.startsWith('7. undercarriage ')
        || text.includes('7. undercarriage');
    });
    if (!header) return null;

    const details = header.closest('details');
    if (details && details.id !== 'wip-undercarriage-filter') return details;

    let current = header;
    for (let i = 0; i < 9 && current?.parentElement; i += 1) {
      const parent = current.parentElement;
      const text = visibleText(parent);
      if (text.includes('7. undercarriage') && text.length < 6000 && parent.id !== 'wip-undercarriage-filter') return parent;
      current = parent;
    }
    return header.parentElement || header;
  }

  function openAndFlattenUndercarriageFilter(filter) {
    if (!filter) return;
    if (filter.tagName === 'DETAILS') filter.open = true;
    filter.classList.add('wip-undercarriage-active-filter', 'wip-undercarriage-inline-content');
    filter.classList.remove('bg-orange-50/70', 'dark:bg-orange-500/10');
    filter.querySelector(':scope > summary')?.classList.add('wip-hidden-undercarriage-summary');
  }

  function moveUndercarriageFilterIntoSlot() {
    const filter = document.getElementById('wip-undercarriage-filter');
    if (!filter) return;

    removeUndercarriagePlaceholder();
    const slot = findUndercarriageSlot();
    openAndFlattenUndercarriageFilter(filter);

    if (!slot) return;
    if (!slot.contains(filter)) slot.appendChild(filter);
    filter.dataset.wipMovedIntoSection = 'true';
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
      .wip-hidden-undercarriage-summary{display:none!important}
      .wip-undercarriage-active-filter{border-color:#f59e0b!important;background:#fff!important}
      .dark .wip-undercarriage-active-filter{background:rgba(15,23,42,.92)!important}
      .wip-undercarriage-inline-content{display:block!important;margin-top:12px!important;border-radius:16px!important;border-width:1px!important;padding:12px!important}
      .wip-undercarriage-inline-content>div{margin-top:0!important}
      .wip-undercarriage-inline-content>summary{display:none!important}
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
