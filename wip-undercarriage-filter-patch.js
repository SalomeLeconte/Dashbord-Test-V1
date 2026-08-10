(() => {
  const PATCH_ID = 'wip-undercarriage-filter-2026-08-10-v2';
  if (window.__WIP_UNDERCARRIAGE_FILTER_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_FILTER_PATCH__ = PATCH_ID;

  const GROUPS = {
    very: new Set(['AA']),
    high: new Set(['AA', 'AB', 'BA']),
    watch: new Set(['AC', 'BB', 'CA']),
    low: new Set(['BC', 'CB', 'CC'])
  };
  const SCORE = { AA: 100, AB: 85, BA: 80, AC: 60, BB: 55, CA: 50, BC: 30, CB: 25, CC: 10 };
  const state = window.__wipUnderCarriageState || { enabled: false, type: '', cls: '', priority: '', smrMin: 0, activityMin: 0, travelPctMin: 0, travelHoursMin: 0, sort: false };
  window.__wipUnderCarriageState = state;

  const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = v => {
    try { if (typeof parseNumber === 'function') return parseNumber(v); } catch (e) {}
    const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.').replace(/%|h|€|EUR/gi, '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const get = (row, names) => names.map(n => row?.[n]).find(v => v !== undefined && String(v).trim() !== '') || '';
  const COLS = {
    smr: ['data22.Machines SMR par client', 'Machines SMR par client'],
    bull: ['data22.Class BULL par client', 'Class BULL par client'],
    exca: ['data22.Class EXCA par client', 'Class EXCA par client'],
    mvm: ['data22.Class MVM par client', 'Class MVM par client'],
    travelPct: ['data22.travel pct exca par client', 'travel pct exca par client'],
    travelHours: ['data22.travel hours exca par client', 'travel hours exca par client']
  };

  function entries(value) {
    return String(value ?? '').split(/\s*[;\n]\s*/).map((entry, i) => {
      const clean = entry.trim();
      if (!clean || /^nan$/i.test(clean)) return null;
      const m = clean.match(/^(.+?)\s*(?:-|:|→|=>)\s*(.+)$/);
      return m ? { key: m[1].trim(), value: m[2].trim(), index: i } : { key: `machine_${i + 1}`, value: clean, index: i };
    }).filter(Boolean);
  }
  function mapEntries(value) {
    const map = new Map();
    entries(value).forEach(entry => map.set(entry.key || `machine_${entry.index + 1}`, entry.value));
    return map;
  }
  function cls(value) {
    const m = String(value ?? '').toUpperCase().match(/\b(AA|AB|AC|BA|BB|BC|CA|CB|CC)\b/);
    return m ? m[1] : '';
  }
  function classActivity(value) {
    const first = String(value || '')[0];
    if (first === 'A') return 80;
    if (first === 'B') return 50;
    return 0;
  }
  function classSmr(value) {
    const second = String(value || '')[1];
    if (second === 'A') return 9000;
    if (second === 'B') return 5000;
    return 0;
  }

  function machines(row) {
    if (!row) return [];
    if (Array.isArray(row._undercarriageMachines)) return row._undercarriageMachines;
    const maps = {
      smr: mapEntries(get(row, COLS.smr)),
      bull: mapEntries(get(row, COLS.bull)),
      exca: mapEntries(get(row, COLS.exca)),
      mvm: mapEntries(get(row, COLS.mvm)),
      travelPct: mapEntries(get(row, COLS.travelPct)),
      travelHours: mapEntries(get(row, COLS.travelHours))
    };
    const keys = new Set();
    Object.values(maps).forEach(map => map.forEach((_, key) => keys.add(key)));
    const parsed = [...keys].map(key => {
      const bull = cls(maps.bull.get(key));
      const exca = cls(maps.exca.get(key));
      const mvm = cls(maps.mvm.get(key));
      const classes = [bull, exca, mvm].filter(Boolean);
      const best = classes.sort((a, b) => (SCORE[b] || 0) - (SCORE[a] || 0))[0] || '';
      const smr = num(maps.smr.get(key));
      const travelPct = num(maps.travelPct.get(key));
      const travelHours = num(maps.travelHours.get(key));
      const score = Math.max(SCORE[best] || 0, smr >= 9000 ? 35 : smr >= 5000 ? 20 : 0, travelPct >= 70 ? 35 : travelPct >= 50 ? 24 : travelPct >= 30 ? 12 : 0, travelHours >= 500 ? 20 : travelHours >= 250 ? 12 : travelHours >= 100 ? 7 : 0);
      return { key, label: key.replace(/^machine_\d+$/, 'Machine'), smr, bull, exca, mvm, travelPct, travelHours, best, score, hasData: !!(smr || bull || exca || mvm || travelPct || travelHours) };
    }).filter(m => m.hasData);
    row._undercarriageMachines = parsed;
    row._undercarriageCount = parsed.length;
    row._undercarriageScore = parsed.reduce((max, machine) => Math.max(max, machine.score || 0), 0);
    return parsed;
  }

  function selectedClass(machine) {
    if (state.type === 'BULL') return [machine.bull].filter(Boolean);
    if (state.type === 'EXCA') return [machine.exca].filter(Boolean);
    if (state.type === 'MVM') return [machine.mvm].filter(Boolean);
    return [machine.bull, machine.exca, machine.mvm].filter(Boolean);
  }
  function active() { return !!(state.enabled || state.type || state.cls || state.priority || state.smrMin || state.activityMin || state.travelPctMin || state.travelHoursMin || state.sort); }
  function machinePass(machine) {
    const classes = selectedClass(machine);
    if (state.type === 'BULL' && !machine.bull) return false;
    if (state.type === 'EXCA' && !(machine.exca || machine.travelPct || machine.travelHours)) return false;
    if (state.type === 'MVM' && !machine.mvm) return false;
    if (state.cls && !classes.includes(state.cls)) return false;
    if (state.priority && !classes.some(value => GROUPS[state.priority]?.has(value))) return false;
    const inferredSmr = Math.max(machine.smr || 0, ...classes.map(classSmr));
    const inferredActivity = state.type === 'EXCA' && machine.travelPct ? machine.travelPct : Math.max(machine.travelPct || 0, ...classes.map(classActivity));
    if (state.smrMin && inferredSmr < state.smrMin) return false;
    if (state.activityMin && inferredActivity < state.activityMin) return false;
    if (state.travelPctMin && machine.travelPct < state.travelPctMin) return false;
    if (state.travelHoursMin && machine.travelHours < state.travelHoursMin) return false;
    return true;
  }
  function rowPass(row) {
    const list = machines(row);
    if (!active()) return true;
    if (state.enabled && !list.length) return false;
    if (state.type || state.cls || state.priority || state.smrMin || state.activityMin || state.travelPctMin || state.travelHoursMin) return list.some(machinePass);
    return true;
  }
  function apply(rows) {
    const filtered = (Array.isArray(rows) ? rows : []).filter(rowPass);
    return state.sort ? filtered.sort((a, b) => (b._undercarriageScore || 0) - (a._undercarriageScore || 0)) : filtered;
  }

  function syncState() {
    const root = document.getElementById('wip-undercarriage-filter');
    if (!root) return;
    state.enabled = !!root.querySelector('[data-uc="enabled"]')?.checked;
    state.type = root.querySelector('[data-uc="type"]')?.value || '';
    state.cls = root.querySelector('[data-uc="class"]')?.value || '';
    state.priority = root.querySelector('[data-uc="priority"]')?.value || '';
    state.smrMin = Number(root.querySelector('[data-uc="smr"]')?.value || 0);
    state.activityMin = Number(root.querySelector('[data-uc="activity"]')?.value || 0);
    state.travelPctMin = Number(root.querySelector('[data-uc="travelPct"]')?.value || 0);
    state.travelHoursMin = Number(root.querySelector('[data-uc="travelHours"]')?.value || 0);
    state.sort = !!root.querySelector('[data-uc="sort"]')?.checked;
    try { window.__wipSyncUndercarriageRangeUi?.(); } catch (error) {}
  }
  function refresh() {
    try { if (typeof runFilter === 'function') runFilter(); } catch (e) {}
    try { if (typeof renderTop200 === 'function') renderTop200(); } catch (e) {}
    window.setTimeout(addBadges, 100);
  }
  const opt = (v, l) => `<option value="${esc(v)}">${esc(l)}</option>`;
  const TRAVEL_HOUR_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200];
  const TRAVEL_PCT_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  function rangeTicks(values, max) {
    return values.map(value => `<span class="wip-uc-range-tick" style="left:${(value / max) * 100}%"></span>`).join('');
  }

  function nearestTravelHour(value) {
    return TRAVEL_HOUR_STEPS.reduce((nearest, step) =>
      Math.abs(step - value) < Math.abs(nearest - value) ? step : nearest, TRAVEL_HOUR_STEPS[0]);
  }

  function updateRangeUi(input, snap = false) {
    if (!input?.matches?.('input[type="range"][data-uc]')) return;
    let value = Number(input.value || 0);
    if (snap && input.dataset.uc === 'travelHours') {
      value = nearestTravelHour(value);
      input.value = String(value);
    }
    const max = Number(input.max || 100) || 100;
    input.style.setProperty('--wip-uc-range-progress', `${Math.max(0, Math.min(100, (value / max) * 100))}%`);
    const output = input.closest('.wip-uc-range-field')?.querySelector(`[data-uc-output="${input.dataset.uc}"]`);
    if (output) output.textContent = value ? `≥ ${value.toLocaleString('fr-FR')} ${input.dataset.uc === 'travelPct' ? '%' : 'h'}` : 'Tous';
  }

  function syncRangeUi(root = document.getElementById('wip-undercarriage-filter')) {
    root?.querySelectorAll?.('input[type="range"][data-uc]').forEach(input => updateRangeUi(input));
  }

  window.__wipSyncUndercarriageRangeUi = syncRangeUi;

  function bindUiEvents(root) {
    if (!root || root.dataset.wipUcBaseEvents === 'true') return;
    root.dataset.wipUcBaseEvents = 'true';
    let refreshTimer = null;
    const queueRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        syncState();
        refresh();
      }, 50);
    };

    syncRangeUi(root);
    root.addEventListener('input', event => {
      if (!event.target?.matches?.('input[type="range"][data-uc]')) return;
      updateRangeUi(event.target, true);
      queueRefresh();
    });
    root.addEventListener('change', event => {
      if (!event.target?.matches?.('select[data-uc],input[data-uc]')) return;
      if (event.target.matches('input[type="range"]')) updateRangeUi(event.target, true);
      queueRefresh();
    });
  }

  function installUi() {
    if (document.getElementById('wip-undercarriage-filter')) return;
    const panel = document.getElementById('filters-panel') || document.querySelector('aside');
    if (!panel) return;
    panel.insertAdjacentHTML('beforeend', `
      <details id="wip-undercarriage-filter" class="rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/70 dark:bg-orange-500/10 p-3">
        <summary class="cursor-pointer text-[11px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-200">Train de roulement / Undercarriage</summary>
        <div class="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-200">
          <label class="flex items-center gap-2 font-bold"><input data-uc="enabled" type="checkbox"> Avec données undercarriage uniquement</label>
          <label class="wip-uc-field">Type<select data-uc="type">${opt('', 'Tous')}${opt('EXCA', 'EXCA')}${opt('BULL', 'BULL')}${opt('MVM', 'MVM')}</select></label>
          <label class="wip-uc-field">Priorité<select data-uc="priority">${opt('', 'Toutes')}${opt('very', 'Très prioritaire : AA')}${opt('high', 'Prioritaire : AA / AB / BA')}${opt('watch', 'À surveiller : AC / BB / CA')}${opt('low', 'Faible : BC / CB / CC')}</select></label>
          <div class="wip-uc-priority-legend" aria-label="Échelle des priorités undercarriage, du niveau faible au niveau très prioritaire">
            <span class="is-low"><i></i><b>Faible</b><em>BC / CB / CC</em></span>
            <span class="is-watch"><i></i><b>À surveiller</b><em>AC / BB / CA</em></span>
            <span class="is-high"><i></i><b>Prioritaire</b><em>AA / AB / BA</em></span>
            <span class="is-very"><i></i><b>Très prioritaire</b><em>AA</em></span>
          </div>
          <label class="wip-uc-field">Classe<select data-uc="class">${['', 'AA', 'AB', 'AC', 'BA', 'BB', 'BC', 'CA', 'CB', 'CC'].map(v => opt(v, v || 'Toutes')).join('')}</select></label>
          <label class="wip-uc-field">SMR minimum<select data-uc="smr">${opt('0', 'Tous')}${opt('5000', '≥ 5 000 h')}${opt('9000', '≥ 9 000 h')}</select></label>
          <label class="wip-uc-field">Activité moyenne<select data-uc="activity">${opt('0', 'Toutes')}${opt('50', '≥ 50')}${opt('80', '≥ 80')}</select></label>
          <div class="wip-uc-field wip-uc-range-field" data-uc-field="travelHours">
            <div class="wip-uc-range-head"><span>Travel hours EXCA</span><output data-uc-output="travelHours">Tous</output></div>
            <div class="wip-uc-range-control">
              <input data-uc="travelHours" type="range" min="0" max="200" step="1" value="0" aria-label="Travel hours EXCA minimum">
              <div class="wip-uc-range-ticks" aria-hidden="true">${rangeTicks(TRAVEL_HOUR_STEPS, 200)}</div>
            </div>
            <div class="wip-uc-range-scale" aria-hidden="true"><span>0 h</span><span>100 h</span><span>200 h</span></div>
          </div>
          <div class="wip-uc-field wip-uc-range-field" data-uc-field="travelPct">
            <div class="wip-uc-range-head"><span>Travel EXCA %</span><output data-uc-output="travelPct">Tous</output></div>
            <div class="wip-uc-range-control">
              <input data-uc="travelPct" type="range" min="0" max="100" step="10" value="0" aria-label="Travel EXCA pourcentage minimum">
              <div class="wip-uc-range-ticks" aria-hidden="true">${rangeTicks(TRAVEL_PCT_STEPS, 100)}</div>
            </div>
            <div class="wip-uc-range-scale" aria-hidden="true"><span>0 %</span><span>50 %</span><span>100 %</span></div>
          </div>
          <label class="flex items-center gap-2 font-bold"><input data-uc="sort" type="checkbox"> Trier par potentiel undercarriage</label>
          <p class="text-[10px] text-orange-700/80 dark:text-orange-200/80">A = fort, B = moyen, C = faible. AA est la classe la plus prioritaire ; CC la moins prioritaire.</p>
        </div>
      </details>`);
    const root = document.getElementById('wip-undercarriage-filter');
    bindUiEvents(root);
  }

  function installStyle() {
    if (document.getElementById('wip-undercarriage-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-style';
    style.textContent = `.wip-uc-field{display:block;font-size:9px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase;color:#c2410c}.wip-uc-field select{width:100%;margin-top:.25rem;border-radius:.75rem;border:1px solid #fed7aa;background:white;padding:.5rem .6rem;font-size:11px;font-weight:800;color:#7c2d12}.dark .wip-uc-field{color:#fdba74}.dark .wip-uc-field select{background:#0f172a;border-color:rgba(251,146,60,.35);color:#fed7aa}.wip-uc-priority-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:-2px}.wip-uc-priority-legend>span{display:grid;grid-template-columns:7px minmax(0,1fr);align-items:center;column-gap:5px;min-width:0;border:1px solid var(--wip-uc-level-border);border-radius:8px;background:var(--wip-uc-level-bg);padding:5px 6px;color:var(--wip-uc-level-text);line-height:1.1}.wip-uc-priority-legend i{grid-row:1/3;width:7px;height:7px;border-radius:999px;background:var(--wip-uc-level-dot);box-shadow:0 0 0 2px color-mix(in srgb,var(--wip-uc-level-dot) 18%,transparent)}.wip-uc-priority-legend b,.wip-uc-priority-legend em{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wip-uc-priority-legend b{font-size:8px;font-style:normal;font-weight:1000;text-transform:uppercase;letter-spacing:.025em}.wip-uc-priority-legend em{margin-top:2px;font-size:8px;font-style:normal;font-weight:800;letter-spacing:0}.wip-uc-priority-legend .is-low{--wip-uc-level-dot:#16a34a;--wip-uc-level-bg:#f0fdf4;--wip-uc-level-border:#bbf7d0;--wip-uc-level-text:#166534}.wip-uc-priority-legend .is-watch{--wip-uc-level-dot:#eab308;--wip-uc-level-bg:#fefce8;--wip-uc-level-border:#fef08a;--wip-uc-level-text:#854d0e}.wip-uc-priority-legend .is-high{--wip-uc-level-dot:#f97316;--wip-uc-level-bg:#fff7ed;--wip-uc-level-border:#fed7aa;--wip-uc-level-text:#9a3412}.wip-uc-priority-legend .is-very{--wip-uc-level-dot:#dc2626;--wip-uc-level-bg:#fef2f2;--wip-uc-level-border:#fecaca;--wip-uc-level-text:#991b1b}.dark .wip-uc-priority-legend>span{background:color-mix(in srgb,var(--wip-uc-level-dot) 12%,#0f172a);border-color:color-mix(in srgb,var(--wip-uc-level-dot) 35%,#334155);color:#f8fafc}.wip-uc-range-field{padding:.2rem 0 .1rem!important}.wip-uc-range-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.wip-uc-range-head output{border-radius:999px;background:#fef3c7;color:#92400e;padding:.18rem .48rem;font-size:9px;font-weight:1000;letter-spacing:.02em;text-transform:none}.wip-uc-range-control{position:relative;margin-top:.35rem;padding:0 7px 8px}.wip-uc-range-control input[type="range"]{--wip-uc-range-progress:0%;display:block;width:100%;height:18px;margin:0;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer;accent-color:#eab308}.wip-uc-range-control input[type="range"]::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:linear-gradient(to right,#eab308 0 var(--wip-uc-range-progress),#e2e8f0 var(--wip-uc-range-progress) 100%)}.wip-uc-range-control input[type="range"]::-moz-range-track{height:4px;border:0;border-radius:999px;background:#e2e8f0}.wip-uc-range-control input[type="range"]::-moz-range-progress{height:4px;border-radius:999px;background:#eab308}.wip-uc-range-control input[type="range"]::-webkit-slider-thumb{width:15px;height:15px;margin-top:-5.5px;border:2px solid #fff;border-radius:999px;background:#eab308;box-shadow:0 2px 7px rgba(15,23,42,.28);appearance:none;-webkit-appearance:none}.wip-uc-range-control input[type="range"]::-moz-range-thumb{width:13px;height:13px;border:2px solid #fff;border-radius:999px;background:#eab308;box-shadow:0 2px 7px rgba(15,23,42,.28)}.wip-uc-range-ticks{position:absolute;left:7px;right:7px;bottom:2px;height:5px}.wip-uc-range-tick{position:absolute;top:1px;width:3px;height:3px;border-radius:999px;background:#94a3b8;transform:translateX(-50%)}.wip-uc-range-scale{display:flex;align-items:center;justify-content:space-between;margin-top:-1px;color:#94a3b8;font-size:8px;font-weight:800;letter-spacing:0;text-transform:none}.dark .wip-uc-range-head output{background:rgba(234,179,8,.18);color:#fde68a}.dark .wip-uc-range-control input[type="range"]::-webkit-slider-runnable-track{background:linear-gradient(to right,#eab308 0 var(--wip-uc-range-progress),#334155 var(--wip-uc-range-progress) 100%)}.dark .wip-uc-range-control input[type="range"]::-moz-range-track{background:#334155}.wip-uc-badge{display:inline-flex;align-items:center;border-radius:999px;border:1px solid rgba(249,115,22,.35);background:#fff7ed;color:#9a3412;padding:.15rem .45rem;font-size:9px;font-weight:1000;letter-spacing:.04em;text-transform:uppercase;margin-top:.35rem}.dark .wip-uc-badge{background:rgba(154,52,18,.25);color:#fed7aa;border-color:rgba(251,146,60,.35)}.wip-uc-table{width:100%;border-collapse:collapse;font-size:11px}.wip-uc-table th,.wip-uc-table td{border-bottom:1px solid rgba(148,163,184,.22);padding:.45rem;text-align:left}.wip-uc-table th{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}`;
    document.head.appendChild(style);
  }

  function addBadges() {
    document.querySelectorAll('button[onclick^="openDetails("]').forEach(button => {
      const m = String(button.getAttribute('onclick') || '').match(/openDetails\((\d+)\)/);
      const rowIndex = m ? Number(m[1]) : NaN;
      const row = Number.isFinite(rowIndex) ? window.__wipRowByIndex?.(rowIndex) || null : null;
      if (!row || !machines(row).length || button.parentElement?.querySelector('.wip-uc-badge')) return;
      const badge = document.createElement('span');
      badge.className = 'wip-uc-badge';
      badge.textContent = `Undercarriage • ${row._undercarriageCount}`;
      button.parentElement.appendChild(badge);
    });
  }
  function details(row) {
    const list = machines(row).sort((a, b) => (b.score || 0) - (a.score || 0));
    if (!list.length) return '';
    const rows = list.map(m => `<tr><td>${esc(m.label)}</td><td>${m.smr ? Math.round(m.smr).toLocaleString('fr-FR') + ' h' : ''}</td><td>${esc(m.bull)}</td><td>${esc(m.exca)}</td><td>${esc(m.mvm)}</td><td>${m.travelPct ? m.travelPct.toLocaleString('fr-FR') + ' %' : ''}</td><td>${m.travelHours ? Math.round(m.travelHours).toLocaleString('fr-FR') + ' h' : ''}</td><td>${Math.round(m.score || 0)}</td></tr>`).join('');
    return `<div id="wip-undercarriage-details" class="rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/10 p-4"><div class="text-[10px] uppercase tracking-widest font-black text-orange-700 dark:text-orange-200 mb-3">Train de roulement / Undercarriage</div><div class="overflow-auto"><table class="wip-uc-table"><thead><tr><th>Machine</th><th>SMR</th><th>BULL</th><th>EXCA</th><th>MVM</th><th>Travel %</th><th>Travel h</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function patchFunctions() {
    if (window.__WIP_UNDERCARRIAGE_FUNCTIONS_PATCHED__) return;
    window.__WIP_UNDERCARRIAGE_FUNCTIONS_PATCHED__ = true;
    if (typeof runFilter === 'function') {
      const original = runFilter;
      runFilter = function(...args) {
        const result = original.apply(this, args);
        try {
          if (active() && Array.isArray(currentFilteredData)) {
            currentFilteredData = apply(currentFilteredData);
            if (typeof renderGrid === 'function') renderGrid(currentFilteredData);
            if (typeof updateActiveCounter === 'function') updateActiveCounter();
            if (typeof isMapVisible === 'function' && isMapVisible() && typeof renderMap === 'function') renderMap(currentFilteredData);
          }
        } catch (e) { console.warn('Undercarriage filter failed', e); }
        window.setTimeout(addBadges, 100);
        return result;
      };
    }
    if (typeof getTop200Data === 'function') {
      const original = getTop200Data;
      getTop200Data = function(...args) { const rows = original.apply(this, args); return active() ? apply(rows) : rows; };
    }
    if (typeof openDetails === 'function') {
      const original = openDetails;
      openDetails = function(rowIndex, ...args) {
        const result = original.call(this, rowIndex, ...args);
        try {
          const row = window.__wipRowByIndex?.(rowIndex) || null;
          const body = document.querySelector('#details-modal .p-5.overflow-y-auto');
          if (row && body && !document.getElementById('wip-undercarriage-details')) {
            const html = details(row);
            if (html) body.insertAdjacentHTML('afterbegin', html);
          }
        } catch (e) { console.warn('Undercarriage details failed', e); }
        return result;
      };
    }
  }

  function install() {
    installStyle();
    installUi();
    patchFunctions();
    window.setTimeout(addBadges, 150);
  }
  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', install, { once: true });
  window.setTimeout(install, 2000);
})();
