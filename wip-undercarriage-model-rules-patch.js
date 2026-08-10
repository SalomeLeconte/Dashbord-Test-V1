(() => {
  const PATCH_ID = 'wip-undercarriage-model-rules-2026-08-10-v2';
  if (window.__WIP_UNDERCARRIAGE_MODEL_RULES_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_MODEL_RULES_PATCH__ = PATCH_ID;

  const SCORE = { AA: 100, AB: 85, BA: 80, AC: 60, BB: 55, CA: 50, BC: 30, CB: 25, CC: 10 };
  const COLS = {
    models: ['data22.Liste Machines', 'Liste Machines'],
    serials: ['data22.Liste Num serie Machines', 'data22.Liste Num série Machines', 'Liste Num serie Machines', 'Liste Num série Machines'],
    smr: ['data22.Machines SMR par client', 'Machines SMR par client'],
    bull: ['data22.Class BULL par client', 'Class BULL par client'],
    exca: ['data22.Class EXCA par client', 'Class EXCA par client'],
    travelPct: ['data22.travel pct exca par client', 'travel pct exca par client'],
    travelHours: ['data22.travel hours exca par client', 'travel hours exca par client']
  };

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const get = (row, names) => names
    .map((name) => row?.[name])
    .find((value) => value !== undefined && String(value).trim() !== '') || '';

  const col = (key) => {
    try { return COL?.[key] || ''; } catch (error) { return ''; }
  };

  const num = (value) => {
    try { if (typeof parseNumber === 'function') return parseNumber(value); } catch (error) {}
    const n = Number(String(value ?? '')
      .replace(/\s/g, '')
      .replace(/\u202f/g, '')
      .replace(',', '.')
      .replace(/%|h|€|EUR/gi, '')
      .replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeMachineKey = (value) => String(value ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();

  const modelCode = (value) => normalizeMachineKey(value);
  const isBullModel = (model) => /^D/.test(modelCode(model));
  const isExcaModel = (model) => /^(PC|HB)/.test(modelCode(model));
  const looksLikeModel = (value) => /^(D|PC|HB|WA|PW|GD|HM|HD|BR|WB|SK|CD|PC\d|HB\d)/i.test(String(value ?? '').trim());

  function tokenize(value) {
    const text = String(value ?? '').trim();
    if (!text) return [];
    let parts = text.split(/\s*[;\n\r|]+\s*/).filter(Boolean);
    if (parts.length <= 1 && /,\s*[A-Z0-9]/i.test(text)) parts = text.split(/\s*,\s*/).filter(Boolean);
    return parts.map((part) => part.trim()).filter(Boolean);
  }

  function splitEntries(value, options = {}) {
    const { parsePairs = true, modelPairs = false } = options;
    return tokenize(value).map((clean, index) => {
      const pair = clean.match(/^(.+?)\s+(?:-|:|→|=>)\s+(.+)$/);
      if (parsePairs && pair) {
        if (!modelPairs || looksLikeModel(pair[2])) {
          return { key: pair[1].trim(), value: pair[2].trim(), index, raw: clean };
        }
      }
      return { key: `machine_${index + 1}`, value: clean, index, raw: clean };
    });
  }

  function entryMap(value) {
    const map = new Map();
    splitEntries(value, { parsePairs: true }).forEach((entry) => {
      const key = normalizeMachineKey(entry.key || `machine_${entry.index + 1}`);
      if (!key) return;
      map.set(key, entry);
    });
    return map;
  }

  function cls(value) {
    const match = String(value ?? '').toUpperCase().match(/\b(AA|AB|AC|BA|BB|BC|CA|CB|CC)\b/);
    return match ? match[1] : '';
  }

  function modelLookup(row) {
    const modelEntries = splitEntries(get(row, COLS.models), { parsePairs: true, modelPairs: true });
    const serialEntries = splitEntries(get(row, COLS.serials), { parsePairs: false });
    const byKey = new Map();
    const byIndex = new Map();

    modelEntries.forEach((entry, index) => {
      const model = entry.value || entry.key || '';
      if (!model) return;
      byIndex.set(index, model);
      byKey.set(normalizeMachineKey(`machine_${index + 1}`), model);
      byKey.set(normalizeMachineKey(entry.key), model);
      byKey.set(normalizeMachineKey(entry.value), model);
    });

    serialEntries.forEach((entry, index) => {
      const model = byIndex.get(index) || '';
      const serial = entry.value || entry.key || '';
      if (!model) return;
      byKey.set(normalizeMachineKey(serial), model);
      byKey.set(normalizeMachineKey(entry.key), model);
      byKey.set(normalizeMachineKey(`machine_${index + 1}`), model);
    });

    return { byKey, byIndex };
  }

  function modelForEntry(entry, lookup) {
    if (!entry) return '';
    const byKey = lookup.byKey || new Map();
    const byIndex = lookup.byIndex || new Map();
    const candidates = [
      entry.key,
      entry.value,
      entry.raw,
      `machine_${entry.index + 1}`
    ];
    for (const candidate of candidates) {
      const key = normalizeMachineKey(candidate);
      const model = byKey.get(key);
      if (model) return model;
      if (looksLikeModel(candidate)) return candidate;
    }
    return byIndex.get(entry.index) || '';
  }

  function hasRawUndercarriage(row) {
    return !![
      get(row, COLS.smr),
      get(row, COLS.bull),
      get(row, COLS.exca),
      get(row, COLS.travelPct),
      get(row, COLS.travelHours)
    ].some((value) => String(value || '').trim());
  }

  function buildUndercarriageMachines(row) {
    if (!row) return [];

    const maps = {
      smr: entryMap(get(row, COLS.smr)),
      bull: entryMap(get(row, COLS.bull)),
      exca: entryMap(get(row, COLS.exca)),
      travelPct: entryMap(get(row, COLS.travelPct)),
      travelHours: entryMap(get(row, COLS.travelHours))
    };
    const lookup = modelLookup(row);
    const keys = new Set();
    Object.values(maps).forEach((map) => map.forEach((_, key) => keys.add(key)));

    const list = [...keys].map((key) => {
      const source = maps.smr.get(key) || maps.bull.get(key) || maps.exca.get(key) || maps.travelPct.get(key) || maps.travelHours.get(key);
      const model = modelForEntry(source, lookup);
      const bullAllowed = isBullModel(model);
      const excaAllowed = isExcaModel(model);
      const bull = bullAllowed ? cls(maps.bull.get(key)?.value) : '';
      const exca = excaAllowed ? cls(maps.exca.get(key)?.value) : '';
      const travelPct = excaAllowed ? num(maps.travelPct.get(key)?.value) : 0;
      const travelHours = excaAllowed ? num(maps.travelHours.get(key)?.value) : 0;
      const smr = (bullAllowed || excaAllowed) ? num(maps.smr.get(key)?.value) : 0;
      const classes = [bull, exca].filter(Boolean);
      const best = classes.sort((a, b) => (SCORE[b] || 0) - (SCORE[a] || 0))[0] || '';
      const score = Math.max(
        SCORE[best] || 0,
        smr >= 9000 ? 35 : smr >= 5000 ? 20 : 0,
        travelPct >= 70 ? 35 : travelPct >= 50 ? 24 : travelPct >= 30 ? 12 : 0,
        travelHours >= 500 ? 20 : travelHours >= 250 ? 12 : travelHours >= 100 ? 7 : 0
      );
      const serial = source?.key || source?.value || key;
      const label = `${String(serial).replace(/^machine_\d+$/i, 'Machine')}${model ? ` — ${model}` : ''}`;
      return {
        key,
        label,
        model,
        smr,
        bull,
        exca,
        mvm: '',
        travelPct,
        travelHours,
        best,
        score,
        rawAvailable: !!(maps.smr.get(key) || maps.bull.get(key) || maps.exca.get(key) || maps.travelPct.get(key) || maps.travelHours.get(key)),
        modelAllowed: bullAllowed || excaAllowed,
        hasData: !!((bullAllowed && bull) || (excaAllowed && (exca || travelPct || travelHours)))
      };
    });

    const applicable = list.filter((machine) => machine.hasData);
    row._undercarriageMachines = applicable;
    row._undercarriageRawMachines = list.filter((machine) => machine.rawAvailable);
    row._undercarriageCount = applicable.length;
    row._undercarriageScore = applicable.reduce((max, machine) => Math.max(max, machine.score || 0), 0);
    row._wipUndercarriageHasRaw = hasRawUndercarriage(row);
    row._wipUndercarriageModelRulesApplied = true;
    return applicable;
  }

  window.__wipBuildUndercarriageMachines = buildUndercarriageMachines;

  function refreshRows() {
    const seen = new Set();
    [window.globalData, window.currentFilteredData]
      .filter(Array.isArray)
      .flat()
      .forEach((row) => {
        if (!row || seen.has(row)) return;
        seen.add(row);
        buildUndercarriageMachines(row);
      });
  }

  function updateFilterUi() {
    const root = document.getElementById('wip-undercarriage-filter');
    const type = root?.querySelector('select[data-uc="type"]');
    if (type) {
      [...type.options].forEach((option) => {
        if (option.value === 'MVM') option.remove();
        if (option.value === 'BULL') option.textContent = 'BULL / Dozer D*';
        if (option.value === 'EXCA') option.textContent = 'EXCA PC* / HB*';
      });
      if (type.value === 'MVM') {
        type.value = '';
        const state = window.__wipUnderCarriageState;
        if (state) state.type = '';
      }
    }

    root?.querySelectorAll('label, .wip-uc-field').forEach((node) => {
      if (/\bMVM\b/i.test(node.textContent || '')) node.remove();
    });

    const note = root?.querySelector('p');
    if (note) note.textContent = 'BULL / Dozer : modèles D*. EXCA : modèles PC* ou HB*. Le badge reste visible si des données undercarriage existent, même si aucune machine applicable n’est détectée.';
  }

  function updateBadges() {
    document.querySelectorAll('.wip-uc-badge').forEach((badge) => {
      const rowIndex = Number(badge.dataset.rowIndex || NaN);
      let row = Number.isFinite(rowIndex) ? (window.globalData || []).find((item) => Number(item?._rowIndex) === rowIndex) : null;
      if (!row) {
        const button = badge.parentElement?.querySelector?.('button[onclick^="openDetails("]')
          || badge.closest?.('tr, .mobile-card, div')?.querySelector?.('button[onclick^="openDetails("]');
        const match = String(button?.getAttribute('onclick') || '').match(/openDetails\((\d+)\)/);
        row = match ? (window.globalData || []).find((item) => Number(item?._rowIndex) === Number(match[1])) : null;
      }
      if (!row) return;
      const list = buildUndercarriageMachines(row);
      const raw = !!row._wipUndercarriageHasRaw;
      if (!raw && !list.length) {
        badge.remove();
        return;
      }
      badge.textContent = `Undercarriage • ${list.length}`;
      badge.dataset.rowIndex = String(row._rowIndex ?? '');
      badge.setAttribute('title', list.length ? 'Voir les données undercarriage applicables' : 'Données undercarriage présentes, mais aucune machine D / PC / HB reconnue');
      badge.classList.toggle('wip-uc-badge-zero', !list.length);
    });
  }

  function fmtHours(value) {
    return value ? `${Math.round(value).toLocaleString('fr-FR')} h` : '—';
  }
  function fmtPct(value) {
    return value ? `${value.toLocaleString('fr-FR')} %` : '—';
  }
  function titleFor(row) {
    const name = row?.[col('nom')] || row?.denominationUniteLegale || row?.Nom || row?.Client || 'Client';
    const siret = row?.[col('siret')] || row?.siret || row?.SIRET || '';
    return `${name}${siret ? ` — ${siret}` : ''}`;
  }

  function modalHtml(row) {
    const list = buildUndercarriageMachines(row).sort((a, b) => (b.score || 0) - (a.score || 0));
    const rawList = row._undercarriageRawMachines || [];
    const rows = list.map((machine) => `
      <tr>
        <td>${esc(machine.label)}</td>
        <td>${fmtHours(machine.smr)}</td>
        <td>${esc(machine.bull || '—')}</td>
        <td>${esc(machine.exca || '—')}</td>
        <td>${fmtPct(machine.travelPct)}</td>
        <td>${fmtHours(machine.travelHours)}</td>
        <td>${esc(machine.best || '—')}</td>
        <td>${Math.round(machine.score || 0)}</td>
      </tr>
    `).join('');

    const empty = rawList.length
      ? '<tr><td colspan="8">Données undercarriage présentes, mais aucune machine D / PC / HB reconnue. Vérifier Liste Machines et Liste Num série Machines.</td></tr>'
      : '<tr><td colspan="8">Aucune donnée undercarriage trouvée.</td></tr>';

    return `
      <div class="wip-uc-clean-kicker">Données undercarriage par machine</div>
      <div class="wip-uc-clean-summary">
        <div><strong>${list.length}</strong><span>machine(s) D / PC / HB avec données</span></div>
        <div><strong>${Math.round(row._undercarriageScore || 0)}</strong><span>score max</span></div>
        <div><strong>${esc(list[0]?.best || '—')}</strong><span>classe prioritaire</span></div>
      </div>
      <div class="wip-uc-clean-table-wrap">
        <table class="wip-uc-clean-table">
          <thead><tr><th>Machine / modèle</th><th>SMR</th><th>BULL / Dozer</th><th>EXCA</th><th>Travel %</th><th>Travel h</th><th>Classe</th><th>Score</th></tr></thead>
          <tbody>${rows || empty}</tbody>
        </table>
      </div>
    `;
  }

  function openModelRuleModal(row) {
    if (!row) return;
    document.getElementById('wip-uc-clean-modal')?.remove();
    document.getElementById('wip-uc-model-rules-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'wip-uc-model-rules-modal';
    modal.innerHTML = `
      <div class="wip-uc-clean-backdrop" data-wip-uc-close="true"></div>
      <section class="wip-uc-clean-card" role="dialog" aria-modal="true" aria-labelledby="wip-uc-model-rules-title">
        <header class="wip-uc-clean-head">
          <div>
            <div class="wip-uc-clean-label">Undercarriage</div>
            <h3 id="wip-uc-model-rules-title">${esc(titleFor(row))}</h3>
          </div>
          <button type="button" class="wip-uc-clean-close" data-wip-uc-close="true" aria-label="Fermer">×</button>
        </header>
        <div class="wip-uc-clean-body">${modalHtml(row)}</div>
      </section>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-wip-uc-close="true"]').forEach((node) => node.addEventListener('click', () => modal.remove()));
  }

  function rowFromBadge(badge) {
    const explicit = Number(badge?.dataset?.rowIndex || NaN);
    if (Number.isFinite(explicit)) return (window.globalData || []).find((row) => Number(row?._rowIndex) === explicit) || null;
    const detailButton = badge?.parentElement?.querySelector?.('button[onclick^="openDetails("]')
      || badge?.closest?.('tr, .mobile-card, div')?.querySelector?.('button[onclick^="openDetails("]');
    const match = String(detailButton?.getAttribute('onclick') || '').match(/openDetails\((\d+)\)/);
    const rowIndex = match ? Number(match[1]) : NaN;
    return Number.isFinite(rowIndex) ? (window.globalData || []).find((row) => Number(row?._rowIndex) === rowIndex) || null : null;
  }

  function interceptBadgeClick(event) {
    const badge = event.target?.closest?.('.wip-uc-badge');
    if (!badge) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const row = rowFromBadge(badge);
    if (row) openModelRuleModal(row);
  }

  function patchRunFilter() {
    const current = window.runFilter;
    if (typeof current !== 'function' || current.__wipUndercarriageModelRules) return;
    const wrapped = function runFilterWithUndercarriageModelRules(...args) {
      refreshRows();
      const result = current.apply(this, args);
      refreshRows();
      setTimeout(() => { updateBadges(); updateFilterUi(); }, 0);
      return result;
    };
    wrapped.__wipUndercarriageModelRules = true;
    window.runFilter = wrapped;
    try { runFilter = wrapped; } catch (error) {}
  }

  function patchAddBadges() {
    const current = window.addBadges;
    if (typeof current !== 'function' || current.__wipUndercarriageModelRules) return;
    const wrapped = function addBadgesWithUndercarriageModelRules(...args) {
      const result = current.apply(this, args);
      setTimeout(() => { refreshRows(); updateBadges(); }, 0);
      return result;
    };
    wrapped.__wipUndercarriageModelRules = true;
    window.addBadges = wrapped;
    try { addBadges = wrapped; } catch (error) {}
  }

  function installStyles() {
    if (document.getElementById('wip-undercarriage-model-rules-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-model-rules-style';
    style.textContent = `
      #wip-uc-model-rules-modal{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      #wip-uc-model-rules-modal .wip-uc-clean-table th:nth-child(5),
      #wip-uc-model-rules-modal .wip-uc-clean-table td:nth-child(5){display:table-cell!important}
      .wip-uc-badge-zero{opacity:.72!important;border-style:dashed!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    patchRunFilter();
    patchAddBadges();
    refreshRows();
    updateFilterUi();
    updateBadges();
  }

  window.addEventListener('click', interceptBadgeClick, true);
  window.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target?.classList?.contains('wip-uc-badge')) interceptBadgeClick(event);
  }, true);

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [100, 400, 900, 1800, 3500, 6500, 10000, 15000].forEach((delay) => setTimeout(install, delay));
  });
  [150, 550, 1200, 2400, 4800, 8000, 12000, 18000].forEach((delay) => setTimeout(install, delay));
  try { new MutationObserver(() => setTimeout(install, 0)).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
