(() => {
  const PATCH_ID = 'wip-feedback-modal-mailto-send-animation-2026-07-10';
  window.__WIP_FEEDBACK_PATCH__ = PATCH_ID;

  const RECIPIENT = 'sleconte@komatsu.fr';
  const SUBJECT = 'DASHBOARD REVIEW';
  const THANK_YOU_DELAY_MS = 15000;
  let thankYouTimer = null;

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

          <div id="wip-feedback-loading" class="wip-feedback-loading" hidden>
            <div class="wip-feedback-loading-title">Votre message est prêt dans Outlook</div>
            <div class="wip-feedback-loading-help">Il ne reste plus qu’à cliquer sur <strong>Envoyer</strong> dans Outlook.</div>
            <div class="wip-outlook-demo" aria-hidden="true">
              <div class="wip-outlook-bar">
                <span class="wip-outlook-dot"></span>
                <span class="wip-outlook-name">Outlook</span>
              </div>
              <div class="wip-outlook-body">
                <div class="wip-outlook-fields">
                  <div><span>À</span><strong>${RECIPIENT}</strong></div>
                  <div><span>Objet</span><strong>${SUBJECT}</strong></div>
                </div>
                <div class="wip-outlook-message-lines"><span></span><span></span><span></span></div>
                <button type="button" class="wip-outlook-send-demo">Envoyer</button>
                <svg class="wip-outlook-cursor" viewBox="0 0 32 40">
                  <path d="M3 2 27 23l-10 1 6 11-6 3-6-12-8 8Z" fill="#fff" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                <span class="wip-outlook-click-ring"></span>
              </div>
            </div>
            <div class="wip-feedback-wait-line"><span></span>Ouverture d’Outlook…</div>
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
      #wip-feedback-button,#v18-info-button{width:34px!important;height:34px!important;min-width:34px!important;padding:0!important;border-radius:10px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;position:relative!important;overflow:visible!important}
      #wip-feedback-button svg,#v18-info-button svg{width:17px;height:17px;display:block;pointer-events:none}
      [data-wip-hover-label]::after{content:attr(data-wip-hover-label);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translate(-50%,5px);opacity:0;visibility:hidden;pointer-events:none;white-space:nowrap;z-index:130000;padding:6px 8px;border-radius:7px;background:#0f172a;color:#fff;font-size:10px;font-weight:800;line-height:1;box-shadow:0 8px 20px rgba(2,6,23,.2);transition:opacity .14s ease,transform .14s ease,visibility .14s ease}
      [data-wip-hover-label]:hover::after,[data-wip-hover-label]:focus-visible::after{opacity:1;visibility:visible;transform:translate(-50%,0)}
      .dark [data-wip-hover-label]::after{background:#f8fafc;color:#0f172a}

      .wip-feedback-modal{position:fixed;inset:0;z-index:120000;display:none;align-items:center;justify-content:center;padding:18px}
      .wip-feedback-modal.open{display:flex}.wip-feedback-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.62);backdrop-filter:blur(4px)}
      .wip-feedback-dialog{position:relative;width:min(560px,calc(100vw - 28px));border-radius:20px;background:#fff;color:#0f172a;border:1px solid #e5e7eb;box-shadow:0 28px 80px rgba(2,6,23,.35);padding:22px}
      .dark .wip-feedback-dialog{background:#0f172a;color:#f8fafc;border-color:#334155}.wip-feedback-close{position:absolute;right:12px;top:10px;width:32px;height:32px;border-radius:999px;border:0;background:transparent;color:#64748b;font-size:24px;line-height:1;cursor:pointer}.wip-feedback-close:hover{background:#f1f5f9;color:#0f172a}.dark .wip-feedback-close:hover{background:#1e293b;color:#fff}
      .wip-feedback-kicker{font-size:9px;font-weight:1000;letter-spacing:.13em;text-transform:uppercase;color:#b45309}.wip-feedback-dialog h3{margin:5px 0 0;font-size:21px;font-weight:1000}.wip-feedback-help{margin:6px 0 13px;font-size:12px;line-height:1.45;color:#64748b}.dark .wip-feedback-help{color:#94a3b8}
      #wip-feedback-body{width:100%;min-height:170px;resize:vertical;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:14px;padding:13px 14px;font:inherit;font-size:13px;line-height:1.5;color:#0f172a;background:#fff;outline:none}#wip-feedback-body:focus{border-color:#eab308;box-shadow:0 0 0 3px rgba(234,179,8,.14)}.dark #wip-feedback-body{background:#020617;color:#f8fafc;border-color:#475569}
      .wip-feedback-footer{margin-top:11px;display:flex;align-items:center;justify-content:space-between;gap:12px}#wip-feedback-counter{font-size:10px;color:#94a3b8}#wip-feedback-send{border:0;border-radius:11px;background:#0f172a;color:#fff;padding:10px 14px;font-size:11px;font-weight:1000;cursor:pointer}.dark #wip-feedback-send{background:#facc15;color:#422006}
      .wip-feedback-error{min-height:17px;margin-top:7px;font-size:10px;font-weight:700;color:#dc2626}

      .wip-feedback-loading{text-align:center;padding:10px 2px 4px}.wip-feedback-loading-title{font-size:17px;font-weight:1000}.wip-feedback-loading-help{margin-top:6px;font-size:12px;line-height:1.45;color:#64748b}.dark .wip-feedback-loading-help{color:#94a3b8}
      .wip-outlook-demo{width:min(430px,100%);margin:18px auto 12px;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 18px 38px rgba(15,23,42,.14);text-align:left}.dark .wip-outlook-demo{background:#f8fafc;color:#0f172a}
      .wip-outlook-bar{height:34px;background:#0f6cbd;color:#fff;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:11px;font-weight:800}.wip-outlook-dot{width:8px;height:8px;border-radius:999px;background:#fff;opacity:.9}.wip-outlook-body{position:relative;padding:13px 14px 16px;min-height:150px}.wip-outlook-fields{display:grid;gap:5px;border-bottom:1px solid #e2e8f0;padding-bottom:8px}.wip-outlook-fields div{display:grid;grid-template-columns:48px 1fr;gap:8px;font-size:10px;align-items:center}.wip-outlook-fields span{color:#64748b}.wip-outlook-fields strong{font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .wip-outlook-message-lines{display:grid;gap:7px;margin:14px 0 16px}.wip-outlook-message-lines span{height:5px;border-radius:999px;background:#e2e8f0}.wip-outlook-message-lines span:nth-child(1){width:82%}.wip-outlook-message-lines span:nth-child(2){width:64%}.wip-outlook-message-lines span:nth-child(3){width:73%}.wip-outlook-send-demo{position:relative;border:0;border-radius:7px;background:#0f6cbd;color:#fff;padding:8px 15px;font-size:10px;font-weight:800}
      .wip-outlook-cursor{position:absolute;width:28px;height:35px;left:76%;top:76%;z-index:3;filter:drop-shadow(0 3px 4px rgba(15,23,42,.25));animation:wipOutlookCursor 2.4s ease-in-out infinite}.wip-outlook-click-ring{position:absolute;left:69px;bottom:23px;width:26px;height:26px;border:2px solid rgba(15,108,189,.55);border-radius:999px;opacity:0;transform:scale(.45);animation:wipOutlookClick 2.4s ease-out infinite}
      @keyframes wipOutlookCursor{0%,18%{left:76%;top:76%}48%,72%{left:84px;top:117px}82%,100%{left:76%;top:76%}}@keyframes wipOutlookClick{0%,45%{opacity:0;transform:scale(.45)}52%{opacity:1;transform:scale(.45)}67%{opacity:0;transform:scale(1.55)}100%{opacity:0}}
      .wip-feedback-wait-line{display:inline-flex;align-items:center;gap:8px;margin-top:2px;font-size:10px;font-weight:800;color:#64748b}.wip-feedback-wait-line span{width:12px;height:12px;border-radius:999px;border:2px solid #cbd5e1;border-top-color:#0f6cbd;animation:wipFeedbackSpin .8s linear infinite}@keyframes wipFeedbackSpin{to{transform:rotate(360deg)}}

      .wip-feedback-success{text-align:center;padding:20px 6px 6px}.wip-feedback-success-icon{width:52px;height:52px;margin:0 auto 12px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#dcfce7;color:#15803d;font-size:26px;font-weight:1000}.wip-feedback-success-title{font-size:16px;font-weight:1000}.wip-feedback-success-message{margin-top:6px;font-size:13px;color:#475569}.dark .wip-feedback-success-message{color:#cbd5e1}.wip-feedback-done{margin-top:18px;border:0;border-radius:10px;padding:9px 14px;background:#0f172a;color:#fff;font-size:11px;font-weight:900;cursor:pointer}.dark .wip-feedback-done{background:#facc15;color:#422006}
      @media(prefers-reduced-motion:reduce){.wip-outlook-cursor,.wip-outlook-click-ring,.wip-feedback-wait-line span{animation:none!important}}
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

  function setFeedbackView(view) {
    const form = document.getElementById('wip-feedback-form-view');
    const loading = document.getElementById('wip-feedback-loading');
    const success = document.getElementById('wip-feedback-success');
    if (!form || !loading || !success) return;
    form.hidden = view !== 'form';
    loading.hidden = view !== 'loading';
    success.hidden = view !== 'success';
  }

  function openFeedbackModal() {
    ensureModal();
    if (thankYouTimer) {
      clearTimeout(thankYouTimer);
      thankYouTimer = null;
    }
    const modal = document.getElementById('wip-feedback-modal');
    setFeedbackView('form');
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

    setFeedbackView('loading');
    textarea.value = '';
    document.getElementById('wip-feedback-counter').textContent = '0 / 4000';

    setTimeout(() => {
      window.location.href = mailto;
    }, 250);

    if (thankYouTimer) clearTimeout(thankYouTimer);
    thankYouTimer = setTimeout(() => {
      setFeedbackView('success');
      thankYouTimer = null;
    }, THANK_YOU_DELAY_MS);
  }

  function styleNoveltyButton(noveltyButton) {
    noveltyButton.setAttribute('data-wip-hover-label', 'Nouveautés');
    noveltyButton.setAttribute('aria-label', 'Nouveautés');
    noveltyButton.removeAttribute('title');
    noveltyButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M8.6 15.2A7 7 0 1 1 15.4 15.2c-.9.7-1.4 1.5-1.4 2.3h-4c0-.8-.5-1.6-1.4-2.3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function installFeedbackButton() {
    const noveltyButton = document.getElementById('v18-info-button');
    if (!noveltyButton) return;

    styleNoveltyButton(noveltyButton);

    let button = document.getElementById('wip-feedback-button');
    if (!button) {
      button = document.createElement('button');
      button.id = 'wip-feedback-button';
      button.type = 'button';
      button.className = noveltyButton.className;
      button.setAttribute('data-wip-hover-label', 'Feedback');
      button.setAttribute('aria-label', 'Feedback');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.75 5.75h16.5v12.5H3.75z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4.5 6.5 7.5 6 7.5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      button.addEventListener('click', openFeedbackModal);
      noveltyButton.insertAdjacentElement('afterend', button);
    } else {
      button.setAttribute('data-wip-hover-label', 'Feedback');
      button.setAttribute('aria-label', 'Feedback');
      button.removeAttribute('title');
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