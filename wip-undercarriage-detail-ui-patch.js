(() => {
  const PATCH_ID = 'wip-undercarriage-detail-ui-2026-08-07-v2';
  if (window.__WIP_UNDERCARRIAGE_DETAIL_UI_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_DETAIL_UI_PATCH__ = PATCH_ID;

  const SCORE = { AA: 100, AB: 85, BA: 80, AC: 60, BB: 55, CA: 50, BC: 30, CB: 25, CC: 10 };
  const COLS = {
    smr: ['data22.Machines SMR par client', 'Machines SMR par client'],
    bull: ['data22.Class BULL par client', 'Class BULL par client'],
    exca: ['data22.Class EXCA par client', 'Class EXCA par client'],
    mvm: ['data22.Class MVM par client', 'Class MVM par client'],
    travelPct: ['data22.travel pct exca par client', 'travel pct exca par client'],
    travelHours: ['data22.travel hours exca par client', 'travel hours exca par client']
  };

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const num = (value) => {
    try { if (typeof parseNumber === 'function') return parseNumber(value); } catch (error) {}
    const n = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.').replace(/%|h|€|EUR/gi, '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const get = (row, names) => names
    .map((name) => row?.[name])
    .find((value) => value !== undefined && String(value).trim() !== '') || '';

  const col = (key) => {
    try { return COL?.[key] || ''; } catch (error) { return ''; }
  };

  function entries(value) {
    return String(value ?? '')
      .split(/\s*[;\n]\s*/)
      .map((entry, index) => {
        const clean = entry.trim();
        if (!clean || /^nan$/i.test(clean)) return null;
        const match = clean.match(/^(.+?)\s*(?:-|:|→|=>)\s*(.+)$/);
        return match
          ? { key: match[1].trim(), value: match[2].trim(), index }
          : { key: `machine_${index + 1}`, value: clean, index };
      })
      .filter(Boolean);
  }

  function mapEntries(value) {
    const map = new Map();
    entries(value).forEach((entry) => map.set(entry.key || `machine_${entry.index + 1}`, entry.value));
    return map;
  }

  function cls(value) {
    const match = String(value ?? '').toUpperCase().match(/\b(AA|AB|AC|BA|BB|BC|CA|CB|CC)\b/);
    return match ? match[1] : '';
  }

  function machines(row) {
    if (!row) return [];
    if (Array.isArray(row._undercarriageMachines) && row._undercarriageMachines.length) return row._undercarriageMachines;

    const maps = {
      smr: mapEntries(get(row, COLS.smr)),
      bull: mapEntries(get(row, COLS.bull)),
      exca: mapEntries(get(row, COLS.exca)),
      mvm: mapEntries(get(row, COLS.mvm)),
      travelPct: mapEntries(get(row, COLS.travelPct)),
      travelHours: mapEntries(get(row, COLS.travelHours))
    };

    const keys = new Set();
    Object.values(maps).forEach((map) => map.forEach((_, key) => keys.add(key)));

    const list = [...keys].map((key) => {
      const bull = cls(maps.bull.get(key));
      const exca = cls(maps.exca.get(key));
      const mvm = cls(maps.mvm.get(key));
      const classes = [bull, exca, mvm].filter(Boolean);
      const best = classes.sort((a, b) => (SCORE[b] || 0) - (SCORE[a] || 0))[0] || '';
      const smr = num(maps.smr.get(key));
      const travelPct = num(maps.travelPct.get(key));
      const travelHours = num(maps.travelHours.get(key));
      const score = Math.max(
        SCORE[best] || 0,
        smr >= 9000 ? 35 : smr >= 5000 ? 20 : 0,
        travelPct >= 70 ? 35 : travelPct >= 50 ? 24 : travelPct >= 30 ? 12 : 0,
        travelHours >= 500 ? 20 : travelHours >= 250 ? 12 : travelHours >= 100 ? 7 : 0
      );

      return {
        key,
        label: key.replace(/^machine_\d+$/, 'Machine'),
        smr,
        bull,
        exca,
        mvm,
        travelPct,
        travelHours,
        best,
        score,
        hasData: !!(smr || bull || exca || mvm || travelPct || travelHours)
      };
    }).filter((machine) => machine.hasData);

    row._undercarriageMachines = list;
    row._undercarriageCount = list.length;
    row._undercarriageScore = list.reduce((max, machine) => Math.max(max, machine.score || 0), 0);
    return list;
  }

  function findRowFromBadge(badge) {
    const explicit = Number(badge?.dataset?.rowIndex || NaN);
    if (Number.isFinite(explicit)) return window.__wipRowByIndex?.(explicit) || null;

    const detailButton = badge?.parentElement?.querySelector?.('button[onclick^="openDetails("]')
      || badge?.closest?.('tr, .mobile-card, div')?.querySelector?.('button[onclick^="openDetails("]');
    const match = String(detailButton?.getAttribute('onclick') || '').match(/openDetails\((\d+)\)/);
    const rowIndex = match ? Number(match[1]) : NaN;
    if (!Number.isFinite(rowIndex)) return null;
    badge.dataset.rowIndex = String(rowIndex);
    return window.__wipRowByIndex?.(rowIndex) || null;
  }

  function clientTitle(row) {
    const name = row?.[col('nom')] || row?.denominationUniteLegale || row?.Nom || row?.Client || 'Client';
    const siret = row?.[col('siret')] || row?.siret || row?.SIRET || '';
    return `${name}${siret ? ` — ${siret}` : ''}`;
  }

  function fmtHours(value) {
    return value ? `${Math.round(value).toLocaleString('fr-FR')} h` : '—';
  }

  function fmtPct(value) {
    return value ? `${value.toLocaleString('fr-FR')} %` : '—';
  }

  function detailsHtml(row) {
    const list = machines(row).sort((a, b) => (b.score || 0) - (a.score || 0));
    if (!list.length) {
      return `<p class="wip-uc-modal-empty">Aucune donnée undercarriage détaillée trouvée pour cette ligne.</p>`;
    }

    const rows = list.map((machine) => `
      <tr>
        <td>${esc(machine.label)}</td>
        <td>${fmtHours(machine.smr)}</td>
        <td>${esc(machine.bull || '—')}</td>
        <td>${esc(machine.exca || '—')}</td>
        <td>${esc(machine.mvm || '—')}</td>
        <td>${fmtPct(machine.travelPct)}</td>
        <td>${fmtHours(machine.travelHours)}</td>
        <td>${esc(machine.best || '—')}</td>
        <td>${Math.round(machine.score || 0)}</td>
      </tr>
    `).join('');

    return `
      <div class="wip-uc-section-title">Données undercarriage par machine</div>
      <div class="wip-uc-modal-summary">
        <div><strong>${list.length}</strong><span>machine(s) avec données</span></div>
        <div><strong>${Math.round(row._undercarriageScore || 0)}</strong><span>score max</span></div>
        <div><strong>${esc(list[0]?.best || '—')}</strong><span>classe prioritaire</span></div>
      </div>
      <div class="wip-uc-modal-table-wrap">
        <table class="wip-uc-modal-table">
          <thead><tr><th>Machine</th><th>SMR</th><th>BULL</th><th>EXCA</th><th>MVM</th><th>Travel %</th><th>Travel h</th><th>Classe</th><th>Score</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function openUndercarriageModal(row) {
    if (!row) return;
    document.getElementById('wip-uc-detail-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'wip-uc-detail-modal';
    modal.innerHTML = `
      <div class="wip-uc-modal-backdrop" data-close="true"></div>
      <div class="wip-uc-modal-card" role="dialog" aria-modal="true" aria-labelledby="wip-uc-modal-title">
        <div class="wip-uc-modal-head">
          <div>
            <div class="wip-uc-modal-kicker">Undercarriage</div>
            <h3 id="wip-uc-modal-title">${esc(clientTitle(row))}</h3>
          </div>
          <button type="button" class="wip-uc-modal-close" data-close="true" aria-label="Fermer">×</button>
        </div>
        <div class="wip-uc-modal-body">${detailsHtml(row)}</div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close="true"]').forEach((button) => button.addEventListener('click', () => modal.remove()));
    document.addEventListener('keydown', function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      modal.remove();
      document.removeEventListener('keydown', closeOnEscape);
    });
  }

  function prepareBadges() {
    document.querySelectorAll('.wip-uc-badge').forEach((badge) => {
      if (badge.dataset.wipUcPrepared === 'true') return;
      const row = findRowFromBadge(badge);
      if (!row) return;
      badge.dataset.wipUcPrepared = 'true';
      badge.dataset.rowIndex = String(row._rowIndex ?? '');
      badge.setAttribute('role', 'button');
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('title', 'Voir uniquement les données undercarriage');
      badge.textContent = `Undercarriage • ${machines(row).length}`;
    });
  }

  function handleBadgeClick(event) {
    const badge = event.target.closest('.wip-uc-badge');
    if (!badge) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const row = findRowFromBadge(badge);
    if (row) openUndercarriageModal(row);
  }

  function installStyles() {
    if (document.getElementById('wip-undercarriage-detail-ui-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-detail-ui-style';
    style.textContent = `
      #wip-undercarriage-integrated-accordion{border:1px solid #e5e7eb!important;border-left:4px solid #eab308!important;border-radius:16px!important;background:linear-gradient(90deg,#fffbeb 0%,#ffffff 58%,#ffffff 100%)!important;box-shadow:none!important;margin:0 0 12px!important;overflow:hidden!important}
      .dark #wip-undercarriage-integrated-accordion{background:linear-gradient(90deg,rgba(234,179,8,.08),rgba(15,23,42,.92))!important;border-color:#334155!important;border-left-color:#eab308!important}
      #wip-undercarriage-integrated-accordion .wip-undercarriage-integrated-summary{min-height:46px!important;padding:0 14px!important;color:#334155!important;font-size:11px!important;font-weight:1000!important;letter-spacing:.055em!important;text-transform:uppercase!important;background:transparent!important}
      .dark #wip-undercarriage-integrated-accordion .wip-undercarriage-integrated-summary{color:#e2e8f0!important}
      #wip-undercarriage-integrated-accordion .wip-undercarriage-integrated-body{border-top:1px solid #e5e7eb!important;background:#ffffff!important;padding:0!important}
      .dark #wip-undercarriage-integrated-accordion .wip-undercarriage-integrated-body{border-top-color:#334155!important;background:#020617!important}
      #wip-undercarriage-integrated-accordion .wip-uc-field{color:#64748b!important}
      #wip-undercarriage-integrated-accordion .wip-uc-field select{border-color:#e5e7eb!important;color:#334155!important;background:#ffffff!important}
      #wip-undercarriage-integrated-accordion .wip-uc-primary{background:#eab308!important;color:#111827!important}
      #wip-undercarriage-integrated-accordion .wip-uc-secondary{background:#ffffff!important;color:#475569!important;border-color:#e5e7eb!important}
      .dark #wip-undercarriage-integrated-accordion .wip-uc-field{color:#94a3b8!important}
      .dark #wip-undercarriage-integrated-accordion .wip-uc-field select{background:#0f172a!important;border-color:#334155!important;color:#e2e8f0!important}
      .wip-uc-badge{cursor:pointer!important;user-select:none!important;transition:transform .15s ease,box-shadow .15s ease!important}
      .wip-uc-badge:hover{transform:translateY(-1px)!important;box-shadow:0 6px 16px rgba(15,23,42,.12)!important}
      #wip-uc-detail-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      .wip-uc-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(5px)}
      .wip-uc-modal-card{position:relative;width:min(1120px,calc(100vw - 32px));max-height:min(82vh,780px);overflow:hidden;border-radius:22px;background:#ffffff;color:#0f172a;border:1px solid #e5e7eb;box-shadow:0 30px 90px rgba(15,23,42,.35);display:flex;flex-direction:column}
      .dark .wip-uc-modal-card{background:#020617;color:#f8fafc;border-color:#334155}
      .wip-uc-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #e5e7eb;background:linear-gradient(90deg,#fffbeb,#ffffff)}
      .dark .wip-uc-modal-head{border-color:#334155;background:linear-gradient(90deg,rgba(234,179,8,.08),#020617)}
      .wip-uc-modal-kicker{font-size:10px;font-weight:1000;letter-spacing:.12em;text-transform:uppercase;color:#ca8a04;margin-bottom:5px}
      .wip-uc-modal-head h3{margin:0;font-size:18px;line-height:1.2;font-weight:1000;color:#111827}.dark .wip-uc-modal-head h3{color:#f8fafc}
      .wip-uc-modal-close{width:34px;height:34px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;color:#334155;font-size:24px;line-height:1;cursor:pointer}.dark .wip-uc-modal-close{background:#0f172a;border-color:#334155;color:#f8fafc}
      .wip-uc-modal-body{padding:18px 20px;overflow:auto}.wip-uc-modal-empty{font-size:13px;color:#64748b;margin:0}
      .wip-uc-section-title{font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin:0 0 12px}.dark .wip-uc-section-title{color:#94a3b8}
      .wip-uc-modal-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}.wip-uc-modal-summary div{border:1px solid #e5e7eb;border-radius:14px;padding:10px 12px;background:#f8fafc}.dark .wip-uc-modal-summary div{border-color:#334155;background:#0f172a}.wip-uc-modal-summary strong{display:block;font-size:19px;color:#111827}.dark .wip-uc-modal-summary strong{color:#f8fafc}.wip-uc-modal-summary span{display:block;margin-top:2px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}
      .wip-uc-modal-table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:16px}.dark .wip-uc-modal-table-wrap{border-color:#334155}.wip-uc-modal-table{width:100%;border-collapse:collapse;font-size:12px}.wip-uc-modal-table th{position:sticky;top:0;background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.08em;text-align:left;padding:10px;border-bottom:1px solid #e5e7eb}.dark .wip-uc-modal-table th{background:#0f172a;border-color:#334155;color:#94a3b8}.wip-uc-modal-table td{padding:10px;border-bottom:1px solid #eef2f7;color:#334155;white-space:nowrap}.dark .wip-uc-modal-table td{border-color:#1e293b;color:#e2e8f0}
      @media(max-width:767px){.wip-uc-modal-summary{grid-template-columns:1fr}.wip-uc-modal-card{width:calc(100vw - 16px);max-height:88vh}.wip-uc-modal-head,.wip-uc-modal-body{padding:14px}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    prepareBadges();
  }

  document.addEventListener('click', handleBadgeClick, true);
  document.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target?.classList?.contains('wip-uc-badge')) handleBadgeClick(event);
  }, true);

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', () => setTimeout(install, 0));
  setTimeout(install, 2000);
})();
