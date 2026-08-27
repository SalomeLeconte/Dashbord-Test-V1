(() => {
  const PATCH_ID = 'wip-responsive-mobile-header-map-2026-08-06';
  window.__WIP_RESPONSIVE_DEVICE_PATCH__ = PATCH_ID;

  function injectResponsiveStyles() {
    if (document.getElementById('wip-responsive-device-style')) return;
    const style = document.createElement('style');
    style.id = 'wip-responsive-device-style';
    style.textContent = `
      html,body{min-height:100%;overscroll-behavior:none}
      button,select,input,textarea{-webkit-tap-highlight-color:transparent}

      @media (max-width:767px){
        html,body{height:100dvh!important;min-height:100dvh!important;overflow:hidden!important}
        body{padding-bottom:env(safe-area-inset-bottom,0px)}

        /* Barre haute téléphone : les boutons passent sur une ligne horizontale scrollable. */
        header{display:flex!important;flex-wrap:wrap!important;align-items:center!important;row-gap:.25rem!important;column-gap:.35rem!important;min-height:auto!important;padding-top:max(.38rem,env(safe-area-inset-top,0px))!important;padding-left:max(.45rem,env(safe-area-inset-left,0px))!important;padding-right:max(.45rem,env(safe-area-inset-right,0px))!important;padding-bottom:.3rem!important;max-width:100vw!important;overflow:visible!important}
        header>div{min-width:0!important}
        header>div:first-child{flex:1 1 auto!important;max-width:100%!important;gap:.32rem!important;overflow:hidden!important}
        header>div:last-child{order:30!important;flex:0 0 100%!important;width:100%!important;max-width:100%!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:.35rem!important;overflow-x:auto!important;overflow-y:hidden!important;white-space:nowrap!important;padding:.1rem .05rem .18rem!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important}
        header>div:last-child::-webkit-scrollbar{display:none!important}
        header>div:last-child>*{flex:0 0 auto!important}
        header .brand-logo,header .brand-logo-large{height:30px!important;max-width:92px!important;object-fit:contain!important}
        header h1,header .font-display{max-width:44vw!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
        header button,#wip-feedback-button,#v18-info-button{min-width:34px!important;min-height:34px!important;height:34px!important;padding:.35rem .55rem!important;font-size:10px!important;line-height:1!important;border-radius:10px!important}
        header button svg,#wip-feedback-button svg,#v18-info-button svg{width:15px!important;height:15px!important}
        #active-user-indicator{max-width:50vw!important;min-width:0!important;height:34px!important;padding:.25rem .5rem!important}
        #active-user-name{max-width:28vw!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}

        main{min-height:0!important;height:100%!important;padding:.5rem!important;gap:.5rem!important}
        main>details{flex:0 0 auto}
        #view-table,#view-top200,#view-map{min-height:0!important}
        #view-map{height:100%!important;position:relative!important}
        #map{min-height:330px!important;height:100%!important}
        div:has(>#tab-table):has(>#tab-map){overflow-x:auto!important;overflow-y:hidden!important;display:flex!important;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        div:has(>#tab-table):has(>#tab-map)::-webkit-scrollbar{display:none}
        #tab-table,#tab-map,#tab-top200{flex:0 0 auto!important;min-height:38px!important}
        #top200-quick-filters,#top200-visit-controls{flex-wrap:wrap!important;width:100%!important}
        #top200-quick-filters .top200-select,#top200-filter-btn{max-width:100%!important;min-height:38px!important}
        .mobile-card{padding:.75rem!important;margin-bottom:.55rem!important}
        .mobile-card-grid{grid-template-columns:1fr 1fr!important;gap:.4rem!important}

        /* Cartographie téléphone : les outils ne recouvrent plus la carte. */
        body.wip-mobile-map-active #map-toolbar{position:fixed!important;left:max(.55rem,env(safe-area-inset-left,0px))!important;right:max(.55rem,env(safe-area-inset-right,0px))!important;bottom:max(.65rem,env(safe-area-inset-bottom,0px))!important;z-index:1600!important;max-height:52dvh!important;max-width:none!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;padding:.65rem!important;border-radius:16px!important;background:rgba(255,255,255,.96)!important;border:1px solid rgba(226,232,240,.9)!important;box-shadow:0 18px 48px rgba(15,23,42,.24)!important;transform:translateY(calc(100% + 18px))!important;opacity:0!important;pointer-events:none!important;transition:transform .2s ease,opacity .2s ease!important}
        .dark body.wip-mobile-map-active #map-toolbar,body.dark.wip-mobile-map-active #map-toolbar{background:rgba(15,23,42,.96)!important;border-color:rgba(51,65,85,.95)!important}
        body.wip-mobile-map-active.wip-mobile-map-tools-open #map-toolbar{transform:translateY(0)!important;opacity:1!important;pointer-events:auto!important}
        body.wip-mobile-map-active #map-toolbar button,body.wip-mobile-map-active #map-toolbar select,body.wip-mobile-map-active #map-toolbar input{min-height:38px!important}
        #wip-mobile-map-tools-toggle{display:none!important}
        body.wip-mobile-map-active #wip-mobile-map-tools-toggle{display:inline-flex!important;position:fixed!important;left:max(.7rem,env(safe-area-inset-left,0px))!important;bottom:max(.8rem,env(safe-area-inset-bottom,0px))!important;z-index:1650!important;align-items:center!important;gap:.35rem!important;min-height:38px!important;padding:.48rem .72rem!important;border-radius:999px!important;border:1px solid rgba(234,179,8,.55)!important;background:rgba(15,23,42,.92)!important;color:#fef3c7!important;font-size:11px!important;font-weight:900!important;letter-spacing:.04em!important;text-transform:uppercase!important;box-shadow:0 12px 30px rgba(15,23,42,.28)!important}
        body.wip-mobile-map-active.wip-mobile-map-tools-open #wip-mobile-map-tools-toggle{display:none!important}
        #wip-mobile-map-tools-close{display:flex!important;width:100%!important;align-items:center!important;justify-content:space-between!important;gap:.5rem!important;margin-bottom:.45rem!important;padding:.45rem .55rem!important;border-radius:12px!important;background:#0f172a!important;color:#fef3c7!important;border:1px solid rgba(234,179,8,.45)!important;font-size:11px!important;font-weight:900!important;text-transform:uppercase!important}
        body.wip-mobile-map-active .leaflet-control-zoom{transform:scale(.84)!important;transform-origin:top left!important;opacity:.78!important}
        body.wip-mobile-map-active .leaflet-control-attribution{font-size:9px!important;max-width:50vw!important;opacity:.65!important}
        body.wip-mobile-map-active .leaflet-popup-content{max-width:72vw!important;max-height:42dvh!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important}
        #route-status,#route-chooser,#route-steps{width:100%!important;max-width:none!important;max-height:36dvh!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch}
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

  function isPhone() {
    return window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
  }

  function isMapViewActive() {
    try {
      if (typeof isMapVisible === 'function') return !!isMapVisible();
    } catch (error) {}
    const view = document.getElementById('view-map');
    if (!view) return false;
    const style = window.getComputedStyle(view);
    return style.display !== 'none' && style.visibility !== 'hidden' && !view.classList.contains('hidden');
  }

  function ensureMobileMapToolsToggle() {
    let toggle = document.getElementById('wip-mobile-map-tools-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'wip-mobile-map-tools-toggle';
      toggle.type = 'button';
      toggle.innerHTML = '<span aria-hidden="true">☰</span><span>Outils carte</span>';
      toggle.addEventListener('click', () => {
        document.body.classList.add('wip-mobile-map-tools-open');
        refreshMapAfterViewportChange();
      });
      document.body.appendChild(toggle);
    }

    const toolbar = document.getElementById('map-toolbar');
    if (toolbar && !document.getElementById('wip-mobile-map-tools-close')) {
      const close = document.createElement('button');
      close.id = 'wip-mobile-map-tools-close';
      close.type = 'button';
      close.innerHTML = '<span>Outils carte</span><span aria-hidden="true">×</span>';
      close.addEventListener('click', () => {
        document.body.classList.remove('wip-mobile-map-tools-open');
        refreshMapAfterViewportChange();
      });
      toolbar.insertBefore(close, toolbar.firstChild);
    }
  }

  function syncMobileMapMode() {
    if (!isPhone() || !isMapViewActive()) {
      document.body.classList.remove('wip-mobile-map-active', 'wip-mobile-map-tools-open');
      return;
    }
    ensureMobileMapToolsToggle();
    document.body.classList.add('wip-mobile-map-active');
  }

  function scheduleMobileMapSync() {
    if (window.__wipMobileMapSyncRaf) return;
    window.__wipMobileMapSyncRaf = requestAnimationFrame(() => {
      window.__wipMobileMapSyncRaf = null;
      syncMobileMapMode();
    });
  }

  function installViewportHooks() {
    if (window.__wipResponsiveViewportHooks) return;
    window.__wipResponsiveViewportHooks = true;
    window.addEventListener('resize', () => {
      refreshMapAfterViewportChange();
      scheduleMobileMapSync();
    }, { passive: true });
    window.addEventListener('orientationchange', () => {
      refreshMapAfterViewportChange();
      setTimeout(refreshMapAfterViewportChange, 420);
      scheduleMobileMapSync();
    }, { passive: true });
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('#tab-map,#tab-table,#tab-top200,[data-view],button')) {
        setTimeout(scheduleMobileMapSync, 60);
      }
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') document.body.classList.remove('wip-mobile-map-tools-open');
    });
  }

  function install() {
    injectResponsiveStyles();
    installViewportHooks();
    scheduleMobileMapSync();
  }

  install();
  document.addEventListener('DOMContentLoaded', install);
})();
