(() => {
  const PATCH_ID = 'wip-undercarriage-modal-clean-2026-08-10-v3';
  if (window.__WIP_UNDERCARRIAGE_MODAL_CLEAN_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_MODAL_CLEAN_PATCH__ = PATCH_ID;

  const CLASS_SCORE = { AA: 100, AB: 85, BA: 80, AC: 60, BB: 55, CA: 50, BC: 30, CB: 25, CC: 10 };
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const col = (key) => {
    try { return COL?.[key] || ''; } catch (error) { return ''; }
  };

  function rowFromBadge(badge) {
    const explicit = Number(badge?.dataset?.rowIndex || NaN);
    if (Number.isFinite(explicit)) return (globalData || []).find((row) => Number(row?._rowIndex) === explicit) || null;

    const detailButton = badge?.parentElement?.querySelector?.('button[onclick^="openDetails("]')
      || badge?.closest?.('tr, .mobile-card, div')?.querySelector?.('button[onclick^="openDetails("]');
    const match = String(detailButton?.getAttribute('onclick') || '').match(/openDetails\((\d+)\)/);
    const rowIndex = match ? Number(match[1]) : NaN;
    if (!Number.isFinite(rowIndex)) return null;
    badge.dataset.rowIndex = String(rowIndex);
    return (globalData || []).find((row) => Number(row?._rowIndex) === rowIndex) || null;
  }

  function titleFor(row) {
    const name = row?.[col('nom')] || row?.denominationUniteLegale || row?.Nom || row?.Client || 'Client';
    const siret = row?.[col('siret')] || row?.siret || row?.SIRET || '';
    return `${name}${siret ? ` — ${siret}` : ''}`;
  }

  function fmtHours(value) {
    return value ? `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} h` : '—';
  }

  function fmtPct(value) {
    return value ? `${Number(value).toLocaleString('fr-FR')} %` : '—';
  }

  function machineType(machine) {
    if (machine?.bull) return 'BULL / Dozer';
    if (machine?.exca) return 'EXCA';
    return '—';
  }

  function machineClass(machine) {
    return machine?.bull || machine?.exca || machine?.best || '';
  }

  function undercarriageMachines(row) {
    if (!row) return [];
    if (typeof window.__wipBuildUndercarriageMachines === 'function') {
      return window.__wipBuildUndercarriageMachines(row) || [];
    }
    return (Array.isArray(row._undercarriageMachines) ? row._undercarriageMachines : [])
      .map((machine) => ({
        label: machine.label || machine.key || 'Machine',
        smr: Number(machine.smr || 0),
        bull: machine.bull || '',
        exca: machine.exca || '',
        travelPct: Number(machine.travelPct || 0),
        travelHours: Number(machine.travelHours || 0),
        best: machine.bull || machine.exca || machine.best || ''
      }))
      .filter((machine) => machine.bull || machine.exca || machine.travelPct || machine.travelHours);
  }

  function modalHtml(row) {
    const list = undercarriageMachines(row).sort((a, b) => (CLASS_SCORE[machineClass(b)] || 0) - (CLASS_SCORE[machineClass(a)] || 0));
    const best = list.map(machineClass).filter(Boolean).sort((a, b) => (CLASS_SCORE[b] || 0) - (CLASS_SCORE[a] || 0))[0] || '—';
    const rows = list.map((machine) => `
      <tr>
        <td>${esc(machine.label)}</td>
        <td>${fmtHours(machine.smr)}</td>
        <td>${esc(machineType(machine))}</td>
        <td>${esc(machineClass(machine) || '—')}</td>
        <td>${fmtPct(machine.travelPct)}</td>
        <td>${fmtHours(machine.travelHours)}</td>
      </tr>
    `).join('');

    return `
      <div class="wip-uc-clean-kicker">Données undercarriage par machine</div>
      <div class="wip-uc-clean-summary wip-uc-clean-summary-compact">
        <div><strong>${list.length}</strong><span>machine(s) concernée(s)</span></div>
        <div><strong>${esc(best)}</strong><span>classe prioritaire</span></div>
      </div>
      <div class="wip-uc-clean-table-wrap">
        <table class="wip-uc-clean-table">
          <thead><tr><th>Machine / modèle</th><th>SMR</th><th>Type</th><th>Classe</th><th>Travel %</th><th>Travel h</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6">Aucune machine concernée par les règles undercarriage.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  function openCleanModal(row) {
    if (!row) return;
    document.getElementById('wip-uc-clean-modal')?.remove();
    document.getElementById('wip-uc-model-rules-modal')?.remove();
    document.querySelectorAll('#details-modal.open,#detail-modal.open,.modal.open').forEach((modal) => {
      if (!modal.id || /detail/i.test(modal.id)) modal.classList.remove('open');
    });

    const modal = document.createElement('div');
    modal.id = 'wip-uc-clean-modal';
    modal.innerHTML = `
      <div class="wip-uc-clean-backdrop" data-wip-uc-clean-close="true"></div>
      <section class="wip-uc-clean-card" role="dialog" aria-modal="true" aria-labelledby="wip-uc-clean-title">
        <header class="wip-uc-clean-head">
          <div>
            <div class="wip-uc-clean-label">Undercarriage</div>
            <h3 id="wip-uc-clean-title">${esc(titleFor(row))}</h3>
          </div>
          <button type="button" class="wip-uc-clean-close" data-wip-uc-clean-close="true" aria-label="Fermer">×</button>
        </header>
        <div class="wip-uc-clean-body">${modalHtml(row)}</div>
      </section>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-wip-uc-clean-close="true"]').forEach((button) => button.addEventListener('click', () => modal.remove()));
  }

  function handleBadgeClick(event) {
    const badge = event.target?.closest?.('.wip-uc-badge');
    if (!badge) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const row = rowFromBadge(badge);
    if (row) openCleanModal(row);
  }

  function prepareBadges() {
    document.querySelectorAll('.wip-uc-badge').forEach((badge) => {
      const row = rowFromBadge(badge);
      const list = row ? undercarriageMachines(row) : [];
      if (!row || !list.length) {
        badge.remove();
        return;
      }
      badge.dataset.rowIndex = String(row._rowIndex ?? '');
      badge.textContent = `Undercarriage • ${list.length}`;
      badge.setAttribute('role', 'button');
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('title', 'Voir uniquement les données undercarriage');
    });
  }

  function installStyles() {
    if (document.getElementById('wip-undercarriage-modal-clean-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-modal-clean-style';
    style.textContent = `
      .wip-uc-badge{cursor:pointer!important;user-select:none!important}
      #wip-uc-clean-modal{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      .wip-uc-clean-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(5px)}
      .wip-uc-clean-card{position:relative;width:min(980px,calc(100vw - 32px));max-height:min(82vh,760px);overflow:hidden;border-radius:22px;background:#fff;color:#0f172a;border:1px solid #e5e7eb;box-shadow:0 30px 90px rgba(15,23,42,.35);display:flex;flex-direction:column}
      .dark .wip-uc-clean-card{background:#020617;color:#f8fafc;border-color:#334155}
      .wip-uc-clean-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #e5e7eb;background:linear-gradient(90deg,#fffbeb,#fff)}
      .dark .wip-uc-clean-head{border-color:#334155;background:linear-gradient(90deg,rgba(234,179,8,.08),#020617)}
      .wip-uc-clean-label,.wip-uc-clean-kicker{font-size:10px;font-weight:1000;letter-spacing:.12em;text-transform:uppercase;color:#ca8a04;margin-bottom:5px}
      .wip-uc-clean-kicker{color:#64748b;margin:0 0 12px}.dark .wip-uc-clean-kicker{color:#94a3b8}
      .wip-uc-clean-head h3{margin:0;font-size:18px;line-height:1.2;font-weight:1000;color:#111827}.dark .wip-uc-clean-head h3{color:#f8fafc}
      .wip-uc-clean-close{width:34px;height:34px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;color:#334155;font-size:24px;line-height:1;cursor:pointer}.dark .wip-uc-clean-close{background:#0f172a;border-color:#334155;color:#f8fafc}
      .wip-uc-clean-body{padding:18px 20px;overflow:auto}
      .wip-uc-clean-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}.wip-uc-clean-summary div{border:1px solid #e5e7eb;border-radius:14px;padding:10px 12px;background:#f8fafc}.dark .wip-uc-clean-summary div{border-color:#334155;background:#0f172a}.wip-uc-clean-summary strong{display:block;font-size:19px;color:#111827}.dark .wip-uc-clean-summary strong{color:#f8fafc}.wip-uc-clean-summary span{display:block;margin-top:2px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}
      .wip-uc-clean-table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:16px}.dark .wip-uc-clean-table-wrap{border-color:#334155}.wip-uc-clean-table{width:100%;border-collapse:collapse;font-size:12px}.wip-uc-clean-table th{position:sticky;top:0;background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.08em;text-align:left;padding:10px;border-bottom:1px solid #e5e7eb}.dark .wip-uc-clean-table th{background:#0f172a;border-color:#334155;color:#94a3b8}.wip-uc-clean-table td{padding:10px;border-bottom:1px solid #eef2f7;color:#334155;white-space:nowrap}.dark .wip-uc-clean-table td{border-color:#1e293b;color:#e2e8f0}
      @media(max-width:767px){.wip-uc-clean-summary{grid-template-columns:1fr}.wip-uc-clean-card{width:calc(100vw - 16px);max-height:88vh}.wip-uc-clean-head,.wip-uc-clean-body{padding:14px}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    prepareBadges();
  }

  window.addEventListener('click', handleBadgeClick, true);
  window.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target?.classList?.contains('wip-uc-badge')) handleBadgeClick(event);
  }, true);

  install();
  document.addEventListener('DOMContentLoaded', () => [150, 500, 1200, 2500, 5000, 9000].forEach((delay) => setTimeout(install, delay)));
  [150, 500, 1200, 2500, 5000, 9000, 14000].forEach((delay) => setTimeout(install, delay));
  try { new MutationObserver(() => setTimeout(install, 0)).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
