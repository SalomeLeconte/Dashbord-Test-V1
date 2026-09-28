function replaceRequired(html, label, search, replacement) {
  if (!html.includes(search)) throw new Error(`P0-02 marker not found: ${label}`);
  return html.replace(search, replacement);
}

export function transform(context) {
  let html = context.dashboardHtml;

  const initialLoadPattern = /([ \t]*)loadCSVData\(\);\n\1initMap\(\);/;
  if (!initialLoadPattern.test(html)) throw new Error('P0-02 marker not found: initial data load');
  html = html.replace(initialLoadPattern, (_match, indent) =>
    indent + 'if (String(authContext?.role || "").toUpperCase() !== "ADMIN") {\\n' +
    indent + '    const loaded = await loadCSVData();\\n' +
    indent + '    if (loaded) {\\n' +
    indent + '        populateFilterOptions();\\n' +
    indent + '        runFilter();\\n' +
    indent + '    }\\n' +
    indent + '}\\n' +
    indent + 'initMap();'
  );

  html = replaceRequired(
    html,
    'selectSector signature',
    '        function selectSector(prenom, nom, depts) {',
    '        async function selectSector(prenom, nom, depts) {'
  );

  html = replaceRequired(
    html,
    'selectSector load gate',
    `            document.getElementById("nominative-overlay").classList.add("hidden");\n            closeAllAccordions();\n            populateFilterOptions();\n            runFilter();\n        }`,
    `            document.getElementById("nominative-overlay").classList.add("hidden");\n            closeAllAccordions();\n            const loaded = await loadCSVData();\n            if (!loaded) {\n                reopenNominativeSelection();\n                return;\n            }\n            populateFilterOptions();\n            runFilter();\n        }`
  );

  html = replaceRequired(
    html,
    'bypassSelection',
    `        function bypassSelection() {\n            resetSectorFilter();\n            document.getElementById("nominative-overlay").classList.add("hidden");\n        }`,
    `        async function bypassSelection() {\n            document.getElementById("nominative-overlay").classList.add("hidden");\n            const loaded = await loadCSVData();\n            if (!loaded) {\n                reopenNominativeSelection();\n                return;\n            }\n            resetSectorFilter();\n        }`
  );

  return { dashboardHtml: html };
}
