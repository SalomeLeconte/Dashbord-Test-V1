(() => {
  const PATCH_ID = 'wip-feedback-mailto-2026-07-10';
  window.__WIP_FEEDBACK_PATCH__ = PATCH_ID;

  function openDashboardReviewMail() {
    const recipient = 'sleconte@komatsu.fr';
    const subject = 'DASHBOARD REVIEW';
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}`;
  }

  function injectStyles() {
    if (document.getElementById('wip-feedback-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-feedback-style';
    style.textContent = `
      #wip-feedback-button{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;white-space:nowrap}
      #wip-feedback-button .wip-feedback-icon{font-size:13px;line-height:1}
    `;
    document.head.appendChild(style);
  }

  function installFeedbackButton() {
    const noveltyButton = document.getElementById('v18-info-button');
    if (!noveltyButton || document.getElementById('wip-feedback-button')) return;

    const button = document.createElement('button');
    button.id = 'wip-feedback-button';
    button.type = 'button';
    button.className = noveltyButton.className;
    button.title = 'Suggérer une amélioration ou signaler un problème';
    button.setAttribute('aria-label', 'Suggérer une amélioration ou signaler un problème');
    button.innerHTML = '<span class="wip-feedback-icon" aria-hidden="true">✉</span><span>Feedback</span>';
    button.addEventListener('click', openDashboardReviewMail);

    noveltyButton.insertAdjacentElement('afterend', button);
  }

  function install() {
    injectStyles();
    installFeedbackButton();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [200, 900, 2200, 4500, 7000, 10000, 13000].forEach((delay) => setTimeout(install, delay));
  });
  [500, 1500, 3200, 5600, 8200, 11200].forEach((delay) => setTimeout(install, delay));
})();