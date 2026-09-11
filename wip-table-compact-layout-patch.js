(() => {
  const PATCH_ID = 'wip-table-compact-layout-2026-09-11-v1';
  if (window.__WIP_TABLE_COMPACT_LAYOUT_PATCH__ === PATCH_ID) return;
  window.__WIP_TABLE_COMPACT_LAYOUT_PATCH__ = PATCH_ID;

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  function installStyles() {
    if (document.getElementById('wip-table-compact-layout-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-table-compact-layout-style';
    style.textContent = `
      @media (min-width: 768px) {
        #view-table table,
        #view-top200 table {
          width: 100% !important;
          table-layout: fixed !important;
        }
        #view-table table { min-width: 1040px !important; }
        #view-top200 table { min-width: 1120px !important; }

        #view-table .wip-col-data-client { width: 250px !important; }
        #view-table .wip-col-data-siret { width: 132px !important; }
        #view-table .wip-col-data-location { width: 190px !important; }
        #view-table .wip-col-data-financial { width: 150px !important; }
        #view-table .wip-col-data-action { width: 68px !important; }

        #view-top200 .wip-col-top-rank { width: 66px !important; }
        #view-top200 .wip-col-top-client { width: 225px !important; }
        #view-top200 .wip-col-top-location { width: 175px !important; }
        #view-top200 .wip-col-top-ca { width: 145px !important; }
        #view-top200 .wip-col-top-machines { width: 84px !important; }
        #view-top200 .wip-col-top-visits { width: 82px !important; }
        #view-top200 .wip-col-top-todo { width: 82px !important; }
        #view-top200 .wip-col-top-priorities { width: 152px !important; }
        #view-top200 .wip-col-top-contact { width: 215px !important; }
        #view-top200 .wip-col-top-action { width: 62px !important; }

        #view-table .wip-col-data-location,
        #view-top200 .wip-col-top-location,
        #view-top200 .wip-col-top-machines,
        #view-top200 .wip-col-top-visits,
        #view-top200 .wip-col-top-todo {
          padding-left: 0.55rem !important;
          padding-right: 0.55rem !important;
        }
        #view-top200 .wip-col-top-machines,
        #view-top200 .wip-col-top-visits,
        #view-top200 .wip-col-top-todo {
          text-align: center !important;
        }
      }

      #view-table td,
      #view-top200 td {
        min-width: 0 !important;
        overflow-wrap: anywhere;
        word-break: normal;
      }

      #view-table .wip-compact-badges,
      #view-top200 .wip-compact-badges {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 3px !important;
        margin-top: 6px !important;
        width: 100% !important;
      }
      #view-table .wip-compact-badges > span,
      #view-top200 .wip-compact-badges > span {
        display: inline-flex !important;
        width: auto !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 2px 5px !important;
        font-size: 8px !important;
        line-height: 1.15 !important;
        white-space: nowrap !important;
      }

      #view-table .wip-clamp-4,
      #view-top200 .wip-clamp-4 {
        display: -webkit-box !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 4 !important;
        overflow: hidden !important;
        white-space: normal !important;
        text-overflow: ellipsis !important;
        overflow-wrap: anywhere !important;
        max-width: 100% !important;
      }

      #view-table .wip-cell-4lines,
      #view-top200 .wip-cell-4lines {
        position: relative;
        max-height: 5.35em;
        overflow: hidden;
        line-height: 1.34;
      }
      #view-table .wip-cell-4lines.wip-overflowing::after,
      #view-top200 .wip-cell-4lines.wip-overflowing::after {
        content: '…';
        position: absolute;
        right: 0;
        bottom: 0;
        min-width: 1.6em;
        padding-left: 0.55em;
        text-align: right;
        background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.96) 45%);
        color: #64748b;
        font-weight: 700;
      }
      .dark #view-table .wip-cell-4lines.wip-overflowing::after,
      .dark #view-top200 .wip-cell-4lines.wip-overflowing::after {
        background: linear-gradient(90deg, rgba(2,6,23,0), rgba(2,6,23,.97) 45%);
        color: #94a3b8;
      }

      #view-top200 .wip-col-top-contact { cursor: help; }
      #view-top200 .wip-col-top-contact .wip-cell-4lines { cursor: help; }
    `;
    document.head.appendChild(style);
  }

  function headerIndex(table, matcher) {
    const headers = [...table.querySelectorAll('thead th')];
    return headers.findIndex((header) => matcher(norm(header.textContent || '')));
  }

  function addColumnClass(table, index, className) {
    if (index < 0) return;
    const header = table.querySelectorAll('thead th')[index];
    header?.classList.add(className);
    table.querySelectorAll('tbody tr').forEach((row) => row.cells?.[index]?.classList.add(className));
  }

  function compactBadges(cell) {
    if (!cell) return;
    const candidates = [...cell.querySelectorAll('div')];
    candidates.forEach((container) => {
      const badges = [...container.children].filter((child) => child.matches?.('span'));
      if (!badges.length) return;
      const looksLikeBadges = badges.some((badge) => badge.classList.contains('rounded-full') || norm(badge.className).includes('rounded-full'));
      if (looksLikeBadges) container.classList.add('wip-compact-badges');
    });
  }

  function clampExistingTruncates(root) {
    root?.querySelectorAll?.('.truncate').forEach((element) => element.classList.add('wip-clamp-4'));
  }

  function wrapCellToFourLines(cell, tooltip = false) {
    if (!cell || cell.querySelector(':scope > .wip-cell-4lines')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'wip-cell-4lines';
    while (cell.firstChild) wrapper.appendChild(cell.firstChild);
    cell.appendChild(wrapper);

    const fullText = String(wrapper.innerText || wrapper.textContent || '').replace(/\s+/g, ' ').trim();
    if (fullText) {
      wrapper.dataset.fullText = fullText;
      if (tooltip) {
        cell.title = fullText;
        wrapper.title = fullText;
      }
    }

    requestAnimationFrame(() => {
      if (wrapper.scrollHeight > wrapper.clientHeight + 2) wrapper.classList.add('wip-overflowing');
    });
  }

  function decorateDataTable() {
    const table = document.querySelector('#view-table table');
    if (!table) return;

    const client = headerIndex(table, (text) => text.includes('client / prospect'));
    const siret = headerIndex(table, (text) => text.includes('siret'));
    const location = headerIndex(table, (text) => text.includes('localisation'));
    const financial = headerIndex(table, (text) => text.includes('indicateur financier'));
    const fleet = headerIndex(table, (text) => text.includes('flotte identifiee'));
    const action = headerIndex(table, (text) => text === 'action' || text.includes('action'));

    addColumnClass(table, client, 'wip-col-data-client');
    addColumnClass(table, siret, 'wip-col-data-siret');
    addColumnClass(table, location, 'wip-col-data-location');
    addColumnClass(table, financial, 'wip-col-data-financial');
    addColumnClass(table, fleet, 'wip-col-data-fleet');
    addColumnClass(table, action, 'wip-col-data-action');

    table.querySelectorAll('tbody tr').forEach((row) => {
      compactBadges(row.cells?.[client]);
      wrapCellToFourLines(row.cells?.[location]);
      wrapCellToFourLines(row.cells?.[fleet]);
    });
    clampExistingTruncates(table);
  }

  function decorateTop200Table() {
    const table = document.querySelector('#view-top200 table');
    if (!table) return;

    const rank = headerIndex(table, (text) => text === 'rang');
    const client = headerIndex(table, (text) => text.includes('client / prospect'));
    const location = headerIndex(table, (text) => text.includes('localisation'));
    const ca = headerIndex(table, (text) => text.includes('ca 2025') && text.includes('ca 2026'));
    const machines = headerIndex(table, (text) => text.includes('nb machines'));
    const visits = headerIndex(table, (text) => text === 'visites 2026' || text.includes('visites 2026'));
    const todo = headerIndex(table, (text) => text.includes('a faire 2026'));
    const priorities = headerIndex(table, (text) => text.includes('priorites'));
    const contact = headerIndex(table, (text) => text.includes('dernier contact'));
    const action = headerIndex(table, (text) => text === 'action' || text.includes('action'));

    addColumnClass(table, rank, 'wip-col-top-rank');
    addColumnClass(table, client, 'wip-col-top-client');
    addColumnClass(table, location, 'wip-col-top-location');
    addColumnClass(table, ca, 'wip-col-top-ca');
    addColumnClass(table, machines, 'wip-col-top-machines');
    addColumnClass(table, visits, 'wip-col-top-visits');
    addColumnClass(table, todo, 'wip-col-top-todo');
    addColumnClass(table, priorities, 'wip-col-top-priorities');
    addColumnClass(table, contact, 'wip-col-top-contact');
    addColumnClass(table, action, 'wip-col-top-action');

    table.querySelectorAll('tbody tr').forEach((row) => {
      compactBadges(row.cells?.[client]);
      compactBadges(row.cells?.[priorities]);
      wrapCellToFourLines(row.cells?.[location]);
      wrapCellToFourLines(row.cells?.[contact], true);
    });
    clampExistingTruncates(table);
  }

  let timer = null;
  function decorate(delay = 0) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      installStyles();
      decorateDataTable();
      decorateTop200Table();
    }, delay);
  }

  function observe() {
    ['view-table', 'view-top200'].forEach((id) => {
      const root = document.getElementById(id);
      if (!root || root.dataset.wipCompactLayoutObserved === '1') return;
      root.dataset.wipCompactLayoutObserved = '1';
      new MutationObserver((mutations) => {
        if (mutations.some((mutation) => mutation.addedNodes?.length)) decorate(20);
      }).observe(root, { childList: true, subtree: true });
    });
  }

  installStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { observe(); decorate(80); }, { once: true });
  } else {
    observe();
    decorate(80);
  }
  document.addEventListener('dashboard:grid-rendered', () => decorate(0), { passive: true });
  document.addEventListener('dashboard:data-ready', () => decorate(80), { passive: true });
  window.addEventListener('resize', () => decorate(60), { passive: true });
})();
