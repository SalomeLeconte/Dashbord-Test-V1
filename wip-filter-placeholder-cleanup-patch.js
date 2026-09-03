(() => {
  const PATCH_ID = 'wip-filter-placeholder-cleanup-2026-09-03-v7';
  if (window.__WIP_FILTER_PLACEHOLDER_CLEANUP_PATCH__ === PATCH_ID) return;
  window.__WIP_FILTER_PLACEHOLDER_CLEANUP_PATCH__ = PATCH_ID;

  const FILTER_ID = 'wip-undercarriage-filter';
  const ACCORDION_ID = 'wip-undercarriage-integrated-accordion';
  const BODY_ID = 'wip-undercarriage-integrated-body';
  let activeColumnButtonKey = '';

  function removeLegacyUndercarriageDom() {
    const legacyBody = document.getElementById('acc-undercarriage');
    const legacySection = legacyBody?.parentElement;
    if (legacySection && !legacySection.contains(document.getElementById(FILTER_ID))) legacySection.remove();
  }

  function createIntegratedAccordion() {
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

    const priorityBody = document.getElementById('acc-priorite-client');
    const prioritySection = priorityBody?.parentElement;
    const filterList = prioritySection?.parentElement;
    if (prioritySection && filterList) filterList.insertBefore(accordion, prioritySection.nextElementSibling);
    else (document.getElementById('filters-panel') || document.querySelector('aside') || document.body).appendChild(accordion);
    return accordion;
  }

  function integrateUndercarriageFilter() {
    const filter = document.getElementById(FILTER_ID);
    if (!filter) return;

    removeLegacyUndercarriageDom();
    const accordion = createIntegratedAccordion();
    const body = accordion.querySelector(`#${BODY_ID}`);
    if (!body) return;

    if (filter.tagName === 'DETAILS') filter.open = true;
    filter.querySelector(':scope > summary')?.remove();
    filter.classList.add('wip-undercarriage-active-filter', 'wip-undercarriage-inline-content');
    filter.classList.remove('bg-orange-50/70', 'dark:bg-orange-500/10');
    if (!body.contains(filter)) body.appendChild(filter);
    filter.dataset.wipMovedIntoSection = 'true';
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
      .wip-undercarriage-integrated-accordion{border:1px solid #fed7aa!important;border-left:4px solid #f59e0b!important;border-radius:16px!important;background:#fffdf7!important;overflow:hidden!important;margin:.75rem 0 0!important}
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
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    installColumnFilterToggle();
    integrateUndercarriageFilter();
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', () => window.setTimeout(install, 0));
  window.setTimeout(install, 1200);
})();
