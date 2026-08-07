(() => {
  const PATCH_ID = 'wip-filter-placeholder-cleanup-toggle-2026-08-07-v4';
  if (window.__WIP_FILTER_PLACEHOLDER_CLEANUP_PATCH__ === PATCH_ID) return;
  window.__WIP_FILTER_PLACEHOLDER_CLEANUP_PATCH__ = PATCH_ID;

  const FILTER_ID = 'wip-undercarriage-filter';
  const ACCORDION_ID = 'wip-undercarriage-integrated-accordion';
  const BODY_ID = 'wip-undercarriage-integrated-body';

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

  function textLooksLikeUndercarriageHeader(text) {
    return text === '7. undercarriage'
      || text === '7 undercarriage'
      || text.startsWith('7. undercarriage ')
      || text.includes('7. undercarriage');
  }

  function findUndercarriageHeaderNode() {
    const nodes = [...document.querySelectorAll('button, summary, h2, h3, h4, label, div, section')]
      .filter((node) => node.id !== FILTER_ID
        && node.id !== ACCORDION_ID
        && !node.closest(`#${FILTER_ID}`)
        && !node.closest(`#${ACCORDION_ID}`));

    return nodes
      .filter((node) => textLooksLikeUndercarriageHeader(visibleText(node)))
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0] || null;
  }

  function visualHeaderBlock(node) {
    if (!node) return null;
    const direct = node.closest('button, summary');
    if (direct && direct.id !== FILTER_ID && !direct.closest(`#${FILTER_ID}`)) return direct;

    let current = node;
    let best = node;
    for (let i = 0; i < 6 && current?.parentElement; i += 1) {
      const parent = current.parentElement;
      if (parent.id === FILTER_ID || parent.closest(`#${FILTER_ID}`)) break;
      const text = visibleText(parent);
      const rect = parent.getBoundingClientRect?.();
      const cls = String(parent.className || '');
      const looksLikeHeader = textLooksLikeUndercarriageHeader(text)
        && (rect ? rect.height >= 28 && rect.height <= 90 : true)
        && (/rounded|border|accordion|summary|cursor|flex|items/i.test(cls) || rect?.width > 180);
      if (looksLikeHeader) best = parent;
      current = parent;
    }
    return best;
  }

  function hideLooseEmptyBodiesAround(headerBlock) {
    if (!headerBlock) return;
    const roots = [headerBlock, headerBlock.parentElement, headerBlock.parentElement?.parentElement].filter(Boolean);
    roots.forEach((root) => {
      let sibling = root.nextElementSibling;
      let guard = 0;
      while (sibling && guard < 4) {
        const text = visibleText(sibling);
        const containsFilter = !!sibling.querySelector?.(`#${FILTER_ID}`);
        const containsAccordion = !!sibling.querySelector?.(`#${ACCORDION_ID}`);
        const cls = String(sibling.className || '');
        const rect = sibling.getBoundingClientRect?.();
        const isEmptyBody = !containsFilter
          && !containsAccordion
          && text.length < 80
          && (/rounded|border|bg-|p-|space|overflow/i.test(cls) || (rect && rect.height >= 16 && rect.height <= 220));
        if (isEmptyBody) {
          sibling.classList.add('wip-hidden-undercarriage-orphan');
          sibling.setAttribute('aria-hidden', 'true');
        }
        if (text.includes('train de roulement') || text.includes('cantons - in progress')) break;
        sibling = sibling.nextElementSibling;
        guard += 1;
      }
    });
  }

  function createIntegratedAccordion(referenceNode) {
    let accordion = document.getElementById(ACCORDION_ID);
    if (accordion) return accordion;

    accordion = document.createElement('details');
    accordion.id = ACCORDION_ID;
    accordion.className = 'wip-undercarriage-integrated-accordion';
    accordion.innerHTML = `
      <summary class="wip-undercarriage-integrated-summary">
        <span>7. UNDERCARRIAGE</span>
        <span class="wip-undercarriage-integrated-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div id="${BODY_ID}" class="wip-undercarriage-integrated-body"></div>
    `;

    if (referenceNode?.parentNode) referenceNode.parentNode.insertBefore(accordion, referenceNode);
    else (document.getElementById('filters-panel') || document.querySelector('aside') || document.body).appendChild(accordion);
    return accordion;
  }

  function hideOriginalHeader(headerBlock) {
    if (!headerBlock || headerBlock.closest(`#${ACCORDION_ID}`)) return;
    headerBlock.classList.add('wip-hidden-original-undercarriage-header');
    headerBlock.setAttribute('aria-hidden', 'true');
    hideLooseEmptyBodiesAround(headerBlock);
  }

  function flattenFilter(filter) {
    if (!filter) return;
    if (filter.tagName === 'DETAILS') filter.open = true;
    filter.classList.add('wip-undercarriage-active-filter', 'wip-undercarriage-inline-content');
    filter.classList.remove('bg-orange-50/70', 'dark:bg-orange-500/10');
    filter.querySelector(':scope > summary')?.classList.add('wip-hidden-undercarriage-summary');
  }

  function removeExternalUndercarriageShells(keepFilter) {
    [...document.querySelectorAll('details, section, div')].forEach((node) => {
      if (node.id === ACCORDION_ID || node.id === FILTER_ID || node.contains(keepFilter)) return;
      if (node.closest(`#${ACCORDION_ID}`) || node.closest(`#${FILTER_ID}`)) return;
      const text = visibleText(node);
      if (text.includes('train de roulement / undercarriage') && text.length < 260) {
        node.classList.add('wip-hidden-undercarriage-orphan');
        node.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function integrateUndercarriageFilter() {
    const filter = document.getElementById(FILTER_ID);
    if (!filter) return;

    removeUndercarriagePlaceholder();

    const headerNode = findUndercarriageHeaderNode();
    const headerBlock = visualHeaderBlock(headerNode);
    const accordion = createIntegratedAccordion(headerBlock || filter);
    const body = accordion.querySelector(`#${BODY_ID}`);
    if (!body) return;

    flattenFilter(filter);
    if (!body.contains(filter)) body.appendChild(filter);
    filter.dataset.wipMovedIntoSection = 'true';

    hideOriginalHeader(headerBlock);
    removeExternalUndercarriageShells(filter);
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
      .wip-hidden-original-undercarriage-header,
      .wip-hidden-undercarriage-orphan,
      .wip-hidden-undercarriage-summary{display:none!important}
      .wip-undercarriage-integrated-accordion{border:1px solid #fed7aa!important;border-left:4px solid #f59e0b!important;border-radius:16px!important;background:#fffdf7!important;overflow:hidden!important;margin:0 0 12px!important}
      .dark .wip-undercarriage-integrated-accordion{background:rgba(15,23,42,.92)!important;border-color:rgba(251,146,60,.35)!important}
      .wip-undercarriage-integrated-summary{list-style:none!important;cursor:pointer!important;min-height:46px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 14px!important;font-size:11px!important;font-weight:1000!important;letter-spacing:.055em!important;text-transform:uppercase!important;color:#111827!important;user-select:none!important}
      .dark .wip-undercarriage-integrated-summary{color:#f8fafc!important}
      .wip-undercarriage-integrated-summary::-webkit-details-marker{display:none!important}
      .wip-undercarriage-integrated-chevron{font-size:16px!important;line-height:1!important;color:#94a3b8!important;transition:transform .18s ease!important}
      .wip-undercarriage-integrated-accordion[open] .wip-undercarriage-integrated-chevron{transform:rotate(180deg)!important}
      .wip-undercarriage-integrated-body{border-top:1px solid #fed7aa!important;background:#fff7ed!important;padding:0!important}
      .dark .wip-undercarriage-integrated-body{background:rgba(154,52,18,.08)!important;border-color:rgba(251,146,60,.28)!important}
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
    integrateUndercarriageFilter();
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
