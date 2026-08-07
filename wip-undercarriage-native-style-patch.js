(() => {
  const PATCH_ID = 'wip-undercarriage-native-style-2026-08-07';
  if (window.__WIP_UNDERCARRIAGE_NATIVE_STYLE_PATCH__ === PATCH_ID) return;
  window.__WIP_UNDERCARRIAGE_NATIVE_STYLE_PATCH__ = PATCH_ID;

  const ACCORDION_ID = 'wip-undercarriage-integrated-accordion';
  const SUMMARY_SELECTOR = '.wip-undercarriage-integrated-summary';
  const CHEVRON_SELECTOR = '.wip-undercarriage-integrated-chevron, .wip-undercarriage-native-chevron';

  const norm = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  function textIncludes(node, expected) {
    return norm(node?.textContent || '').includes(norm(expected));
  }

  function visible(node) {
    if (!node || node.closest(`#${ACCORDION_ID}`)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && rect.width > 180
      && rect.height >= 34
      && rect.height <= 90;
  }

  function findReferenceHeader() {
    const exact = [...document.querySelectorAll('button, summary, div, section')]
      .filter((node) => visible(node) && textIncludes(node, '6. PRIORITÉ CLIENTS'))
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
    if (exact) return exact;

    return [...document.querySelectorAll('button, summary, div, section')]
      .filter((node) => visible(node) && /^\s*[1-6][\.)]?\s+/.test(norm(node.textContent || '')))
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0] || null;
  }

  function findReferenceChevron(reference) {
    if (!reference) return null;
    const candidates = [...reference.querySelectorAll('svg, [id^="icon-"], [class*="chevron" i], [class*="rotate" i], span')]
      .filter((node) => {
        const rect = node.getBoundingClientRect?.();
        const text = norm(node.textContent || '');
        return rect && rect.width <= 40 && rect.height <= 40 && (node.tagName === 'svg' || text === '⌄' || text === 'v' || node.id?.startsWith('icon-') || /chevron|rotate/i.test(String(node.className || '')));
      });
    return candidates.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0] || null;
  }

  function copyImportantStyle(from, to, properties) {
    if (!from || !to) return;
    const computed = getComputedStyle(from);
    properties.forEach((property) => {
      const value = computed.getPropertyValue(property);
      if (value) to.style.setProperty(property, value, 'important');
    });
  }

  function syncOpenState(accordion, referenceChevron, clonedChevron) {
    const isOpen = accordion.hasAttribute('open');
    if (referenceChevron && clonedChevron) {
      const refClass = String(referenceChevron.getAttribute('class') || '');
      clonedChevron.setAttribute('class', refClass);
      clonedChevron.classList.add('wip-undercarriage-native-chevron');
      clonedChevron.removeAttribute('id');
      clonedChevron.style.setProperty('transform', isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 'important');
      clonedChevron.style.setProperty('transition', 'transform .18s ease', 'important');
      clonedChevron.style.setProperty('flex-shrink', '0', 'important');
    }
  }

  function installNativeLook() {
    const accordion = document.getElementById(ACCORDION_ID);
    const summary = accordion?.querySelector(SUMMARY_SELECTOR);
    if (!accordion || !summary) return;

    const reference = findReferenceHeader();
    if (!reference) return;

    const referenceChevron = findReferenceChevron(reference);

    accordion.classList.add('wip-undercarriage-native-accordion');
    summary.classList.add('wip-undercarriage-native-summary');

    copyImportantStyle(reference, accordion, [
      'background', 'background-color', 'background-image', 'border', 'border-left', 'border-color',
      'border-left-color', 'border-left-width', 'border-radius', 'box-shadow', 'margin-top', 'margin-bottom',
      'min-height', 'height', 'width'
    ]);
    copyImportantStyle(reference, summary, [
      'background', 'background-color', 'background-image', 'color', 'font-family', 'font-size',
      'font-weight', 'letter-spacing', 'text-transform', 'line-height', 'min-height', 'height',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-radius'
    ]);

    accordion.style.setProperty('display', 'block', 'important');
    accordion.style.setProperty('box-sizing', 'border-box', 'important');
    accordion.style.setProperty('overflow', 'hidden', 'important');
    summary.style.setProperty('display', 'flex', 'important');
    summary.style.setProperty('align-items', 'center', 'important');
    summary.style.setProperty('justify-content', 'space-between', 'important');
    summary.style.setProperty('cursor', 'pointer', 'important');
    summary.style.setProperty('list-style', 'none', 'important');

    let label = summary.querySelector('.wip-undercarriage-native-label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'wip-undercarriage-native-label';
      label.textContent = '7. UNDERCARRIAGE';
      summary.replaceChildren(label);
    }
    label.textContent = '7. UNDERCARRIAGE';
    copyImportantStyle(reference, label, [
      'color', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-transform', 'line-height'
    ]);

    let chevron = summary.querySelector(CHEVRON_SELECTOR);
    if (referenceChevron) {
      const clone = referenceChevron.cloneNode(true);
      clone.removeAttribute('id');
      clone.classList.add('wip-undercarriage-native-chevron');
      if (chevron) chevron.replaceWith(clone);
      else summary.appendChild(clone);
      chevron = clone;
      copyImportantStyle(referenceChevron, chevron, ['width', 'height', 'color', 'stroke', 'fill', 'opacity']);
    } else if (!chevron) {
      chevron = document.createElement('span');
      chevron.className = 'wip-undercarriage-native-chevron';
      chevron.textContent = '⌄';
      summary.appendChild(chevron);
    }

    syncOpenState(accordion, referenceChevron, chevron);
    accordion.dataset.wipNativeStyleSynced = 'true';
  }

  function installStyle() {
    if (document.getElementById('wip-undercarriage-native-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-undercarriage-native-style';
    style.textContent = `
      #wip-undercarriage-integrated-accordion.wip-undercarriage-native-accordion .wip-undercarriage-integrated-summary::-webkit-details-marker{display:none!important}
      #wip-undercarriage-integrated-accordion.wip-undercarriage-native-accordion .wip-undercarriage-integrated-summary::marker{content:""!important}
      #wip-undercarriage-integrated-accordion.wip-undercarriage-native-accordion[open] .wip-undercarriage-native-chevron{transform:rotate(180deg)!important}
      #wip-undercarriage-integrated-accordion.wip-undercarriage-native-accordion:not([open]) .wip-undercarriage-native-chevron{transform:rotate(0deg)!important}
      #wip-undercarriage-integrated-accordion.wip-undercarriage-native-accordion .wip-undercarriage-native-chevron{transition:transform .18s ease!important;flex-shrink:0!important}
      #wip-undercarriage-integrated-accordion.wip-undercarriage-native-accordion .wip-undercarriage-integrated-body{background:#fff!important;border-top:1px solid #e5e7eb!important;padding:0!important}
      .dark #wip-undercarriage-integrated-accordion.wip-undercarriage-native-accordion .wip-undercarriage-integrated-body{background:#020617!important;border-top-color:#334155!important}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    installNativeLook();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => [100, 300, 700, 1300, 2600, 5200, 9000, 14000].forEach((delay) => setTimeout(install, delay)));
  [120, 350, 800, 1600, 3200, 6400, 10000, 15000].forEach((delay) => setTimeout(install, delay));
  document.addEventListener('toggle', (event) => {
    if (event.target?.id === ACCORDION_ID) setTimeout(installNativeLook, 0);
  }, true);
  try { new MutationObserver(() => setTimeout(install, 0)).observe(document.documentElement, { childList: true, subtree: true }); } catch (error) {}
})();
