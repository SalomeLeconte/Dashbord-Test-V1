function replaceRequired(source, label, needle, replacement) {
  if (!source.includes(needle)) throw new Error(`P0-city: ${label} marker not found`);
  return source.split(needle).join(replacement);
}

function removeFunction(source, label, startMarker, endMarker, replacement = '') {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`P0-city: ${label} start marker not found`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`P0-city: ${label} end marker not found`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function replaceLegacyCityField(html) {
  const pattern = /<div>\s*<label class="modern-label">Ville<\/label>\s*<input type="text" id="f-ville" oninput="runFilter\(\)" placeholder="Ex: Lyon, Nantes\.\.\." class="modern-input">\s*<\/div>/g;
  let count = 0;
  const replacement = `<div id="wip-city-combobox" class="wip-city-combobox">
                                <label class="modern-label" for="f-ville-search">Ville</label>
                                <div class="wip-city-control">
                                    <input type="text" id="f-ville-search" placeholder="Rechercher une ville..." class="modern-input" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="f-ville-options" aria-expanded="false">
                                    <input type="hidden" id="f-ville-value" value="">
                                    <div class="wip-city-actions">
                                        <button type="button" id="f-ville-clear" class="wip-city-icon-btn" title="Effacer la ville" aria-label="Effacer la ville" hidden>×</button>
                                        <button type="button" id="f-ville-toggle" class="wip-city-icon-btn" title="Afficher les villes" aria-label="Afficher les villes" aria-expanded="false">⌄</button>
                                    </div>
                                    <div id="f-ville-options" class="wip-city-options hidden" hidden role="listbox"></div>
                                </div>
                                <div id="f-ville-status">Villes du portefeuille PSSR</div>
                            </div>`;
  const output = html.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  if (!count) throw new Error('P0-city: legacy Ville input not found');
  return output;
}

export function transform(context) {
  let dashboardHtml = context.dashboardHtml;
  dashboardHtml = replaceLegacyCityField(dashboardHtml);

  dashboardHtml = replaceRequired(
    dashboardHtml,
    'reset city control',
    '                "f-ville": "",',
    '                "f-ville-value": "",'
  );

  dashboardHtml = replaceRequired(
    dashboardHtml,
    'base city lookup',
    '            const searchVille = normalizeText(document.getElementById("f-ville")?.value || "");',
    '            const searchVilleKey = String(document.getElementById("f-ville-value")?.value || "");\n            const [searchVilleDept, searchVille = ""] = searchVilleKey.split("|", 2);'
  );

  dashboardHtml = replaceRequired(
    dashboardHtml,
    'base exact city filter',
    '                if (searchVille && !item._searchVille.includes(searchVille)) return false;',
    '                if (searchVille && (item._deptNorm !== searchVilleDept || item._searchVille !== searchVille)) return false;'
  );

  dashboardHtml = dashboardHtml
    .split("    const ville = document.getElementById('f-ville');\n    if (ville) ville.placeholder = 'Ex: Lyon, Nantes...';\n")
    .join('');

  dashboardHtml = removeFunction(
    dashboardHtml,
    'legacy V20 free-text city filter',
    '  function installFilterOverridesV20(){\n',
    '  function installDetailsDedupeV20(){\n',
    '  function installFilterOverridesV20(){ /* Ville gérée uniquement par le combobox dédié. */ }\n\n'
  );

  const forbidden = [
    'id="f-ville"',
    "getElementById('f-ville')",
    'getElementById("f-ville")',
    'oninput="runFilter()" placeholder="Ex: Lyon, Nantes..."'
  ];
  forbidden.forEach((marker) => {
    if (dashboardHtml.includes(marker)) throw new Error(`P0-city: legacy city marker still present: ${marker}`);
  });

  if (!dashboardHtml.includes('id="f-ville-search"') || !dashboardHtml.includes('id="f-ville-value"')) {
    throw new Error('P0-city: searchable city combobox missing');
  }

  return { dashboardHtml };
}
