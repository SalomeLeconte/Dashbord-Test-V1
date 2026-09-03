function removeAll(source, needle) {
  return source.split(needle).join('');
}

function removeAllSections(source, label, startMarker, endMarker) {
  let output = source;
  let removed = 0;
  while (true) {
    const start = output.indexOf(startMarker);
    if (start < 0) break;
    const end = output.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`P0-99: ${label} end marker not found`);
    output = output.slice(0, start) + output.slice(end);
    removed += 1;
  }
  if (!removed) throw new Error(`P0-99: ${label} start marker not found`);
  return output;
}

function replaceAllRequired(source, label, needle, replacement) {
  if (!source.includes(needle)) throw new Error(`P0-99: ${label} marker not found`);
  return source.split(needle).join(replacement);
}

function pruneLegacyStableV18(html) {
  html = removeAllSections(
    html,
    'legacy Canton + Undercarriage builders',
    '  function addCantonFilter(){\n',
    '  function addTopRankFilter(){\n'
  );

  html = removeAll(html, "    const cantonSelect = safeNorm(document.getElementById('f-canton-select')?.value || '');\n");
  html = removeAll(html, '    if (cantonSelect) data = data.filter(item => safeNorm(getItemCanton(item)) === cantonSelect);\n');
  html = replaceAllRequired(
    html,
    'populate filter wrapper',
    'populateFilterOptions = function(){ oldPopulate.apply(this, arguments); patchDom(); populateCantonOptions(); updateNafOptionLabels(); };',
    'populateFilterOptions = function(){ oldPopulate.apply(this, arguments); patchDom(); updateNafOptionLabels(); };'
  );
  html = removeAll(html, '    addCantonFilter();\n');
  html = removeAll(html, '    addUndercarriageBox();\n');
  return html;
}

function pruneLegacyV20(html) {
  html = removeAll(html, ".v20-undercarriage-card { position:relative; overflow:hidden; border:1px dashed #fb923c; background:repeating-linear-gradient(135deg, rgba(251,146,60,.10) 0, rgba(251,146,60,.10) 10px, rgba(254,243,199,.45) 10px, rgba(254,243,199,.45) 20px); }\n");
  html = removeAll(html, ".dark .v20-undercarriage-card { background:repeating-linear-gradient(135deg, rgba(154,52,18,.28) 0, rgba(154,52,18,.28) 10px, rgba(67,20,7,.45) 10px, rgba(67,20,7,.45) 20px); border-color:#f97316; }\n");
  html = removeAll(html, ".v20-undercarriage-card::after { content:'IN PROGRESS'; position:absolute; right:-30px; top:14px; transform:rotate(28deg); background:#f97316; color:#fff7ed; padding:.25rem 2rem; font-size:9px; font-weight:1000; letter-spacing:.12em; }\n");
  html = removeAll(html, ".v20-canton-note { font-size:10px; line-height:1.25; color:#64748b; margin-top:.35rem; }\n");
  html = removeAll(html, ".dark .v20-canton-note { color:#94a3b8; }\n");

  html = removeAllSections(
    html,
    'legacy V20 Canton population',
    '  function getCantonValuesForScope(){\n',
    '  function patchStaticDomV20(){\n'
  );

  html = removeAll(html, "    const cantonLabel = document.querySelector('label[for=\"f-canton-select\"], #f-canton-select')?.closest('div')?.querySelector('label');\n");
  html = removeAll(html, "    if (cantonLabel) cantonLabel.textContent = 'Cantons';\n");
  html = replaceAllRequired(
    html,
    'V20 label cleanup',
    "    document.querySelectorAll('label').forEach(l => { if (n(l.textContent) === 'cantons disponibles') l.textContent='Cantons'; if (n(l.textContent) === 'age machine all') l.textContent='Âge machine'; });",
    "    document.querySelectorAll('label').forEach(l => { if (n(l.textContent) === 'age machine all') l.textContent='Âge machine'; });"
  );

  html = removeAllSections(
    html,
    'legacy V20 Undercarriage placeholder',
    '  function patchUndercarriageV20(){\n',
    '  function patchConnectedSectorV20(){\n'
  );

  html = removeAll(html, "      const selectedCanton = n(document.getElementById('f-canton-select')?.value || '');\n");
  html = replaceAllRequired(html, 'V20 city condition', '      if ((typed || selectedCanton) && Array.isArray(currentFilteredData)) {', '      if (typed && Array.isArray(currentFilteredData)) {');
  html = removeAll(html, '          const canton = n(cantonValue(item));\n');
  html = removeAll(html, '          const selOk = !selectedCanton || canton === selectedCanton;\n');
  html = replaceAllRequired(html, 'V20 city result', '          return txtOk && selOk;', '          return txtOk;');
  html = removeAll(html, '      repopulateCantonsV20();\n');
  html = removeAll(html, '      patchUndercarriageV20();\n');
  html = removeAll(html, '    patchUndercarriageV20();\n');
  html = removeAll(html, '    loadCantonGeoV20().then(()=>repopulateCantonsV20());\n');
  html = removeAll(html, '    setTimeout(() => { patchStaticDomV20(); patchUndercarriageV20(); repopulateCantonsV20(); /* v24: keep main sector filter */ installGoogleMapsControlV20(); }, 700);\n');
  return html;
}

function pruneLegacyV25(html) {
  html = removeAll(html, ".v25-canton-progress { margin-top:5px; font-size:10px; color:#b45309; font-weight:800; line-height:1.35; }\n");
  html = removeAll(html, ".dark .v25-canton-progress { color:#fbbf24; }\n");
  html = removeAllSections(
    html,
    'legacy V25 Canton in-progress block',
    '  function patchCantonInProgress(){\n',
    '  const sectorState = window.__v25SectorState'
  );
  html = removeAll(html, '      patchCantonInProgress();\n');
  html = removeAll(html, '    patchCantonInProgress(); ');
  return html;
}

export function transform(context) {
  let dashboardHtml = context.dashboardHtml;
  dashboardHtml = pruneLegacyStableV18(dashboardHtml);
  dashboardHtml = pruneLegacyV20(dashboardHtml);
  dashboardHtml = pruneLegacyV25(dashboardHtml);

  const forbidden = [
    'function addCantonFilter()',
    'function addUndercarriageBox()',
    'function patchUndercarriageV20()',
    'function patchCantonInProgress()',
    'v20-undercarriage-card',
    'v25-canton-progress',
    'In progress — non fonctionnel',
    'Filtre non fonctionnel'
  ];
  forbidden.forEach((marker) => {
    if (dashboardHtml.includes(marker)) throw new Error(`P0-99: legacy marker still present: ${marker}`);
  });

  return { dashboardHtml };
}
