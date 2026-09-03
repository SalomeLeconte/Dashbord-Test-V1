(() => {
  const PATCH_ID = 'wip-city-combobox-2026-09-03-v1';
  if (window.__WIP_CITY_COMBOBOX__ === PATCH_ID) return;
  window.__WIP_CITY_COMBOBOX__ = PATCH_ID;

  const state = {
    options: [],
    visible: [],
    selectedKey: '',
    selectedLabel: '',
    activeIndex: -1,
    open: false
  };

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function normalizeDept(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    if (!raw) return '';
    if (/^\d$/.test(raw)) return raw.padStart(2, '0');
    return raw;
  }

  function rows() {
    try {
      if (Array.isArray(window.globalData)) return window.globalData;
      if (Array.isArray(globalData)) return globalData;
    } catch (error) {}
    return [];
  }

  function cityColumn() {
    try { return window.COL?.ville || COL?.ville || ''; } catch (error) { return ''; }
  }

  function deptColumn() {
    try { return window.COL?.dept || COL?.dept || ''; } catch (error) { return ''; }
  }

  function cityOf(row) {
    const key = cityColumn();
    return String(row?.[key] || row?.Ville || row?.ville || row?.Commune || '').trim();
  }

  function deptOf(row) {
    const key = deptColumn();
    return normalizeDept(row?._deptNorm || row?.[key] || row?.Département || row?.Departement || '');
  }

  function belongsToActivePssr(row) {
    try {
      if (typeof itemBelongsToActivePssr === 'function') return !!itemBelongsToActivePssr(row);
    } catch (error) {}
    const depts = Array.isArray(window.selectedSectorDepts)
      ? window.selectedSectorDepts.map(normalizeDept).filter(Boolean)
      : [];
    return !depts.length || depts.includes(deptOf(row));
  }

  function elements() {
    return {
      root: document.getElementById('wip-city-combobox'),
      search: document.getElementById('f-ville-search'),
      value: document.getElementById('f-ville-value'),
      toggle: document.getElementById('f-ville-toggle'),
      clear: document.getElementById('f-ville-clear'),
      menu: document.getElementById('f-ville-options'),
      status: document.getElementById('f-ville-status')
    };
  }

  function buildOptions({ runIfInvalid = false } = {}) {
    const el = elements();
    if (!el.search || !el.value || !el.menu) return;

    const deptFilter = normalizeDept(document.getElementById('f-dept')?.value || '');
    const map = new Map();
    rows().forEach((row) => {
      if (!belongsToActivePssr(row)) return;
      const dept = deptOf(row);
      const city = cityOf(row);
      const cityNorm = norm(city);
      if (!dept || !cityNorm) return;
      if (deptFilter && dept !== deptFilter) return;
      const key = `${dept}|${cityNorm}`;
      if (!map.has(key)) map.set(key, { key, city, cityNorm, dept, label: `${city} — ${dept}` });
    });

    state.options = [...map.values()].sort((a, b) =>
      a.city.localeCompare(b.city, 'fr', { sensitivity: 'base', numeric: true })
      || a.dept.localeCompare(b.dept, 'fr', { numeric: true })
    );

    const previousKey = String(el.value.value || state.selectedKey || '');
    const selected = state.options.find((option) => option.key === previousKey) || null;
    if (selected) {
      state.selectedKey = selected.key;
      state.selectedLabel = selected.label;
      el.value.value = selected.key;
      if (document.activeElement !== el.search || !el.search.value.trim()) el.search.value = selected.label;
    } else {
      const hadSelection = !!previousKey;
      state.selectedKey = '';
      state.selectedLabel = '';
      el.value.value = '';
      el.search.value = '';
      if (hadSelection && runIfInvalid) runFilterOnce();
    }

    updateStatus();
    renderOptions(state.open ? '' : el.search.value);
    syncButtons();
  }

  function updateStatus(matchCount = null) {
    const { status } = elements();
    if (!status) return;
    const total = state.options.length;
    if (matchCount !== null && matchCount !== total) {
      status.textContent = `${matchCount} ville(s) correspondante(s) sur ${total}`;
      return;
    }
    status.textContent = `${total} ville(s) disponible(s) pour ce PSSR`;
  }

  function syncButtons() {
    const { clear, toggle, search } = elements();
    if (clear) clear.hidden = !state.selectedKey;
    if (toggle) toggle.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    if (search) search.setAttribute('aria-expanded', state.open ? 'true' : 'false');
  }

  function renderOptions(query = '') {
    const { menu } = elements();
    if (!menu) return;
    const q = norm(query);
    const matches = q
      ? state.options.filter((option) => norm(option.label).includes(q) || option.cityNorm.includes(q) || option.dept.includes(q))
      : state.options;
    state.visible = matches.slice(0, 160);
    if (state.activeIndex >= state.visible.length) state.activeIndex = -1;

    const allButton = `
      <button type="button" class="wip-city-option wip-city-option-all${!state.selectedKey ? ' is-selected' : ''}" data-city-clear="true">
        <span>Toutes les villes</span><small>${state.options.length}</small>
      </button>`;
    const optionsHtml = state.visible.map((option, index) => `
      <button type="button" class="wip-city-option${option.key === state.selectedKey ? ' is-selected' : ''}${index === state.activeIndex ? ' is-active' : ''}" data-city-key="${esc(option.key)}">
        <span>${esc(option.city)}</span><small>${esc(option.dept)}</small>
      </button>`).join('');
    const empty = !state.visible.length
      ? '<div class="wip-city-empty">Aucune ville correspondante dans le portefeuille.</div>'
      : '';
    const more = matches.length > state.visible.length
      ? `<div class="wip-city-more">Affinez la recherche pour voir les ${matches.length - state.visible.length} autres villes.</div>`
      : '';
    menu.innerHTML = allButton + optionsHtml + empty + more;
    updateStatus(matches.length);
  }

  function openMenu({ showAll = false } = {}) {
    const { menu, search } = elements();
    if (!menu || !search) return;
    state.open = true;
    state.activeIndex = -1;
    menu.hidden = false;
    menu.classList.remove('hidden');
    renderOptions(showAll ? '' : search.value);
    syncButtons();
  }

  function closeMenu({ restore = false } = {}) {
    const { menu, search } = elements();
    if (!menu || !search) return;
    state.open = false;
    state.activeIndex = -1;
    menu.hidden = true;
    menu.classList.add('hidden');
    if (restore) search.value = state.selectedLabel || '';
    updateStatus();
    syncButtons();
  }

  function runFilterOnce() {
    window.requestAnimationFrame(() => {
      try {
        if (typeof window.runFilter === 'function') window.runFilter();
        else if (typeof runFilter === 'function') runFilter();
      } catch (error) {
        console.error('Filtrage Ville impossible.', error);
      }
    });
  }

  function notifyCityChanged(option = null) {
    document.dispatchEvent(new CustomEvent('dashboard:city-changed', {
      detail: option ? { key: option.key, city: option.city, dept: option.dept } : { key: '', city: '', dept: '' }
    }));
  }

  function selectOption(option) {
    const { search, value } = elements();
    if (!search || !value || !option) return;
    state.selectedKey = option.key;
    state.selectedLabel = option.label;
    value.value = option.key;
    search.value = option.label;
    closeMenu();
    syncButtons();
    notifyCityChanged(option);
    runFilterOnce();
  }

  function clearSelection({ run = true } = {}) {
    const { search, value } = elements();
    const changed = !!(state.selectedKey || value?.value);
    state.selectedKey = '';
    state.selectedLabel = '';
    if (value) value.value = '';
    if (search) search.value = '';
    renderOptions('');
    syncButtons();
    notifyCityChanged(null);
    if (run && changed) runFilterOnce();
  }

  function selectActive() {
    if (state.activeIndex < 0 || state.activeIndex >= state.visible.length) return false;
    selectOption(state.visible[state.activeIndex]);
    return true;
  }

  function moveActive(delta) {
    if (!state.open) openMenu({ showAll: true });
    if (!state.visible.length) return;
    const next = state.activeIndex < 0
      ? (delta > 0 ? 0 : state.visible.length - 1)
      : (state.activeIndex + delta + state.visible.length) % state.visible.length;
    state.activeIndex = next;
    renderOptions(elements().search?.value || '');
    const active = elements().menu?.querySelector('.wip-city-option.is-active');
    active?.scrollIntoView?.({ block: 'nearest' });
  }

  function bindUi() {
    const el = elements();
    if (!el.root || !el.search || !el.value || !el.menu || el.root.dataset.wipCityBound === PATCH_ID) return;
    el.root.dataset.wipCityBound = PATCH_ID;

    el.search.addEventListener('focus', () => {
      try { el.search.select(); } catch (error) {}
      openMenu({ showAll: true });
    });
    el.search.addEventListener('input', () => {
      if (!state.open) openMenu();
      state.activeIndex = -1;
      renderOptions(el.search.value);
    }, { passive: true });
    el.search.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1); }
      else if (event.key === 'Enter') {
        if (!state.open) { event.preventDefault(); openMenu({ showAll: true }); return; }
        if (selectActive()) event.preventDefault();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu({ restore: true });
      }
    });
    el.search.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (!el.root.contains(document.activeElement)) closeMenu({ restore: true });
      }, 100);
    });

    el.toggle?.addEventListener('click', () => {
      if (state.open) closeMenu({ restore: true });
      else { el.search.focus({ preventScroll: true }); openMenu({ showAll: true }); }
    });
    el.clear?.addEventListener('click', () => {
      clearSelection({ run: true });
      el.search.focus({ preventScroll: true });
      openMenu({ showAll: true });
    });

    el.menu.addEventListener('mousedown', (event) => event.preventDefault());
    el.menu.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-city-key],button[data-city-clear]');
      if (!button) return;
      if (button.dataset.cityClear === 'true') {
        clearSelection({ run: true });
        closeMenu();
        return;
      }
      const option = state.options.find((item) => item.key === button.dataset.cityKey);
      if (option) selectOption(option);
    });

    document.addEventListener('click', (event) => {
      if (state.open && !el.root.contains(event.target)) closeMenu({ restore: true });
    });

    document.getElementById('f-dept')?.addEventListener('change', () => buildOptions({ runIfInvalid: true }));
  }

  function wrapResetFilters() {
    const current = window.resetFilters;
    if (typeof current !== 'function' || current.__wipCityComboboxReset) return;
    const wrapped = function resetFiltersWithCityCombobox(...args) {
      const result = current.apply(this, args);
      clearSelection({ run: false });
      window.setTimeout(() => buildOptions(), 0);
      return result;
    };
    wrapped.__wipCityComboboxReset = true;
    window.resetFilters = wrapped;
    try { resetFilters = wrapped; } catch (error) {}
  }

  function installStyles() {
    if (document.getElementById('wip-city-combobox-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-city-combobox-style';
    style.textContent = `
      .wip-city-combobox{position:relative}
      .wip-city-control{position:relative}
      .wip-city-control .modern-input{padding-right:64px}
      .wip-city-actions{position:absolute;right:7px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:3px}
      .wip-city-icon-btn{width:25px;height:25px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:transparent;color:#94a3b8;font-size:14px;font-weight:900;cursor:pointer}
      .wip-city-icon-btn:hover{background:#f1f5f9;color:#475569}
      .dark .wip-city-icon-btn:hover{background:#1e293b;color:#e2e8f0}
      .wip-city-options{position:absolute;z-index:12000;left:0;right:0;top:calc(100% + 5px);max-height:280px;overflow:auto;padding:5px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 18px 45px rgba(15,23,42,.18)}
      .dark .wip-city-options{background:#0f172a;border-color:#334155;box-shadow:0 18px 45px rgba(0,0,0,.42)}
      .wip-city-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:#334155;text-align:left;font-size:11px;font-weight:800;cursor:pointer}
      .wip-city-option small{color:#94a3b8;font-size:9px;font-weight:900}
      .wip-city-option:hover,.wip-city-option.is-active{background:#f8fafc}
      .wip-city-option.is-selected{background:#fef9c3;color:#854d0e}
      .dark .wip-city-option{color:#e2e8f0}.dark .wip-city-option:hover,.dark .wip-city-option.is-active{background:#1e293b}.dark .wip-city-option.is-selected{background:rgba(234,179,8,.18);color:#fde68a}
      .wip-city-option-all{border-bottom:1px solid #f1f5f9;margin-bottom:4px}.dark .wip-city-option-all{border-color:#1e293b}
      .wip-city-empty,.wip-city-more{padding:9px 10px;color:#94a3b8;font-size:10px;line-height:1.35}
      #f-ville-status{margin-top:4px;color:#94a3b8;font-size:9px;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function install() {
    const { root, search, value } = elements();
    if (!root || !search || !value) return;
    installStyles();
    bindUi();
    wrapResetFilters();
    buildOptions();
  }

  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', () => {
    window.setTimeout(() => {
      install();
      buildOptions({ runIfInvalid: false });
    }, 0);
  });
  [400, 1200, 2600].forEach((delay) => window.setTimeout(install, delay));
})();
