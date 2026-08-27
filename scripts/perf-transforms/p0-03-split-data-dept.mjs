function replaceRequired(html, label, search, replacement) {
  if (!html.includes(search)) throw new Error(`P0-03 marker not found: ${label}`);
  return html.replace(search, replacement);
}

export function transform(context) {
  let html = context.dashboardHtml;

  html = replaceRequired(
    html,
    'scope state',
    `        let globalData = [];\n        let csvLoadPromise = null;\n        let currentFilteredData = [];`,
    `        let globalData = [];\n        let csvLoadPromise = null;\n        let csvLoadScopeKey = "";\n        let csvLoadedScopeKey = "";\n        let currentFilteredData = [];`
  );

  html = replaceRequired(
    html,
    'loadCSVData scope handling',
    `        async function loadCSVData() {\n            if (globalData.length) return true;\n            if (csvLoadPromise) return csvLoadPromise;\n\n            csvLoadPromise = (async () => {\n                const startedAt = performance.now();`,
    `        function getRequestedDataScopeKey() {\n            const depts = [...new Set(selectedSectorDepts.map(normalizeDept).filter(Boolean))].sort();\n            return depts.length ? \`dept:${depts.join(",")}\` : "all";\n        }\n\n        async function loadCSVData() {\n            const requestedScopeKey = getRequestedDataScopeKey();\n            if (globalData.length && csvLoadedScopeKey === requestedScopeKey) return true;\n            if (csvLoadPromise && csvLoadScopeKey === requestedScopeKey) return csvLoadPromise;\n            if (csvLoadPromise) {\n                await csvLoadPromise;\n                if (globalData.length && csvLoadedScopeKey === requestedScopeKey) return true;\n                csvLoadPromise = null;\n            }\n\n            csvLoadScopeKey = requestedScopeKey;\n            csvLoadPromise = (async () => {\n                const startedAt = performance.now();`
  );

  html = replaceRequired(
    html,
    'scope success',
    `                    await ingestCSVRows(rows);\n                    document.dispatchEvent(new CustomEvent("dashboard:data-ready", {`,
    `                    await ingestCSVRows(rows);\n                    csvLoadedScopeKey = requestedScopeKey;\n                    document.dispatchEvent(new CustomEvent("dashboard:data-ready", {`
  );

  html = replaceRequired(
    html,
    'scope failure',
    `                } catch (error) {\n                    csvLoadPromise = null;\n                    console.error("Chargement de data11.csv impossible.", error);`,
    `                } catch (error) {\n                    csvLoadPromise = null;\n                    csvLoadScopeKey = "";\n                    console.error("Chargement de data11.csv impossible.", error);`
  );

  html = replaceRequired(
    html,
    'worker chunk urls',
    `                const workerUrl = new URL("./csv-data-worker.js", document.baseURI);\n                const csvUrl = new URL(CSV_FILE, document.baseURI);`,
    `                const workerUrl = new URL("./csv-data-worker.js", document.baseURI);\n                const scopedDepts = [...new Set(selectedSectorDepts.map(normalizeDept).filter(Boolean))];\n                const dataUrls = scopedDepts.length\n                    ? scopedDepts.map(dept => new URL(\`./data/dept-${dept.replace(/[^0-9A-Z_-]/g, "_")}.csv\`, document.baseURI).href)\n                    : [new URL(CSV_FILE, document.baseURI).href];`
  );

  html = replaceRequired(
    html,
    'worker message',
    '                worker.postMessage({ type: "load", url: csvUrl.href });',
    '                worker.postMessage({ type: "load", urls: dataUrls });'
  );

  html = replaceRequired(
    html,
    'bypass full scope',
    `        async function bypassSelection() {\n            document.getElementById("nominative-overlay").classList.add("hidden");\n            const loaded = await loadCSVData();`,
    `        async function bypassSelection() {\n            selectedSectorDepts = [];\n            selectedPssrNorm = "";\n            document.getElementById("nominative-overlay").classList.add("hidden");\n            const loaded = await loadCSVData();`
  );

  return { dashboardHtml: html };
}
