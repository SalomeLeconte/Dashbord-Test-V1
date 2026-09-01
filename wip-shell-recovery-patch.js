(() => {
  const PATCH_ID = 'wip-shell-recovery-2026-09-01-v1';
  if (window.__WIP_SHELL_RECOVERY_PATCH__ === PATCH_ID) return;
  window.__WIP_SHELL_RECOVERY_PATCH__ = PATCH_ID;

  let recoverTimer = 0;
  let recovering = false;

  function installStyle() {
    if (document.getElementById('wip-shell-recovery-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-shell-recovery-style';
    style.textContent = `
      body > header + div.flex.flex-1,
      body > header + div[class*="flex-1"] {
        display:flex!important;
        flex:1 1 0%!important;
        min-height:0!important;
        width:100%!important;
        visibility:visible!important;
        opacity:1!important;
      }
      #filters-panel {
        visibility:visible!important;
        opacity:1!important;
      }
      main {
        display:flex!important;
        flex:1 1 0%!important;
        min-width:0!important;
        min-height:0!important;
        visibility:visible!important;
        opacity:1!important;
      }
      @media (min-width:768px) {
        #filters-panel { display:flex!important; }
      }
    `;
    document.head.appendChild(style);
  }

  function appShell() {
    const header = document.querySelector('body > header');
    if (!header) return null;
    const candidate = header.nextElementSibling;
    if (candidate && candidate.querySelector?.('#filters-panel') && candidate.querySelector?.('main')) return candidate;
    return [...document.body.children].find(node => node.querySelector?.('#filters-panel') && node.querySelector?.('main')) || null;
  }

  function restoreShell() {
    installStyle();
    const shell = appShell();
    const main = document.querySelector('main');
    const filters = document.getElementById('filters-panel');

    if (shell) {
      shell.classList.remove('hidden');
      shell.hidden = false;
      shell.style.setProperty('display', 'flex', 'important');
      shell.style.setProperty('flex', '1 1 0%', 'important');
      shell.style.setProperty('min-height', '0', 'important');
      shell.style.setProperty('width', '100%', 'important');
      shell.style.setProperty('visibility', 'visible', 'important');
      shell.style.setProperty('opacity', '1', 'important');
    }

    if (main) {
      main.classList.remove('hidden');
      main.hidden = false;
      main.style.setProperty('display', 'flex', 'important');
      main.style.setProperty('flex', '1 1 0%', 'important');
      main.style.setProperty('min-height', '0', 'important');
      main.style.setProperty('visibility', 'visible', 'important');
      main.style.setProperty('opacity', '1', 'important');
    }

    if (filters) {
      filters.classList.remove('hidden');
      filters.hidden = false;
      if (window.matchMedia('(min-width:768px)').matches) filters.style.setProperty('display', 'flex', 'important');
      filters.style.setProperty('visibility', 'visible', 'important');
      filters.style.setProperty('opacity', '1', 'important');
    }

    return Boolean(shell && main);
  }

  function hasSelectedPssr() {
    const name = String(document.getElementById('active-user-name')?.textContent || '').trim();
    const indicator = document.getElementById('active-user-indicator');
    if (name) return true;
    if (!indicator) return false;
    const style = getComputedStyle(indicator);
    return style.display !== 'none' && !indicator.classList.contains('hidden');
  }

  async function recoverDataAndRender() {
    restoreShell();
    if (!hasSelectedPssr() || recovering) return;

    recovering = true;
    try {
      let rows = Array.isArray(window.globalData) ? window.globalData : [];
      if (!rows.length && typeof window.loadCSVData === 'function') {
        try { await Promise.resolve(window.loadCSVData()); }
        catch (error) { console.warn('Récupération des données WIP impossible.', error); }
        rows = Array.isArray(window.globalData) ? window.globalData : [];
      }

      restoreShell();

      if (rows.length) {
        try { window.populateFilterOptions?.(); } catch (error) {}
        try {
          if (typeof window.runFilter === 'function') window.runFilter();
          else if (Array.isArray(window.currentFilteredData) && typeof window.renderGrid === 'function') {
            window.renderGrid(window.currentFilteredData);
          }
        } catch (error) {
          console.warn('Relance du rendu WIP impossible.', error);
        }
      }
    } finally {
      recovering = false;
      restoreShell();
    }
  }

  function scheduleRecovery(delay = 0) {
    window.clearTimeout(recoverTimer);
    recoverTimer = window.setTimeout(() => {
      recoverTimer = 0;
      recoverDataAndRender();
    }, delay);
  }

  function wrapSelectionFunction(name) {
    const current = window[name];
    if (typeof current !== 'function' || current.__wipShellRecoveryWrapped) return;

    const wrapped = function wipSelectionWithShellRecovery(...args) {
      restoreShell();
      let result;
      try { result = current.apply(this, args); }
      finally {
        window.requestAnimationFrame(restoreShell);
        scheduleRecovery(40);
        window.setTimeout(restoreShell, 250);
        window.setTimeout(() => scheduleRecovery(0), 900);
      }
      return result;
    };
    wrapped.__wipShellRecoveryWrapped = true;
    window[name] = wrapped;
    try {
      if (name === 'selectSector') selectSector = wrapped;
      if (name === 'bypassSelection') bypassSelection = wrapped;
    } catch (error) {}
  }

  function install() {
    restoreShell();
    wrapSelectionFunction('selectSector');
    wrapSelectionFunction('bypassSelection');
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', () => {
    install();
    scheduleRecovery(0);
  });
  document.addEventListener('dashboard:grid-rendered', restoreShell);
  window.addEventListener('resize', restoreShell);
  window.addEventListener('error', () => window.setTimeout(restoreShell, 0));

  window.setTimeout(install, 300);
  window.setTimeout(() => scheduleRecovery(0), 1200);
  window.setTimeout(() => scheduleRecovery(0), 3000);
})();
