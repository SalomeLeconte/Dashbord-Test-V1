(() => {
  const PATCH_ID = 'wip-undercarriage-custom-select-2026-08-10';
  if (window.__WIP_UNDERCARRIAGE_CUSTOM_SELECT_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_CUSTOM_SELECT_PATCH__ = PATCH_ID;

  const ROOT_SELECTOR = '#wip-undercarriage-filter';
  const SELECT_SELECTOR = `${ROOT_SELECTOR} select[data-uc]`;
  const MENU_ID = 'wip-uc-custom-select-menu';
  let activeSelect = null;
  let activeTrigger = null;
  let syncQueued = false;

  function selectedLabel(select) {
    return select?.selectedOptions?.[0]?.textContent?.trim()
      || select?.options?.[0]?.textContent?.trim()
      || 'Sélectionner';
  }

  function fieldLabel(select) {
    const field = select?.closest?.('.wip-uc-field, label');
    if (!field) return 'Filtre undercarriage';
    return [...field.childNodes]
      .filter((node) => node !== select && !node.classList?.contains?.('wip-uc-custom-select'))
      .map((node) => node.nodeType === Node.TEXT_NODE ? node.textContent : '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Filtre undercarriage';
  }

  function menu() {
    let element = document.getElementById(MENU_ID);
    if (element) return element;
    element = document.createElement('div');
    element.id = MENU_ID;
    element.className = 'wip-uc-custom-menu';
    element.setAttribute('role', 'listbox');
    element.hidden = true;
    document.body.appendChild(element);
    return element;
  }

  function closeMenu({ restoreFocus = false } = {}) {
    const element = document.getElementById(MENU_ID);
    if (element) element.hidden = true;
    if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
    const trigger = activeTrigger;
    activeSelect = null;
    activeTrigger = null;
    if (restoreFocus) trigger?.focus?.();
  }

  function positionMenu(element, trigger) {
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const width = Math.min(Math.max(rect.width, 220), Math.max(220, viewportWidth - 16));

    element.style.width = `${width}px`;
    element.style.maxHeight = `${Math.max(120, Math.min(280, viewportHeight - 24))}px`;
    element.style.visibility = 'hidden';
    element.hidden = false;

    const height = Math.min(element.scrollHeight, Math.max(120, viewportHeight - 24));
    const roomBelow = viewportHeight - rect.bottom - 8;
    const openAbove = roomBelow < Math.min(height, 180) && rect.top > roomBelow;
    const top = openAbove
      ? Math.max(8, rect.top - height - 4)
      : Math.min(viewportHeight - height - 8, rect.bottom + 4);
    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

    element.style.top = `${Math.max(8, top)}px`;
    element.style.left = `${left}px`;
    element.style.visibility = 'visible';
  }

  function fillMenu(select, trigger) {
    const element = menu();
    element.replaceChildren();
    element.setAttribute('aria-label', fieldLabel(select));

    [...select.options].forEach((nativeOption) => {
      const option = document.createElement('button');
      const selected = nativeOption.selected;
      option.type = 'button';
      option.className = 'wip-uc-custom-option';
      option.dataset.value = nativeOption.value;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', selected ? 'true' : 'false');
      option.disabled = nativeOption.disabled;
      option.textContent = nativeOption.textContent?.trim() || nativeOption.label || nativeOption.value;
      if (selected) option.classList.add('is-selected');
      element.appendChild(option);
    });

    positionMenu(element, trigger);
    window.requestAnimationFrame?.(() => {
      element.querySelector('.is-selected')?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  function openMenu(select, trigger) {
    if (!select?.isConnected || !select.options.length) return;
    const sameTrigger = activeTrigger === trigger && !menu().hidden;
    if (sameTrigger) {
      closeMenu();
      return;
    }
    closeMenu();
    activeSelect = select;
    activeTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    fillMenu(select, trigger);
  }

  function syncSelect(select) {
    if (!select?.matches?.(SELECT_SELECTOR)) return;
    let wrapper = select.nextElementSibling;
    if (!wrapper?.classList?.contains('wip-uc-custom-select')) {
      wrapper = document.createElement('div');
      wrapper.className = 'wip-uc-custom-select';
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'wip-uc-custom-trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', MENU_ID);
      trigger.innerHTML = '<span class="wip-uc-custom-value"></span><span class="wip-uc-custom-chevron" aria-hidden="true"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      wrapper.appendChild(trigger);
      select.insertAdjacentElement('afterend', wrapper);
    }

    select.classList.add('wip-uc-native-select-hidden');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    const trigger = wrapper.querySelector('.wip-uc-custom-trigger');
    const value = trigger?.querySelector('.wip-uc-custom-value');
    const label = selectedLabel(select);
    if (value && value.textContent !== label) value.textContent = label;
    if (trigger) {
      trigger.setAttribute('aria-label', `${fieldLabel(select)} : ${label}`);
      trigger.disabled = select.disabled;
    }

    if (select.dataset.wipUcCustomSelectBound !== 'true') {
      select.dataset.wipUcCustomSelectBound = 'true';
      select.addEventListener('change', () => {
        syncSelect(select);
        if (activeSelect === select && activeTrigger) fillMenu(select, activeTrigger);
      });
    }
  }

  function syncAll() {
    syncQueued = false;
    document.querySelectorAll(SELECT_SELECTOR).forEach(syncSelect);
    if (activeSelect && !activeSelect.isConnected) closeMenu();
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame ? window.requestAnimationFrame(syncAll) : window.setTimeout(syncAll, 0);
  }

  function selectOption(optionButton) {
    if (!activeSelect || optionButton.disabled) return;
    activeSelect.value = optionButton.dataset.value ?? '';
    const select = activeSelect;
    closeMenu({ restoreFocus: true });
    syncSelect(select);
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function installStyle() {
    if (document.getElementById('wip-undercarriage-custom-select-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-custom-select-style';
    style.textContent = `
      ${SELECT_SELECTOR}.wip-uc-native-select-hidden{position:absolute!important;width:1px!important;height:1px!important;margin:0!important;padding:0!important;border:0!important;opacity:0!important;pointer-events:none!important;clip-path:inset(50%)!important;overflow:hidden!important}
      ${ROOT_SELECTOR} .wip-uc-custom-select{position:relative!important;width:100%!important;margin-top:.25rem!important;text-transform:none!important}
      ${ROOT_SELECTOR} .wip-uc-custom-trigger{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;width:100%!important;min-height:36px!important;margin:0!important;padding:.5rem .65rem!important;border:1px solid #e5e7eb!important;border-radius:.75rem!important;background:#fff!important;color:#334155!important;-webkit-text-fill-color:#334155!important;font-family:inherit!important;font-size:11px!important;font-weight:800!important;line-height:1.25!important;text-align:left!important;text-transform:none!important;box-shadow:none!important;cursor:pointer!important;opacity:1!important}
      ${ROOT_SELECTOR} .wip-uc-custom-trigger:hover,${ROOT_SELECTOR} .wip-uc-custom-trigger[aria-expanded="true"]{border-color:#eab308!important;box-shadow:0 0 0 2px rgba(234,179,8,.12)!important}
      ${ROOT_SELECTOR} .wip-uc-custom-trigger:focus-visible{outline:2px solid #eab308!important;outline-offset:2px!important}
      ${ROOT_SELECTOR} .wip-uc-custom-value{display:block!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:inherit!important;-webkit-text-fill-color:inherit!important}
      ${ROOT_SELECTOR} .wip-uc-custom-chevron{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;color:#475569!important;transition:transform .15s ease!important}
      ${ROOT_SELECTOR} .wip-uc-custom-trigger[aria-expanded="true"] .wip-uc-custom-chevron{transform:rotate(180deg)!important}
      #${MENU_ID}.wip-uc-custom-menu{position:fixed!important;z-index:50000!important;display:flex!important;flex-direction:column!important;gap:2px!important;overflow-x:hidden!important;overflow-y:auto!important;margin:0!important;padding:5px!important;border:1px solid #cbd5e1!important;border-radius:12px!important;background:#fff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;color-scheme:light!important;box-shadow:0 18px 48px rgba(15,23,42,.24)!important;opacity:1!important;text-transform:none!important}
      #${MENU_ID}.wip-uc-custom-menu[hidden]{display:none!important}
      #${MENU_ID} .wip-uc-custom-option{display:block!important;flex:0 0 auto!important;width:100%!important;min-height:34px!important;margin:0!important;padding:8px 10px!important;border:0!important;border-radius:8px!important;background:#fff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;font-size:12px!important;font-weight:700!important;line-height:1.35!important;text-align:left!important;text-transform:none!important;white-space:normal!important;cursor:pointer!important;opacity:1!important}
      #${MENU_ID} .wip-uc-custom-option:hover,#${MENU_ID} .wip-uc-custom-option:focus-visible{outline:none!important;background:#fef9c3!important;color:#713f12!important;-webkit-text-fill-color:#713f12!important}
      #${MENU_ID} .wip-uc-custom-option.is-selected{background:#fef3c7!important;color:#78350f!important;-webkit-text-fill-color:#78350f!important;font-weight:900!important}
      #${MENU_ID} .wip-uc-custom-option:disabled{color:#94a3b8!important;-webkit-text-fill-color:#94a3b8!important;cursor:not-allowed!important}
      .dark ${ROOT_SELECTOR} .wip-uc-custom-trigger{background:#0f172a!important;color:#e2e8f0!important;-webkit-text-fill-color:#e2e8f0!important;border-color:#334155!important}
      .dark ${ROOT_SELECTOR} .wip-uc-custom-chevron{color:#cbd5e1!important}
      .dark #${MENU_ID}.wip-uc-custom-menu{background:#0f172a!important;color:#f8fafc!important;-webkit-text-fill-color:#f8fafc!important;border-color:#475569!important;color-scheme:dark!important}
      .dark #${MENU_ID} .wip-uc-custom-option{background:#0f172a!important;color:#f8fafc!important;-webkit-text-fill-color:#f8fafc!important}
      .dark #${MENU_ID} .wip-uc-custom-option:hover,.dark #${MENU_ID} .wip-uc-custom-option:focus-visible,.dark #${MENU_ID} .wip-uc-custom-option.is-selected{background:#422006!important;color:#fef08a!important;-webkit-text-fill-color:#fef08a!important}
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target?.closest?.(`${ROOT_SELECTOR} .wip-uc-custom-trigger`);
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      const select = trigger.closest('.wip-uc-custom-select')?.previousElementSibling;
      if (select?.matches?.('select[data-uc]')) openMenu(select, trigger);
      return;
    }

    const option = event.target?.closest?.(`#${MENU_ID} .wip-uc-custom-option`);
    if (option) {
      event.preventDefault();
      selectOption(option);
      return;
    }

    if (event.target?.closest?.('#wip-uc-reset')) {
      window.setTimeout(syncAll, 0);
      window.setTimeout(syncAll, 80);
    }
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    const trigger = event.target?.closest?.(`${ROOT_SELECTOR} .wip-uc-custom-trigger`);
    if (trigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const select = trigger.closest('.wip-uc-custom-select')?.previousElementSibling;
      if (select?.matches?.('select[data-uc]')) {
        if (activeTrigger !== trigger || menu().hidden) openMenu(select, trigger);
        const options = [...menu().querySelectorAll('.wip-uc-custom-option:not(:disabled)')];
        (event.key === 'ArrowUp' ? options.at(-1) : options[0])?.focus?.();
      }
      return;
    }
    if (event.key === 'Escape' && activeSelect) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }
    const option = event.target?.closest?.(`#${MENU_ID} .wip-uc-custom-option`);
    if (!option || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = [...menu().querySelectorAll('.wip-uc-custom-option:not(:disabled)')];
    const index = options.indexOf(option);
    const next = event.key === 'Home' ? options[0]
      : event.key === 'End' ? options.at(-1)
      : event.key === 'ArrowDown' ? options[(index + 1) % options.length]
      : options[(index - 1 + options.length) % options.length];
    next?.focus?.();
  });

  window.addEventListener('resize', () => closeMenu());
  document.addEventListener('scroll', (event) => {
    if (event.target === document.getElementById(MENU_ID)
      || event.target?.closest?.(`#${MENU_ID}`)) return;
    closeMenu();
  }, true);

  function install() {
    installStyle();
    syncAll();
  }

  window.__wipSyncUndercarriageSelects = syncAll;
  install();
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('dashboard:data-ready', queueSync);
  window.setTimeout(install, 2000);
  try {
    new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        if (mutation.target?.matches?.(SELECT_SELECTOR)) return true;
        return [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
          node.nodeType === Node.ELEMENT_NODE
          && (node.matches?.(ROOT_SELECTOR) || node.matches?.(SELECT_SELECTOR) || node.querySelector?.(ROOT_SELECTOR) || node.querySelector?.(SELECT_SELECTOR))
        );
      });
      if (relevant) queueSync();
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {}
})();
