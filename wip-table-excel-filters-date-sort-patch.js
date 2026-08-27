(() => {
  const ID = 'wip-table-excel-filters-date-sort-2026-08-07';
  if (window.__WIP_TABLE_EXCEL_FILTERS_DATE_SORT_PATCH__ === ID) return;
  window.__WIP_TABLE_EXCEL_FILTERS_DATE_SORT_PATCH__ = ID;

  const DEFAULT_DATA_SORT = 'caGlobalDesc';
  const state = window.__wipTableQuickFilterState || {
    data: { clientText: '', clientKind: '', locText: '', caSort: DEFAULT_DATA_SORT, caMin: 0, nbFilter: '', nbSort: '', priority: '' },
    top: { clientText: '', clientKind: '', locText: '', caSort: '', caMin: 0, nbFilter: '', nbSort: '', visitsFilter: '', visitsSort: '', priority: '' }
  };
  window.__wipTableQuickFilterState = state;

  const cfg = {
    data: [
      ['#view-table', /^client\s*\/\s*prospect/i, 'client', 'Client / Prospect'],
      ['#view-table', /^localisation/i, 'loc', 'Localisation'],
      ['#view-table', /^indicateur\s+financier/i, 'ca', 'CA Global'],
      ['#view-table', /^flotte\s+identifiee|^flotte\s+identifiée/i, 'machines', 'NB machines']
    ],
    top: [
      ['#view-top200', /^client\s*\/\s*prospect/i, 'client', 'Client / Prospect'],
      ['#view-top200', /^localisation/i, 'loc', 'Localisation'],
      ['#view-top200', /^ca\s+2025\s*\/\s*ca\s+2026/i, 'ca', 'CA 2025 / CA 2026'],
      ['#view-top200', /^nb\s+machines/i, 'machines', 'NB machines'],
      ['#view-top200', /^visites\s+2026/i, 'visits', 'Visites 2026'],
      ['#view-top200', /^priorites|^priorités/i, 'priorities', 'Priorités']
    ]
  };

  const deburr = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const norm = v => { try { if (typeof normalizeText === 'function') return normalizeText(v); } catch(e) {} return deburr(v).toLowerCase().trim(); };
  const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const col = k => { try { return COL?.[k] || ''; } catch(e) { return ''; } };
  const num = v => { try { if (typeof parseNumber === 'function') return parseNumber(v); } catch(e) {} const n = Number(String(v ?? '').replace(/\s/g, '').replace(/€/g, '').replace(',', '.').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };

  function amount(row, year = 'total') {
    try { if (typeof getAmount === 'function') return getAmount(row, 'GLOBAL', year); } catch(e) {}
    if (year === '2025') return num(row?.[col('ca2025')] || row?.['CA FY 2025']);
    if (year === '2026') return num(row?.['Total Montant Facturé PDR FY 2026']) + num(row?.['Total Montant Facturé SERVICE FY 2026']);
    return num(row?.['Total Montant Facturé PDR FY 24-25-26']) + num(row?.['Total Montant Facturé SERVICE FY 24-25-26']) || num(row?.[col('caGlobal')] || row?.['CA Global']);
  }
  function nbMachines(row) { return num(row?.[col('nbMachines')] || row?.['Nb Machines/client'] || row?.['Somme de .Nb Machines/clients']); }
  function visits(row) { try { if (typeof getVisits2026 === 'function') return getVisits2026(row); } catch(e) {} return num(row?.[col('visits2026')] || row?.['Somme de VISITE FY 2026']); }
  function remaining(row) { try { if (typeof getRemainingVisits === 'function') return getRemainingVisits(row); } catch(e) {} return 0; }
  function rank(row) { try { if (typeof getTop200Rank === 'function') return getTop200Rank(row); } catch(e) {} return Number.POSITIVE_INFINITY; }
  function isClient(row) { const v = norm(row?.[col('position')] || row?.['Client_Irium.Position client'] || ''); return v === 'cl' || v.includes('client'); }
  function isProspect(row) { const v = norm(row?.[col('position')] || row?.['Client_Irium.Position client'] || ''); return v === 'pr' || v.includes('prospect') || v.includes('suspect') || v === 'sc' || v === 'av'; }
  function eligible(row) { try { if (typeof isGrandCompte === 'function') return isGrandCompte(row); } catch(e) {} return num(row?.['.Client éligible'] || row?.['Somme de .Client éligible']) === 1; }
  function recent(row) { try { if (typeof hasNewMachine === 'function') return hasNewMachine(row); } catch(e) {} return !!String(row?.['.Machines récentes/client'] || row?.[col('machinesRecentes')] || '').trim(); }
  function oldMachine(row) { try { if (typeof hasOldMachine === 'function') return hasOldMachine(row); } catch(e) {} return !!String(row?.['.Machines ancienne/client'] || row?.[col('ageMachineAll')] || '').trim(); }
  function warranty(row) { try { if (typeof hasWarrantyEnding === 'function') return hasWarrantyEnding(row); } catch(e) {} return !!String(row?.[col('finGarantie')] || row?.['Machines fin garantie par client'] || '').trim(); }

  function pass(row, table) {
    const s = state[table];
    if (s.clientKind === 'client' && !isClient(row)) return false;
    if (s.clientKind === 'prospect' && !isProspect(row)) return false;
    if (s.clientText) {
      const h = norm([row?.[col('nom')], row?.[col('siret')], row?.[col('clientNumero')], row?.[col('position')], row?.[col('groupe')], row?.[col('categorie')]].join(' '));
      if (!h.includes(norm(s.clientText))) return false;
    }
    if (s.locText) {
      const h = norm([row?._deptNorm, row?.[col('dept')], row?.[col('ville')], row?.[col('adresse')], row?.[col('agence')], row?.Canton, row?.['Canton (Nom)'], row?.['Client_Irium.Canton']].join(' '));
      if (!h.includes(norm(s.locText))) return false;
    }
    if (s.caMin && amount(row, table === 'top' ? '2025' : 'total') < num(s.caMin)) return false;
    const nb = nbMachines(row);
    if (s.nbFilter === '0' && nb !== 0) return false;
    if (s.nbFilter === '1-2' && !(nb >= 1 && nb <= 2)) return false;
    if (s.nbFilter === '3-5' && !(nb >= 3 && nb <= 5)) return false;
    if (s.nbFilter === '5+' && nb < 5) return false;
    if (s.priority === 'top20' && rank(row) > 20) return false;
    if (s.priority === 'eligible' && !eligible(row)) return false;
    if (s.priority === 'new' && !recent(row)) return false;
    if (s.priority === 'old' && !oldMachine(row)) return false;
    if (s.priority === 'warranty' && !warranty(row)) return false;
    if (s.priority === 'todo' && remaining(row) <= 0) return false;
    if (table === 'top') {
      const v = visits(row);
      if (s.visitsFilter === '0' && v !== 0) return false;
      if (s.visitsFilter === '1+' && v < 1) return false;
      if (s.visitsFilter === '2+' && v < 2) return false;
      if (s.visitsFilter === 'todo' && remaining(row) <= 0) return false;
      if (s.visitsFilter === 'done' && remaining(row) !== 0) return false;
    }
    return true;
  }

  function sortRows(rows, table) {
    const s = state[table], r = [...rows];
    const by = f => (a, b) => f(b) - f(a);
    const byAsc = f => (a, b) => f(a) - f(b);
    if (s.nbSort === 'nbDesc') return r.sort(by(nbMachines));
    if (s.nbSort === 'nbAsc') return r.sort(byAsc(nbMachines));
    if (table === 'top') {
      if (s.visitsSort === 'visitsDesc') return r.sort(by(visits));
      if (s.visitsSort === 'visitsAsc') return r.sort(byAsc(visits));
    }
    const sort = s.caSort || (table === 'data' ? DEFAULT_DATA_SORT : '');
    if (sort === 'caGlobalAsc') return r.sort(byAsc(x => amount(x, 'total')));
    if (sort === 'ca2025Desc') return r.sort(by(x => amount(x, '2025')));
    if (sort === 'ca2026Desc') return r.sort(by(x => amount(x, '2026')));
    if (sort === 'caGlobalDesc') return r.sort(by(x => amount(x, 'total')));
    return r;
  }
  const apply = (rows, table) => sortRows((Array.isArray(rows) ? rows : []).filter(row => pass(row, table)), table);

  function resetColumn(table, key) {
    const s = state[table];
    if (key === 'client') { s.clientText = ''; s.clientKind = ''; }
    if (key === 'loc') s.locText = '';
    if (key === 'ca') { s.caMin = 0; s.caSort = table === 'data' ? DEFAULT_DATA_SORT : ''; }
    if (key === 'machines') { s.nbFilter = ''; s.nbSort = ''; }
    if (key === 'visits') { s.visitsFilter = ''; s.visitsSort = ''; }
    if (key === 'priorities') s.priority = '';
  }
  function resetAll() {
    Object.assign(state.data, { clientText: '', clientKind: '', locText: '', caSort: DEFAULT_DATA_SORT, caMin: 0, nbFilter: '', nbSort: '', priority: '' });
    Object.assign(state.top, { clientText: '', clientKind: '', locText: '', caSort: '', caMin: 0, nbFilter: '', nbSort: '', visitsFilter: '', visitsSort: '', priority: '' });
    window.__wipGridTransformVersion = Number(window.__wipGridTransformVersion || 0) + 1;
  }
  function active(table, key) {
    const s = state[table];
    if (key === 'client') return !!(s.clientText || s.clientKind);
    if (key === 'loc') return !!s.locText;
    if (key === 'ca') return !!(s.caMin || (s.caSort && !(table === 'data' && s.caSort === DEFAULT_DATA_SORT)));
    if (key === 'machines') return !!(s.nbFilter || s.nbSort);
    if (key === 'visits') return !!(s.visitsFilter || s.visitsSort);
    if (key === 'priorities') return !!s.priority;
    return false;
  }

  function btn(label, action, value = '') { return `<button type="button" class="wip-filter-option" data-action="${action}" data-value="${esc(value)}">${label}</button>`; }
  function menuHTML(table, key) {
    const s = state[table];
    if (key === 'client') return `<div class="wip-filter-title">Client / Prospect</div><input class="wip-filter-input" data-field="clientText" placeholder="Nom, SIRET, n° client..." value="${esc(s.clientText)}"><div class="wip-filter-grid">${btn('Clients','clientKind','client')}${btn('Prospects','clientKind','prospect')}${btn('Tous statuts','clientKind','')}</div><div class="wip-filter-actions">${btn('Appliquer','apply')}${btn('Effacer','reset')}</div>`;
    if (key === 'loc') return `<div class="wip-filter-title">Localisation</div><input class="wip-filter-input" data-field="locText" placeholder="Dépt, ville, agence, adresse..." value="${esc(s.locText)}"><div class="wip-filter-actions">${btn('Appliquer','apply')}${btn('Effacer','reset')}</div>`;
    if (key === 'ca') return `<div class="wip-filter-title">CA</div><div class="wip-filter-stack">${btn('Trier CA Global décroissant','caSort','caGlobalDesc')}${btn('Trier CA Global croissant','caSort','caGlobalAsc')}${btn('Trier CA 2025 décroissant','caSort','ca2025Desc')}${btn('Trier CA 2026 décroissant','caSort','ca2026Desc')}</div><div class="wip-filter-grid mt-2">${btn('CA ≥ 10k€','caMin','10000')}${btn('CA ≥ 50k€','caMin','50000')}${btn('CA ≥ 100k€','caMin','100000')}${btn('Sans seuil','caMin','0')}</div><div class="wip-filter-note">Données est trié par défaut en CA Global décroissant.</div><div class="wip-filter-actions">${btn('Effacer colonne','reset')}</div>`;
    if (key === 'machines') return `<div class="wip-filter-title">NB machines</div><div class="wip-filter-stack">${btn('Trier machines décroissant','nbSort','nbDesc')}${btn('Trier machines croissant','nbSort','nbAsc')}</div><div class="wip-filter-grid mt-2">${btn('0','nbFilter','0')}${btn('1 à 2','nbFilter','1-2')}${btn('3 à 5','nbFilter','3-5')}${btn('5+','nbFilter','5+')}${btn('Tous','nbFilter','')}</div><div class="wip-filter-actions">${btn('Effacer colonne','reset')}</div>`;
    if (key === 'visits') return `<div class="wip-filter-title">Visites 2026</div><div class="wip-filter-stack">${btn('Trier visites décroissant','visitsSort','visitsDesc')}${btn('Trier visites croissant','visitsSort','visitsAsc')}</div><div class="wip-filter-grid mt-2">${btn('0 visite','visitsFilter','0')}${btn('1+','visitsFilter','1+')}${btn('2+','visitsFilter','2+')}${btn('Reste à faire','visitsFilter','todo')}${btn('Terminé','visitsFilter','done')}${btn('Tous','visitsFilter','')}</div><div class="wip-filter-actions">${btn('Effacer colonne','reset')}</div>`;
    if (key === 'priorities') return `<div class="wip-filter-title">Priorités</div><div class="wip-filter-stack">${btn('Top 20','priority','top20')}${btn('Client éligible','priority','eligible')}${btn('Machine récente','priority','new')}${btn('Machine 5 ans+','priority','old')}${btn('Fin garantie','priority','warranty')}${btn('Visite restante','priority','todo')}${btn('Toutes priorités','priority','')}</div><div class="wip-filter-actions">${btn('Effacer colonne','reset')}</div>`;
    return '';
  }

  function refresh() {
    window.__wipGridTransformVersion = Number(window.__wipGridTransformVersion || 0) + 1;
    try { if (typeof renderTop200 === 'function') renderTop200(); } catch(e) {}
    try { if (typeof renderGrid === 'function') renderGrid(currentFilteredData || globalData || []); } catch(e) {}
    updateBadges();
  }
  function closeMenu() { document.getElementById('wip-column-filter-menu')?.remove(); }
  function openMenu(button) {
    closeMenu();
    const table = button.dataset.table, key = button.dataset.key;
    const rect = button.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'wip-column-filter-menu';
    menu.dataset.table = table; menu.dataset.key = key;
    menu.className = 'wip-column-filter-menu';
    menu.innerHTML = menuHTML(table, key);
    document.body.appendChild(menu);
    const width = Math.min(310, window.innerWidth - 24);
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.min(Math.max(12, rect.left - width + rect.width + 8), window.innerWidth - width - 12)}px`;
    menu.style.top = `${Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menu.offsetHeight - 12))}px`;
    menu.querySelectorAll('.wip-filter-input').forEach(input => {
      input.addEventListener('input', () => { state[table][input.dataset.field] = input.value.trim(); });
      input.addEventListener('keydown', event => { if (event.key === 'Enter') { closeMenu(); refresh(); } });
    });
    menu.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => {
      const action = b.dataset.action, value = b.dataset.value || '';
      if (action === 'reset') resetColumn(table, key);
      else if (action !== 'apply') state[table][action] = action === 'caMin' ? num(value) : value;
      closeMenu(); refresh();
    }));
  }

  function installHeaders() {
    Object.entries(cfg).forEach(([table, defs]) => defs.forEach(([rootSel, rx, key, label]) => {
      const root = document.querySelector(rootSel); if (!root) return;
      const th = [...root.querySelectorAll('thead th')].find(cell => rx.test(deburr(cell.textContent || '').trim()));
      if (!th || th.querySelector(`.wip-col-filter-btn[data-table="${table}"][data-key="${key}"]`)) return;
      const text = (th.textContent || '').trim();
      th.textContent = ''; th.classList.add('wip-col-filter-th');
      const span = document.createElement('span');
      span.className = 'wip-col-filter-wrap';
      span.innerHTML = `<span class="wip-col-filter-label">${esc(text)}</span><button type="button" class="wip-col-filter-btn" data-table="${table}" data-key="${key}" aria-label="Filtrer ${esc(label)}" title="Filtrer / trier">▾</button>`;
      th.appendChild(span);
    }));
    updateBadges();
  }
  function updateBadges() { document.querySelectorAll('.wip-col-filter-btn').forEach(b => b.classList.toggle('is-active', active(b.dataset.table, b.dataset.key))); }

  function installStyles() {
    if (document.getElementById('wip-excel-filter-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-excel-filter-style';
    style.textContent = `.wip-col-filter-th{white-space:nowrap;vertical-align:middle!important}.wip-col-filter-wrap{display:inline-flex;align-items:center;gap:.35rem;min-width:0}.wip-col-filter-label{min-width:0;overflow:hidden;text-overflow:ellipsis}.wip-col-filter-btn{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:7px;border:1px solid rgba(148,163,184,.35);background:rgba(255,255,255,.82);color:#475569;font-size:12px;font-weight:900;line-height:1;box-shadow:0 3px 10px rgba(15,23,42,.06);transition:all .16s ease}.dark .wip-col-filter-btn{background:rgba(15,23,42,.92);border-color:rgba(71,85,105,.85);color:#cbd5e1}.wip-col-filter-btn:hover,.wip-col-filter-btn.is-active{border-color:#eab308;color:#92400e;background:#fef3c7}.dark .wip-col-filter-btn:hover,.dark .wip-col-filter-btn.is-active{background:rgba(234,179,8,.20);color:#fde68a;border-color:rgba(234,179,8,.65)}.wip-column-filter-menu{position:fixed;z-index:22000;border:1px solid rgba(203,213,225,.95);border-radius:16px;background:rgba(255,255,255,.98);box-shadow:0 24px 70px rgba(15,23,42,.22);padding:12px;color:#334155;font-size:12px;backdrop-filter:blur(14px)}.dark .wip-column-filter-menu{background:rgba(2,6,23,.98);border-color:#334155;color:#e2e8f0}.wip-filter-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:1000;color:#92400e;margin-bottom:8px}.dark .wip-filter-title{color:#facc15}.wip-filter-input{width:100%;border:1px solid #e2e8f0;border-radius:11px;padding:9px 10px;font-size:12px;font-weight:700;outline:none;background:#fff;color:#0f172a;margin-bottom:9px}.dark .wip-filter-input{background:#020617;border-color:#334155;color:#f8fafc}.wip-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.wip-filter-stack{display:flex;flex-direction:column;gap:6px}.wip-filter-option{border:1px solid #e5e7eb;border-radius:10px;padding:8px 9px;background:#f8fafc;color:#334155;text-align:left;font-size:11px;font-weight:900;transition:all .15s ease}.wip-filter-option:hover{border-color:#eab308;background:#fef3c7;color:#78350f}.dark .wip-filter-option{background:#0f172a;border-color:#334155;color:#cbd5e1}.dark .wip-filter-option:hover{background:rgba(234,179,8,.18);border-color:#eab308;color:#fde68a}.wip-filter-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:10px}.wip-filter-note{margin-top:8px;font-size:10px;color:#64748b;font-weight:700}.mt-2{margin-top:.5rem}@media(max-width:767px){.wip-column-filter-menu{left:10px!important;right:10px!important;width:auto!important;max-width:none}.wip-col-filter-btn{width:22px;height:22px}}`;
    document.head.appendChild(style);
  }

  function setCsvDateLabel() {
    const tab = document.getElementById('tab-table'); if (!tab) return;
    const dateKey = 'wipData11CsvDateLabel', etagKey = 'wipData11CsvEtag';
    const applyLabel = label => { if (label) tab.textContent = `Données ${label}`; };
    const cached = localStorage.getItem(dateKey); if (cached) applyLabel(cached);
    fetch('./data11.csv', { method: 'HEAD', cache: 'no-store' }).then(r => {
      const lm = r.headers.get('last-modified'), etag = r.headers.get('etag') || '';
      if (lm) {
        const d = new Date(lm);
        if (!Number.isNaN(d.getTime())) {
          const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
          localStorage.setItem(dateKey, label); if (etag) localStorage.setItem(etagKey, etag); applyLabel(label); return;
        }
      }
      if (etag && etag !== localStorage.getItem(etagKey)) {
        const d = new Date(), label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
        localStorage.setItem(dateKey, label); localStorage.setItem(etagKey, etag); applyLabel(label);
      }
    }).catch(() => { if (cached) applyLabel(cached); });
  }

  function wrap(name, fn) {
    const old = window[name]; if (typeof old !== 'function' || old.__wipExcelFilterWrapped) return;
    const next = function(...args) { return fn.call(this, old, args); };
    next.__wipExcelFilterWrapped = true;
    window[name] = next;
    try { if (name === 'renderGrid') renderGrid = next; if (name === 'getTop200Data') getTop200Data = next; if (name === 'updateDataTabLabel') updateDataTabLabel = next; if (name === 'selectSector') selectSector = next; if (name === 'resetSectorFilter') resetSectorFilter = next; if (name === 'resetFilterControlsOnly') resetFilterControlsOnly = next; } catch(e) {}
  }
  function installWraps() {
    if (window.renderGrid?.__wipPerformanceGridLimit) {
      window.__wipRegisterGridDataTransform?.('excel-column-filters', rows => apply(rows, 'data'));
    } else {
      wrap('renderGrid', (old, args) => old.call(this, apply(args[0], 'data'), ...args.slice(1)));
    }
    wrap('getTop200Data', (old, args) => apply(old.apply(this, args), 'top'));
    wrap('updateDataTabLabel', () => setCsvDateLabel());
    wrap('selectSector', (old, args) => { resetAll(); const r = old.apply(this, args); setCsvDateLabel(); setTimeout(() => { installHeaders(); updateBadges(); }, 80); return r; });
    wrap('resetSectorFilter', (old, args) => { resetAll(); const r = old.apply(this, args); setCsvDateLabel(); return r; });
    wrap('resetFilterControlsOnly', (old, args) => { resetAll(); const r = old.apply(this, args); setCsvDateLabel(); return r; });
  }
  function install() { installStyles(); installWraps(); installHeaders(); setCsvDateLabel(); }

  document.addEventListener('click', e => {
    const b = e.target.closest?.('.wip-col-filter-btn');
    if (b) { e.preventDefault(); e.stopPropagation(); openMenu(b); return; }
    if (!e.target.closest?.('#wip-column-filter-menu')) closeMenu();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  install(); document.addEventListener('DOMContentLoaded', install); [150,400,900,1600,2600,4200,6800].forEach(ms => setTimeout(install, ms));
})();
