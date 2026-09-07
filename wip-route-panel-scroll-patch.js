(() => {
  const PATCH_ID = 'wip-route-panel-scroll-2026-09-07-v1';
  if (window.__WIP_ROUTE_PANEL_SCROLL_PATCH__ === PATCH_ID) return;
  window.__WIP_ROUTE_PANEL_SCROLL_PATCH__ = PATCH_ID;

  function injectStyles() {
    if (document.getElementById('wip-route-panel-scroll-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-route-panel-scroll-style';
    style.textContent = `
      #route-steps{
        box-sizing:border-box!important;
        overflow-y:auto!important;
        overscroll-behavior:contain!important;
        scrollbar-gutter:stable!important;
        scroll-padding-bottom:1.4rem!important;
        padding-bottom:1.4rem!important;
      }
      #route-steps > :last-child{
        margin-bottom:.75rem!important;
      }
      @media (max-width:767px){
        #route-steps{
          max-height:min(52dvh,calc(100dvh - 150px))!important;
        }
      }
      @media (min-width:768px) and (max-width:1180px){
        #route-steps{
          max-height:min(70vh,calc(100dvh - 120px))!important;
        }
      }
      @media (min-width:1181px){
        #route-steps{
          max-height:min(68vh,calc(100dvh - 110px))!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function keepLastCardReachable() {
    const panel = document.getElementById('route-steps');
    if (!panel || panel.dataset.wipRoutePanelScroll === PATCH_ID) return;
    panel.dataset.wipRoutePanelScroll = PATCH_ID;
    panel.style.overflowY = 'auto';
  }

  function install() {
    injectStyles();
    keepLastCardReachable();
  }

  install();
  document.addEventListener('DOMContentLoaded', install);
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
