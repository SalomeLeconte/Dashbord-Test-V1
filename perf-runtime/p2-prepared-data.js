(() => {
  if (window.__p2PreparedDataInstalled || typeof loadCSVData !== 'function') return;
  window.__p2PreparedDataInstalled = true;

  const baseLoadCSVData = loadCSVData;
  let manifestPromise = null;
  let preparedPromise = null;
  let preparedScopeKey = '';
  let loadedPreparedScopeKey = '';

  function scopeDepartments() {
    return [...new Set((Array.isArray(selectedSectorDepts) ? selectedSectorDepts : [])
      .map(value => typeof normalizeDept === 'function' ? normalizeDept(value) : String(value || '').trim())
      .filter(Boolean))].sort();
  }

  function scopeKey(depts) {
    return depts.length ? `prepared:${depts.join(',')}` : 'all';
  }

  async function getManifest() {
    if (!manifestPromise) {
      const url = new URL('./data/prepared/manifest.json', document.baseURI);
      manifestPromise = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' })
        .then(response => {
          if (!response.ok) throw new Error(`Manifest préparé HTTP ${response.status}`);
          return response.json();
        })
        .catch(error => {
          manifestPromise = null;
          throw error;
        });
    }
    return manifestPromise;
  }

  function loadPreparedInWorker(urls, headers, metaColumns) {
    return new Promise((resolve, reject) => {
      const workerUrl = new URL('./prepared-data-worker.js', document.baseURI);
      let worker;
      let settled = false;
      const timeoutId = window.setTimeout(() => finish(reject, new Error('Délai de chargement des données préparées dépassé')), 60000);

      function finish(callback, value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        worker?.terminate();
        callback(value);
      }

      try {
        worker = new Worker(workerUrl.href, { name: 'dashboard-prepared-loader' });
      } catch (error) {
        finish(reject, error);
        return;
      }

      worker.onmessage = event => {
        const message = event.data || {};
        if (message.type === 'status' && message.message) {
          if (typeof setLoadingState === 'function') setLoadingState(message.message);
          return;
        }
        if (message.type === 'error') {
          finish(reject, new Error(message.message || 'Erreur du worker de données préparées'));
          return;
        }
        if (message.type === 'result') finish(resolve, message);
      };
      worker.onerror = event => finish(reject, new Error(event.message || 'Erreur du worker de données préparées'));
      worker.postMessage({ type: 'load-prepared', urls, headers, metaColumns });
    });
  }

  async function loadPreparedForPortfolio(depts, requestedScopeKey) {
    const manifest = await getManifest();
    const departments = manifest?.departments || {};
    const files = depts.map(dept => departments[dept]?.file).filter(Boolean);
    if (files.length !== depts.length) {
      const missing = depts.filter(dept => !departments[dept]?.file);
      throw new Error(`Chunks préparés absents: ${missing.join(', ')}`);
    }

    const urls = files.map(file => new URL('./' + String(file).replace(/^\.\//, ''), document.baseURI).href);
    const result = await loadPreparedInWorker(urls, manifest.headers || [], manifest.metaColumns || 18);
    if (!Array.isArray(result.items) || !result.items.length) throw new Error('Données préparées vides');

    csvHeaders = Array.isArray(result.headers) ? result.headers : [];
    globalData = result.items;
    if (typeof csvLoadedScopeKey !== 'undefined') csvLoadedScopeKey = requestedScopeKey.replace(/^prepared:/, 'dept:');
    if (typeof csvLoadScopeKey !== 'undefined') csvLoadScopeKey = csvLoadedScopeKey;
    if (typeof csvLoadPromise !== 'undefined') csvLoadPromise = null;
    loadedPreparedScopeKey = requestedScopeKey;

    // Ne pas rendre ici : selectSector/bypassSelection est l'unique point de
    // finalisation de l'initialisation. Cela évite deux runFilter() consécutifs.
    if (typeof setupCARange === 'function') setupCARange();
    if (typeof invalidateTop200Ranks === 'function') invalidateTop200Ranks();
    document.dispatchEvent(new CustomEvent('dashboard:data-ready', {
      detail: { rows: globalData.length, prepared: true, departments: depts }
    }));
    return true;
  }

  loadCSVData = async function p2LoadCSVData() {
    const depts = scopeDepartments();
    if (!depts.length) return baseLoadCSVData.apply(this, arguments);

    const requestedScopeKey = scopeKey(depts);
    if (globalData.length && loadedPreparedScopeKey === requestedScopeKey) return true;
    if (preparedPromise && preparedScopeKey === requestedScopeKey) return preparedPromise;

    preparedScopeKey = requestedScopeKey;
    preparedPromise = (async () => {
      if (typeof setLoadingState === 'function') setLoadingState('Chargement optimisé du portefeuille...');
      try {
        return await loadPreparedForPortfolio(depts, requestedScopeKey);
      } catch (error) {
        console.warn('Données préparées indisponibles, repli vers les CSV optimisés.', error);
        loadedPreparedScopeKey = '';
        if (typeof csvLoadPromise !== 'undefined') csvLoadPromise = null;
        return baseLoadCSVData.apply(this, arguments);
      } finally {
        preparedPromise = null;
      }
    })();
    return preparedPromise;
  };

  if (typeof getCA2025Value === 'function') {
    const base = getCA2025Value;
    getCA2025Value = item => item?._perf ? item._perf.ca2025 : base(item);
  }
  if (typeof getCA2026Value === 'function') {
    const base = getCA2026Value;
    getCA2026Value = item => item?._perf ? item._perf.ca2026 : base(item);
  }
  if (typeof getTableFinancialAmount === 'function') {
    const base = getTableFinancialAmount;
    getTableFinancialAmount = item => item?._perf ? item._perf.ca2025 : base(item);
  }
  if (typeof isClientEligible === 'function') {
    const base = isClientEligible;
    isClientEligible = item => item?._perf ? item._perf.clientEligible : base(item);
  }
  if (typeof hasNewMachine === 'function') {
    const base = hasNewMachine;
    hasNewMachine = item => item?._perf ? item._perf.hasNewMachine : base(item);
  }
})();
