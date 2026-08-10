(() => {
  const PATCH_ID = 'wip-undercarriage-native-visual-final-2026-08-10-v2';
  if (window.__WIP_UNDERCARRIAGE_NATIVE_VISUAL_FINAL_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_NATIVE_VISUAL_FINAL_PATCH__ = PATCH_ID;

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  function isVisible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 120 && rect.height > 24;
  }

  function findHeaderByTitle(titleStart) {
    const target = norm(titleStart);
    const candidates = [...document.querySelectorAll('button, summary, [role="button"], div, h3, h4')]
      .filter((node) => isVisible(node) && norm(node.textContent || '').startsWith(target));

    return candidates
      .map((node) => {
        const clickable = node.closest('button, summary, [role="button"]') || node;
        let block = clickable;
        let current = clickable;
        for (let i = 0; i < 4 && current?.parentElement; i += 1) {
          const parent = current.parentElement;
          const text = norm(parent.textContent || '');
          const rect = parent.getBoundingClientRect();
          const looksLikeHeader = text.startsWith(target) && text.length <= 80 && rect.height >= 32 && rect.height <= 72;
          if (looksLikeHeader) block = parent;
          current = parent;
        }
        return block;
      })
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0] || null;
  }

  function findNativeReferenceHeader() {
    return findHeaderByTitle('6. priorité clients')
      || findHeaderByTitle('6. priorite clients')
      || findHeaderByTitle('5. secteur')
      || findHeaderByTitle('1. données brutes')
      || findHeaderByTitle('1. donnees brutes');
  }

  function headerContainer(header) {
    if (!header) return null;
    let best = header;
    let current = header;
    for (let i = 0; i < 4 && current?.parentElement; i += 1) {
      const parent = current.parentElement;
      const rect = parent.getBoundingClientRect();
      if (rect.width >= header.getBoundingClientRect().width - 8 && rect.height >= header.getBoundingClientRect().height && rect.height <= 90) best = parent;
      current = parent;
    }
    return best;
  }

  function copyComputed(source, target, props) {
    if (!source || !target) return;
    const cs = getComputedStyle(source);
    props.forEach((prop) => {
      const value = cs.getPropertyValue(prop);
      if (value) target.style.setProperty(prop, value, 'important');
    });
  }

  function findTitleText(header) {
    if (!header) return null;
    const nodes = [...header.querySelectorAll('span, div, strong, b')]
      .filter((node) => {
        const text = norm(node.textContent || '');
        const rect = node.getBoundingClientRect();
        return rect.width > 20 && rect.height > 8 && /priorit|secteur|donnees|clients/.test(text);
      });
    return nodes.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0] || header;
  }

  function findChevron(header) {
    if (!header) return null;
    const children = [...header.querySelectorAll('svg, i, .chevron, [class*="chevron"], [class*="Chevron"], span')];
    return children.filter((node) => {
      const text = norm(node.textContent || '');
      const rect = node.getBoundingClientRect();
      if (text.includes('priorite') || text.includes('clients') || text.includes('secteur')) return false;
      return rect.width <= 32 && rect.height <= 32;
    }).sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.left - ar.left;
    })[0] || null;
  }

  function makeFallbackChevron() {
    const span = document.createElement('span');
    span.className = 'wip-uc-native-chevron-fallback';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return span;
  }

  function replaceChevron(summary, referenceHeader) {
    if (!summary) return;
    const current = summary.querySelector('.wip-undercarriage-integrated-chevron, .wip-uc-native-chevron, .wip-uc-native-chevron-fallback');
    const referenceChevron = findChevron(referenceHeader);
    const clone = referenceChevron ? referenceChevron.cloneNode(true) : makeFallbackChevron();
    clone.classList.add('wip-uc-native-chevron');
    clone.setAttribute('aria-hidden', 'true');

    if (current) current.replaceWith(clone);
    else summary.appendChild(clone);
  }

  function alignVisual() {
    const accordion = document.getElementById('wip-undercarriage-integrated-accordion');
    const summary = accordion?.querySelector('.wip-undercarriage-integrated-summary, summary');
    const titleSpan = summary?.querySelector('span:first-child');
    const body = document.getElementById('wip-undercarriage-integrated-body');
    if (!accordion || !summary) return;

    const refHeader = findNativeReferenceHeader();
    const refContainer = headerContainer(refHeader) || refHeader;
    const refTitle = findTitleText(refHeader);

    accordion.classList.add('wip-uc-native-visual-final');
    summary.classList.add('wip-uc-native-visual-final-summary');
    titleSpan?.classList.add('wip-uc-native-title-text');
    body?.classList.add('wip-uc-native-visual-final-body');

    if (refContainer) {
      copyComputed(refContainer, accordion, [
        'background', 'background-color', 'background-image', 'border', 'border-left', 'border-radius',
        'box-shadow', 'margin-top', 'margin-bottom', 'overflow', 'min-height'
      ]);
    }

    if (refHeader) {
      copyComputed(refHeader, summary, [
        'background', 'background-color', 'background-image', 'color', 'font-size', 'font-weight',
        'letter-spacing', 'text-transform', 'line-height', 'min-height', 'height', 'padding-top',
        'padding-right', 'padding-bottom', 'padding-left', 'display', 'align-items', 'justify-content',
        'gap', 'border-radius'
      ]);
      replaceChevron(summary, refHeader);
    } else {
      replaceChevron(summary, null);
    }

    if (titleSpan) {
      const source = refTitle || refHeader || summary;
      copyComputed(source, titleSpan, [
        'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-transform', 'line-height', 'color'
      ]);
      titleSpan.style.setProperty('display', 'inline-flex', 'important');
      titleSpan.style.setProperty('align-items', 'center', 'important');
    }
  }

  function installStyle() {
    if (document.getElementById('wip-undercarriage-native-visual-final-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-native-visual-final-style';
    style.textContent = `
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final{border:1px solid #e2e8f0!important;border-left:4px solid #eab308!important;border-radius:14px!important;background:linear-gradient(90deg,#fffbeb 0%,#f8fafc 100%)!important;box-shadow:none!important;margin:0 0 12px!important;overflow:hidden!important}
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final>summary.wip-uc-native-visual-final-summary{list-style:none!important;display:flex!important;align-items:center!important;justify-content:space-between!important;min-height:46px!important;padding:0 14px!important;background:linear-gradient(90deg,#fffbeb 0%,#f8fafc 100%)!important;color:#334155!important;font-size:11px!important;font-weight:1000!important;letter-spacing:.055em!important;text-transform:uppercase!important;cursor:pointer!important;user-select:none!important;border-radius:14px!important}
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final>summary.wip-uc-native-visual-final-summary .wip-uc-native-title-text,
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final>summary.wip-uc-native-visual-final-summary>span:first-child{font-size:11px!important;font-weight:1000!important;letter-spacing:.055em!important;text-transform:uppercase!important;line-height:1!important;color:#334155!important;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final>summary.wip-uc-native-visual-final-summary::-webkit-details-marker{display:none!important}
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final>summary.wip-uc-native-visual-final-summary::marker{content:""!important}
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final .wip-undercarriage-integrated-chevron{display:none!important}
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final .wip-uc-native-chevron,
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final .wip-uc-native-chevron-fallback{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:16px!important;height:16px!important;color:#94a3b8!important;transition:transform .18s ease!important;flex:0 0 auto!important;margin-left:8px!important}
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final[open] .wip-uc-native-chevron{transform:rotate(180deg)!important}
      #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final[open] .wip-uc-native-chevron-fallback{transform:rotate(180deg)!important}
      #wip-undercarriage-integrated-body.wip-uc-native-visual-final-body{border-top:1px solid #e2e8f0!important;background:#fff!important;padding:0!important}
      .dark #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final{background:linear-gradient(90deg,rgba(234,179,8,.08),rgba(15,23,42,.92))!important;border-color:#334155!important;border-left-color:#eab308!important}
      .dark #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final>summary.wip-uc-native-visual-final-summary{background:linear-gradient(90deg,rgba(234,179,8,.08),rgba(15,23,42,.92))!important;color:#e2e8f0!important}
      .dark #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final>summary.wip-uc-native-visual-final-summary .wip-uc-native-title-text,
      .dark #wip-undercarriage-integrated-accordion.wip-uc-native-visual-final>summary.wip-uc-native-visual-final-summary>span:first-child{color:#e2e8f0!important}
      .dark #wip-undercarriage-integrated-body.wip-uc-native-visual-final-body{border-top-color:#334155!important;background:#020617!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    alignVisual();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [80, 200, 500, 900, 1500, 2600, 4200, 7000, 11000, 16000].forEach((delay) => setTimeout(install, delay));
  });
  [120, 350, 800, 1300, 2200, 3600, 5600, 8500, 12500, 18000, 24000].forEach((delay) => setTimeout(install, delay));
  try { new MutationObserver(() => setTimeout(install, 0)).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
