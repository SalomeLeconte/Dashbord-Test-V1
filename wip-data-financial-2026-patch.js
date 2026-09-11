(() => {
  const PATCH_ID = 'wip-data-financial-2026-2026-09-11-v1';
  if (window.__WIP_DATA_FINANCIAL_2026_PATCH__ === PATCH_ID) return;
  window.__WIP_DATA_FINANCIAL_2026_PATCH__ = PATCH_ID;

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  function numberValue(value) {
    try {
      if (typeof parseNumber === 'function') return Number(parseNumber(value) || 0);
    } catch (error) {}
    const parsed = Number(String(value ?? '')
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function ca2026(row) {
    if (!row) return 0;
    try {
      if (typeof getAmount === 'function') {
        const value = Number(getAmount(row, 'GLOBAL', '2026') || 0);
        if (Number.isFinite(value)) return value;
      }
    } catch (error) {}

    const pdr = numberValue(row?.['Total Montant Facturé PDR FY 2026']);
    const service = numberValue(row?.['Total Montant Facturé SERVICE FY 2026']);
    if (pdr || service) return pdr + service;

    const directKeys = [
      'CA 2026',
      'CA Global 2026',
      'CA FY 2026',
      'CA_GLOBAL_2026'
    ];
    for (const key of directKeys) {
      const value = numberValue(row?.[key]);
      if (value) return value;
    }
    return 0;
  }

  function money(value) {
    try {
      if (typeof formatMoney === 'function') return formatMoney(value);
    } catch (error) {}
    return Number(value || 0).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    });
  }

  function financialColumnIndex(table) {
    const headers = [...table.querySelectorAll('thead th')];
    return headers.findIndex((header) => {
      const text = norm(header.textContent || '');
      return text.includes('indicateur financier');
    });
  }

  function rowFromTableRow(tr) {
    const detailsButton = tr.querySelector('button[onclick*="openDetails("], [onclick*="openDetails("]');
    const onclick = detailsButton?.getAttribute?.('onclick') || '';
    const match = onclick.match(/openDetails\((\d+)\)/);
    if (!match) return null;
    const rowIndex = Number(match[1]);
    if (!Number.isInteger(rowIndex)) return null;
    try {
      return window.__wipRowByIndex?.(rowIndex) || null;
    } catch (error) {
      return null;
    }
  }

  function decorateFinancialCells() {
    const view = document.getElementById('view-table');
    const table = view?.querySelector('table');
    if (!table) return;

    const columnIndex = financialColumnIndex(table);
    if (columnIndex < 0) return;

    table.querySelectorAll('tbody tr').forEach((tr) => {
      const cell = tr.cells?.[columnIndex];
      if (!cell || cell.querySelector('.wip-data-ca-2026')) return;
      const row = rowFromTableRow(tr);
      if (!row) return;

      const value2026 = ca2026(row);
      const secondary = document.createElement('div');
      secondary.className = 'wip-data-ca-2026';
      secondary.textContent = `CA 2026 : ${money(value2026)}`;
      secondary.style.marginTop = '2px';
      secondary.style.fontSize = '10px';
      secondary.style.lineHeight = '1.2';
      secondary.style.fontWeight = '600';
      secondary.style.color = '#94a3b8';
      secondary.style.whiteSpace = 'nowrap';
      cell.appendChild(secondary);
    });
  }

  let timer = null;
  function queueDecorate(delay = 0) {
    window.clearTimeout(timer);
    timer = window.setTimeout(decorateFinancialCells, delay);
  }

  document.addEventListener('dashboard:grid-rendered', () => queueDecorate(0), { passive: true });
  document.addEventListener('dashboard:data-ready', () => queueDecorate(80), { passive: true });
  document.addEventListener('DOMContentLoaded', () => queueDecorate(200), { once: true });

  const observer = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.addedNodes?.length)) return;
    queueDecorate(30);
  });
  const startObserver = () => {
    const root = document.getElementById('view-table');
    if (root) observer.observe(root, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  else startObserver();

  queueDecorate(300);
})();
