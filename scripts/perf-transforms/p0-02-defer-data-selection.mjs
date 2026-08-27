function replaceRequired(html, label, search, replacement) {
  if (!html.includes(search)) throw new Error(`P0-02 marker not found: ${label}`);
  return html.replace(search, replacement);
}

export function transform(context) {
  let html = context.dashboardHtml;

  html = replaceRequired(
    html,
    'initial data load',
    `        document.addEventListener("DOMContentLoaded", () => {\n            updateDataTabLabel();\n            renderCollaboratorGrid();\n            loadCSVData();\n            initMap();\n        });`,
    `        document.addEventListener("DOMContentLoaded", () => {\n            updateDataTabLabel();\n            renderCollaboratorGrid();\n            initMap();\n        });`
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
