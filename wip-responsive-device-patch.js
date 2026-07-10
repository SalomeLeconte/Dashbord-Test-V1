(() => {
  const PATCH_ID = 'wip-responsive-iphone-ipad-2026-07-10';
  window.__WIP_RESPONSIVE_DEVICE_PATCH__ = PATCH_ID;

  function injectResponsiveStyles() {
    if (document.getElementById('wip-responsive-device-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-responsive-device-style';
    style.textContent = `
      html,body{min-height:100%;overscroll-behavior:none}
      button,select,input,textarea{-webkit-tap-highlight-color:transparent}

      @media (max-width:767px){
        html,body{height:100dvh!important;min-height:100dvh!important}
        body{padding-bottom:env(safe-area-inset-bottom,0px)}
        header{padding-top:max(.5rem,env(safe-area-inset-top,0px))!important;padding-left:max(.55rem,env(safe-area-inset-left,0px))!important;padding-right:max(.55rem,env(safe-area-inset-right,0px))!important;gap:.4rem!important;min-height:54px}
        header>div{min-width:0}
        header>div:first-child{gap:.35rem!important;flex:1 1 auto;overflow:hidden}
        header>div:last-child{gap:.3rem!important;flex:0 0 auto;white-space:nowrap}
        header button,#wip-feedback-button,#v18-info-button{min-width:36px!important;min-height:36px!important}
        #active-user-indicator{max-width:38vw!important;min-width:0!important}
        #active-user-name{max-width:23vw!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        main{min-height:0!important;height:100%!important;padding:.5rem!important;gap:.5rem!important}
        main>details{flex:0 0 auto}
        #view-table,#view-top200,#view-map{min-height:0!important}
        #view-map{height:100%!important}
        #map{min-height:330px!important}
        div:has(>#tab-table):has(>#tab-map){overflow-x:auto!important;overflow-y:hidden!important;display:flex!important;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        div:has(>#tab-table):has(>#tab-map)::-webkit-scrollbar{display:none}
        #tab-table,#tab-map,#tab-top200{flex:0 0 auto!important;min-height:38px!important}
        #top200-quick-filters,#top200-visit-controls{flex-wrap:wrap!important;width:100%!important}
        #top200-quick-filters .top200-select,#top200-filter-btn{max-width:100%!important;min-height:38px!important}
        .mobile-card{padding:.75rem!important;margin-bottom:.55rem!important}
        .mobile-card-grid{grid-template-columns:1fr 1fr!important;gap:.4rem!important}
        #map-toolbar{left:max(.45rem,env(safe-area-inset-left,0px))!important;right:max(.45rem,env(safe-area-inset-right,0px))!important;bottom:max(.45rem,env(safe-area-inset-bottom,0px))!important;max-height:58dvh!important;padding-bottom:env(safe-area-inset-bottom,0px);overscroll-behavior:contain}
        #map-toolbar button,#map-toolbar select,#map-toolbar input{min-height:40px!important}
        #route-status,#route-chooser,#route-steps{width:100%!important;max-width:none!important;max-height:35dvh!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch}
        #route-steps .rounded-xl.border{padding:.6rem!important}
        #route-steps .wip-route-trash-single{width:32px;height:32px}
        #v18-release-modal,#v18-terrain-modal,#wip-feedback-modal{padding:max(.45rem,env(safe-area-inset-top,0px)) max(.45rem,env(safe-area-inset-right,0px)) max(.45rem,env(safe-area-inset-bottom,0px)) max(.45rem,env(safe-area-inset-left,0px))!important}
        #v18-release-modal>div,#v18-terrain-modal>div{width:100%!important;max-height:94dvh!important;border-radius:14px!important}
        #v18-terrain-modal .grid{grid-template-columns:1fr!important}
        #v18-terrain-map{height:48dvh!important;min-height:300px!important}
        .wip-feedback-dialog{width:100%!important;max-height:92dvh!important;overflow-y:auto!important}
        #details-modal{padding:.45rem!important}
        #details-modal>div.relative{width:100%!important;max-height:94dvh!important}
        #details-modal .grid.grid-cols-\[190px_1fr\]{grid-template-columns:1fr!important;gap:.3rem!important}
      }

      @media (min-width:768px) and (max-width:900px) and (orientation:portrait){
        .mobile-filter-button{display:inline-flex!important;min-width:42px;min-height:42px}
        #mobile-filter-backdrop{position:fixed!important;inset:0!important;background:rgba(2,6,23,.58)!important;backdrop-filter:blur(3px)!important;z-index:8990!important}
        body.mobile-filters-open #mobile-filter-backdrop{display:block!important}
        #filters-panel{position:fixed!important;top:0!important;left:0!important;bottom:0!important;width:min(78vw,360px)!important;max-width:360px!important;transform:translateX(-105%)!important;transition:transform .24s ease!important;z-index:9000!important;box-shadow:18px 0 45px rgba(15,23,42,.22)!important}
        body.mobile-filters-open #filters-panel{transform:translateX(0)!important}
        main{padding:.7rem!important;gap:.65rem!important}
        main .bg-gray-100.dark\:bg-slate-900.border{overflow-x:auto!important;max-width:calc(100vw - 1.4rem)!important;-webkit-overflow-scrolling:touch}
        .desktop-data-table{min-width:920px!important}
        #top200-quick-filters,#top200-visit-controls{flex-wrap:wrap!important}
        #map-toolbar{max-width:44vw!important}
        #route-status,#route-chooser,#route-steps{max-height:62vh!important;overflow-y:auto!important}
        #v18-terrain-modal .grid{grid-template-columns:1fr!important}
        #v18-terrain-map{height:52vh!important}
      }

      @media (min-width:901px) and (max-width:1180px){
        #filters-panel{width:300px!important;min-width:300px!important}
        main{padding:.75rem!important;gap:.7rem!important}
        .desktop-data-table{min-width:940px!important}
        main .bg-gray-100.dark\:bg-slate-900.border{overflow-x:auto!important;-webkit-overflow-scrolling:touch}
        #top200-quick-filters,#top200-visit-controls{flex-wrap:wrap!important}
        #map-toolbar{max-width:330px!important}
        #route-status,#route-chooser,#route-steps{max-height:68vh!important;overflow-y:auto!important}
      }

      @media (min-width:768px) and (max-width:1180px){
        header{padding-left:1rem!important;padding-right:1rem!important;gap:.65rem!important}
        header>div{min-width:0}
        header>div:last-child{gap:.4rem!important;flex-wrap:nowrap!important}
        #active-user-indicator{max-width:34vw!important}
        #active-user-name{max-width:18vw!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        #v18-info-button,#wip-feedback-button{width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important}
        .modern-input{min-height:40px!important}
        .accordion-btn{min-height:44px!important}
        #v18-release-modal>div{width:min(760px,94vw)!important}
        #v18-terrain-modal>div{width:min(1080px,96vw)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function refreshMapAfterViewportChange() {
    setTimeout(() => {
      try {
        if (map && typeof map.invalidateSize === 'function') map.invalidateSize(false);
      } catch (error) {}
    }, 120);
  }

  function installViewportHooks() {
    if (window.__wipResponsiveViewportHooks) return;
    window.__wipResponsiveViewportHooks = true;
    window.addEventListener('resize', refreshMapAfterViewportChange, { passive: true });
    window.addEventListener('orientationchange', () => {
      refreshMapAfterViewportChange();
      setTimeout(refreshMapAfterViewportChange, 420);
    }, { passive: true });
  }

  function install() {
    injectResponsiveStyles();
    installViewportHooks();
  }

  install();
  document.addEventListener('DOMContentLoaded', install);
})();