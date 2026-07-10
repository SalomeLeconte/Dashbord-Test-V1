(() => {
  const PATCH_ID = 'wip-feedback-modal-mailto-2026-07-10';
  window.__WIP_FEEDBACK_PATCH__ = PATCH_ID;

  const RECIPIENT = 'sleconte@komatsu.fr';
  const SUBJECT = 'DASHBOARD REVIEW';

  function feedbackModalHtml() {
    return `
      <div id="wip-feedback-modal" class="wip-feedback-modal" aria-hidden="true">
        <div class="wip-feedback-backdrop" data-feedback-close></div>
        <section class="wip-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="wip-feedback-title">
          <button type="button" class="wip-feedback-close" data-feedback-close aria-label="Fermer">×</button>
          <div id="wip-feedback-form-view">
            <div class="wip-feedback-kicker">Dashboard review</div>
            <h3 id="wip-feedback-title">Votre feedback</h3>
            <p class="wip-feedback-help">Décrivez l’amélioration souhaitée ou le problème rencontré.</p>
            <textarea id="wip-feedback-body" maxlength="4000" placeholder="Écrivez votre retour ici…" aria-label="Contenu du feedback"></textarea>
            <div class="wip-feedback-footer">
              <span id="wip-feedback-counter">0 / 4000</span>
              <button id="wip-feedback-send" type="button">Envoyer mon feedback</button>
            </div>
            <div id="wip-feedback-error" class="wip-feedback-error" role="alert"></div>
          </div>
          <div id="wip-feedback-success" class="wip-feedback-success" hidden>
            <div class="wip-feedback-success-icon" aria-hidden="true">✓</div>
            <div class="wip-feedback-success-title">Merci pour votre feedback.</div>
            <div class="wip-feedback-success-message">Salomé s'occupe de ça au plus vite !</div>
            <button type="button" class="wip-feedback-done" data-feedback-close>Fermer</button>
          </div>
        </section>
      </div>`;
  }

  function injectStyles() {
    if (document.getElementById('wip-feedback-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-feedback-style';
    style.textContent = `
      #wip-feedback-button{width:34px!important;height:34px!important;min-width:34px!important;padding:0!important;border-radius:10px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}
      #wip-feedback-button svg{width:17px;height:17px;display:block}
      .wip-feedback-modal{position:fixed;inset:0;z-index:120000;display:none;align-items:center;justify-content:center;padding:18px}
      .wip-feedback-modal.open{display:flex}.wip-feedback-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.62);backdrop-filter:blur(4px)}
      .wip-feedback-dialog{position:relative;width:min(560px,calc(100vw - 28px));border-radius:20px;background:#fff;color:#0f172a;border:1px solid #e5e7eb;box-shadow:0 28px 80px rgba(2,6,23,.35);padding:22px}
      .dark .wip-feedback-dialog{background:#0f172a;color:#f8fafc;border-color:#334155}.wip-feedback-close{position:absolute;right:12px;top:10px;width:32px;height:32px;border-radius:999px;border:0;background:transparent;color:#64748b;font-size:24px;line-height:1;cursor:pointer}.wip-feedback-close:hover{background:#f1f5f9;color:#0f172a}.dark .wip-feedback-close:hover{background:#1e293b;color:#fff}
      .wip-feedback-kicker{font-size:9px;font-weight:1000;letter-spacing:.13em;text-transform:uppercase;color:#b45309}.wip-feedback-dialog h3{margin:5px 0 0;font-size:21px;font-weight:1000}.wip-feedback-help{margin:6px 0 13px;font-size:12px;line-height:1.45;color:#64748b}.dark .wip-feedback-help{color:#94a3b8}
      #wip-feedback-body{width:100%;min-height:170px;resize:vertical;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:14px;padding:13px 14px;font:inherit;font-size:13px;line-height:1.5;color:#0f172a;background:#fff;outline:none}#wip-feedback-body:focus{border-color:#eab308;box-shadow:0 0 0 3px rgba(234,179,8,.14)}.dark #wip-feedback-body{background:#020617;color:#f8fafc;border-color:#475569}
      .wip-feedback-footer{margin-top:11px;display:flex;align-items:center;justify-content:space-between;gap:12px}#wip-feedback-counter{font-size:10px;color:#94a3b8}#wip-feedback-send{border:0;border-radius:11px;background:#0f172a;color:#fff;padding:10px 14px;font-size:11px;font-weight:1000;cursor:pointer}.dark #wip-feedback-send{background:#facc15;color:#422006}
      .wip-feedback-error{min-height:17px;margin-top:7px;font-size:10px;font-weight:700;color:#dc2626}.wip-feedback-success{text-align:center;padding:20px 6px 6px}.wip-feedback-success-icon{width:52px;height:52px;margin:0 auto 12px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#dcfce7;color:#15803d;font-size:26px;font-weight:1000}.wip-feedback-success-title{font-size:16px;font-weight:1000}.wip-feedback-success-message{margin-top:6px;font-size:13px;color:#475569}.dark .wip-feedback-success-message{color:#cbd5e1}.wip-feedback-done{margin-top:18px;border:0;border-radius:10px;padding:9px 14px;background:#0f172a;color:#fff;font-size:11px;font-weight:900;cursor:pointer}.dark .wip-feedback-done{background:#facc15;color:#422006}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (document.getElementById('wip-feedback-modal')) return;
    document.body.insertAdjacentHTML('beforeend', feedbackModalHtml());

    const modal = document.getElementById('wip-feedback-modal');
    const textarea = document.getElementById('wip-feedback-body');
    const counter = document.getElementById('wip-feedback-counter');
    const sendButton = document.getElementById('wip-feedback-send');

    modal.querySelectorAll('[data-feedback-close]').forEach((button) => button.addEventListener('click', closeFeedbackModal));
    textarea.addEventListener('input', () => { counter.textContent = `${textarea.value.length} / 4000`; });
    sendButton.addEventListener('click', submitFeedback);
  }

  function openFeedbackModal() {
    ensureModal();
    const modal = document.getElementById('wip-feedback-modal');
    document.getElementById('wip-feedback-form-view').hidden = false;
    document.getElementById('wip-feedback-success').hidden = true;
    document.getElementById('wip-feedback-error').textContent = '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('wip-feedback-body')?.focus(), 40);
  }

  function closeFeedbackModal() {
    const modal = document.getElementById('wip-feedback-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function submitFeedback() {
    const textarea = document.getElementById('wip-feedback-body');
    const errorBox = document.getElementById('wip-feedback-error');
    const message = textarea.value.trim();

    if (message.length < 3) {
      errorBox.textContent = 'Merci de saisir un message avant l’envoi.';
      textarea.focus();
      return;
    }

    errorBox.textContent = '';
    const body = `${message}\n\nPage : ${window.location.href}`;
    const mailto = `mailto:${RECIPIENT}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`;

    document.getElementById('wip-feedback-form-view').hidden = true;
    document.getElementById('wip-feedback-success').hidden = false;
    textarea.value = '';
    document.getElementById('wip-feedback-counter').textContent = '0 / 4000';

    setTimeout(() => {
      window.location.href = mailto;
    }, 80);
  }

  function installFeedbackButton() {
    const noveltyButton = document.getElementById('v18-info-button');
    if (!noveltyButton) return;

    let button = document.getElementById('wip-feedback-button');
    if (!button) {
      button = document.createElement('button');
      button.id = 'wip-feedback-button';
      button.type = 'button';
      button.className = noveltyButton.className;
      button.title = 'Suggérer une amélioration ou signaler un problème';
      button.setAttribute('aria-label', 'Suggérer une amélioration ou signaler un problème');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.75 5.75h16.5v12.5H3.75z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4.5 6.5 7.5 6 7.5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      button.addEventListener('click', openFeedbackModal);
      noveltyButton.insertAdjacentElement('afterend', button);
    }
  }

  function installKeyboardClose() {
    if (window.__wipFeedbackEscapeInstalled) return;
    window.__wipFeedbackEscapeInstalled = true;
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeFeedbackModal();
    });
  }

  function install() {
    injectStyles();
    ensureModal();
    installFeedbackButton();
    installKeyboardClose();
  }

  install();
  document.addEventListener('DOMContentLoaded', () => {
    [200, 900, 2200, 4500, 7000, 10000, 13000].forEach((delay) => setTimeout(install, delay));
  });
  [500, 1500, 3200, 5600, 8200, 11200].forEach((delay) => setTimeout(install, delay));
})();