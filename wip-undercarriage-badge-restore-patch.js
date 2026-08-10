(() => {
  const PATCH_ID = 'wip-undercarriage-badge-restore-2026-08-10';
  if (window.__WIP_UNDERCARRIAGE_BADGE_RESTORE_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_BADGE_RESTORE_PATCH__ = PATCH_ID;

  const BADGE_CLASS = 'wip-uc-badge';

  function rowIndexFromButton(button) {
    const match = String(button?.getAttribute?.('onclick') || '').match(/openDetails\((\d+)\)/);
    return match ? Number(match[1]) : NaN;
  }

  function rowForButton(button) {
    const rowIndex = rowIndexFromButton(button);
    if (!Number.isFinite(rowIndex)) return null;
    return (window.globalData || []).find((row) => Number(row?._rowIndex) === rowIndex) || null;
  }

  function applicableMachines(row) {
    if (!row) return [];
    try {
      if (typeof window.__wipBuildUndercarriageMachines === 'function') {
        const list = window.__wipBuildUndercarriageMachines(row) || [];
        if (Array.isArray(list)) return list.filter(Boolean);
      }
    } catch (error) {
      console.warn('Undercarriage badge restore: rebuild failed', error);
    }
    return (Array.isArray(row._undercarriageMachines) ? row._undercarriageMachines : [])
      .filter((machine) => machine && (machine.bull || machine.exca || machine.travelPct || machine.travelHours));
  }

  function badgeHost(button) {
    const direct = button?.parentElement;
    if (direct) return direct;
    return button?.closest?.('td, .flex, .actions, .card, div') || null;
  }

  function ensureBadge(button) {
    const row = rowForButton(button);
    const host = badgeHost(button);
    if (!row || !host) return;

    const list = applicableMachines(row);
    const existing = host.querySelector(`.${BADGE_CLASS}[data-row-index="${row._rowIndex}"]`)
      || host.querySelector(`.${BADGE_CLASS}`);

    if (!list.length) {
      existing?.remove();
      return;
    }

    const badge = existing || document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.dataset.rowIndex = String(row._rowIndex ?? '');
    const label = `Undercarriage • ${list.length}`;
    if (badge.textContent !== label) badge.textContent = label;
    badge.setAttribute('role', 'button');
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('title', 'Voir les données undercarriage');
    if (!existing) button.insertAdjacentElement('afterend', badge);
  }

  function refreshBadges() {
    document.querySelectorAll('button[onclick^="openDetails("]').forEach(ensureBadge);
  }

  function wrapRender(name) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipUndercarriageBadgeRestore) return;
    const wrapped = function undercarriageBadgeRestoreWrapped(...args) {
      const result = current.apply(this, args);
      setTimeout(refreshBadges, 0);
      setTimeout(refreshBadges, 120);
      return result;
    };
    wrapped.__wipUndercarriageBadgeRestore = true;
    window[name] = wrapped;
    try { eval(`${name} = window[name]`); } catch (error) {}
  }

  function installStyle() {
    if (document.getElementById('wip-undercarriage-badge-restore-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-badge-restore-style';
    style.textContent = `
      .wip-uc-badge{display:inline-flex!important;align-items:center!important;width:max-content!important;max-width:100%!important;margin-left:.35rem!important;margin-top:.25rem!important;white-space:nowrap!important;cursor:pointer!important;user-select:none!important}
      .wip-uc-badge:empty{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    ['renderGrid', 'renderTop200', 'runFilter', 'updateVisibleRows'].forEach(wrapRender);
    refreshBadges();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [100, 300, 700, 1200, 2200, 4000, 7000, 11000, 16000, 22000].forEach((delay) => setTimeout(install, delay));
  });
  [150, 450, 900, 1800, 3200, 5200, 8500, 13000, 19000, 26000].forEach((delay) => setTimeout(install, delay));
  try { new MutationObserver(() => setTimeout(refreshBadges, 0)).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
