(() => {
  const PATCH_ID = 'wip-filter-placeholder-cleanup-toggle-2026-08-07-v3';
  if (window.__WIP_FILTER_PLACEHOLDER_CLEANUP_PATCH__ === PATCH_ID) return;
  window.__WIP_FILTER_PLACEHOLDER_CLEANUP_PATCH__ = PATCH_ID;

  const FILTER_ID = 'wip-undercarriage-filter';

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

  function findUndercarriageHeader() {
    return [...document.querySelectorAll('button, summary, h2, h3, h4, label, div, section, details')]
      .filter((node) => node.id !== FILTER_ID && !node.closest(`#${FILTER_ID}`))
      .find((node) => {
        const text = visibleText(node);
        return text === '7. undercarriage'
          || text.startsWith('7. undercarriage ')
          || text.includes('7. undercarriage');
      }) || null;
  }

  function isLikelyEmptySectionBody(element) {
    if (!element || element.id === FILTER_ID || element.closest(`#${FILTER_ID}`)) return false;
    const text = visibleText(element);
    if (text.includes('train de roulement') || text.includes('undercarriage') || text.includes('cantons')) return false;
    if (text.length > 220) return false;
    const cls = String(element.className || '');
    const rect = element.getBoundingClientRect?.();
    const hasBoxLook = /rounded|border|bg-|p-|space|grid|overflow/i.test(cls);
    return hasBoxLook || (rect && rect.height >= 18 && rect.height <= 260);
  }

  function closestStableRoot(header) {
    let current = header;
    let best = header.parentElement || header;
    for (let i = 0; i < 8 && current?.parentElement; i += 1) {
      const parent = current.parentElement;
      const text = visibleText(parent);
      if (text.includes('7. undercarriage') && text.length < 7000 && !parent.closest(`#${FILTER_ID}`)) best = parent;
      current = parent;
    }
    return best;
  }

  function nextSiblingBodyAfter(element) {
    let sibling = element?.nextElementSibling || null;
    let guard = 0;
    while (sibling && guard < 8) {
      if (isLikelyEmptySectionBody(sibling)) return sibling;
      const text = visibleText(sibling);
      if (text.includes('train de roulement') || text.includes('cantons - in progress')) break;
      sibling = sibling.nextElementSibling;
      guard += 1;
    }
    return null;
  }

  function findUndercarriageSlot() {
    const header = findUndercarriageHeader();
    if (!header) return null;

    const nativeDetails = header.closest('details');
    if (nativeDetails && nativeDetails.id !== FILTER_ID) return nativeDetails;

    const anchors = [
      header.closest('button'),
      header.closest('summary'),
      header,
      header.parentElement,
      header.parentElement?.parentElement,
      header.parentElement?.parentElement?.parentElement
    ].filter(Boolean);

    for (const anchor of anchors) {
      const body = nextSiblingBodyAfter(anchor);
      if (body) return body;
    }

    const root = closestStableRoot(header);
    const descendants = [...root.querySelectorAll('div, section, fieldset')]
      .filter((node) => node !== root && isLikelyEmptySectionBody(node))
      .filter((node) => header.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (descendants.length) {
      return descendants.sort((a, b) => {
        const at = (a.textContent || '').length;
        const bt = (b.textContent || '').length;
        return at - bt;
      })[0];
    }

    const fallback = document.createElement('div');
    fallback.className = 'wip-undercarriage-created-slot';
    const anchor = header.closest('button') || header;
    anchor.insertAdjacentElement('afterend', fallback);
    return fallback;
  }

  function openAndFlattenUndercarriageFilter(filter) {
    if (!filter) return;
    if (filter.tagName === 'DETAILS') filter.open = true;
    filter.classList.add('wip-undercarriage-active-filter', 'wip-undercarriage-inline-content');
    filter.classList.remove('bg-orange-50/70', 'dark:bg-orange-500/10');
    filter.querySelector(':scope > summary')?.classList.add('wip-hidden-undercarriage-summary');
  }

  function moveUndercarriageFilterIntoSlot() {
    const filter = document.getElementById(FILTER_ID);
    if (!filter) return;

    removeUndercarriagePlaceholder();
    const slot = findUndercarriageSlot();
    openAndFlattenUndercarriageFilter(filter);

    if (!slot || slot.contains(filter)) return;
    slot.classList.add('wip-undercarriage-section-body-filled');
    slot.appendChild(filter);
    filter.dataset.wipMovedIntoSection = 'true';
  }

  function cleanupDuplicateStandaloneUndercarriage() {
    const filters = [...document.querySelectorAll(`#${FILTER_ID}`)];
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
      .wip-undercarriage-section-body-filled{padding:0!important;border-color:#fed7aa!important;background:#fff7ed!important;overflow:hidden!important}
      .dark .wip-undercarriage-section-body-filled{background:rgba(154,52,18,.08)!important;border-color:rgba(251,146,60,.28)!important}
      .wip-undercarriage-created-slot{margin-top:10px;border:1px solid #fed7aa;border-radius:16px;background:#fff7ed;padding:0;overflow:hidden}
      .wip-undercarriage-active-filter{border:0!important;background:transparent!important;box-shadow:none!important}
      .dark .wip-undercarriage-active-filter{background:transparent!important}
      .wip-undercarriage-inline-content{display:block!important;margin:0!important;border-radius:0!important;padding:12px!important}
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
