function replaceRequired(source, label, needle, replacement = '') {
  if (!source.includes(needle)) throw new Error(`Runtime cleanup: ${label} marker not found`);
  return source.replace(needle, replacement);
}

function removeSection(source, label, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Runtime cleanup: ${label} start marker not found`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Runtime cleanup: ${label} end marker not found`);
  return source.slice(0, start) + source.slice(end);
}

function removeAll(source, needle) {
  return source.split(needle).join('');
}

function cleanupFinalRegression(source) {
  source = removeAll(source, "  const HOME_KEY = 'wip.routeStart.home.v1';\n");
  source = removeAll(source, "  const MODE_KEY = 'wip.routeStart.mode.v1';\n");
  source = removeSection(
    source,
    'legacy route-start implementation',
    '  // ---------------------------------------------------------------------------\n  // 2) Départ itinéraire : position actuelle ou domicile saisi manuellement.\n  // ---------------------------------------------------------------------------\n',
    '  // ---------------------------------------------------------------------------\n  // 3) Noms Inconnu : fallback sur les autres colonnes exploitables.\n  // ---------------------------------------------------------------------------\n'
  );
  source = removeAll(source, '    installRouteStartFix();\n');
  return source;
}

function cleanupSafeHomeRoute(source) {
  source = removeSection(
    source,
    'legacy undercarriage hide cleanup',
    '  function removeSmallField(node) {\n',
    '  function installStyle() {\n'
  );
  source = removeAll(source, '    cleanUndercarriage();\n');
  source = removeAll(source, '      .wip-route-start-home{display:none!important}\n');
  return source;
}

function cleanupUndercarriageFilter(source) {
  source = replaceRequired(
    source,
    'undercarriage state sort flag',
    "  const state = window.__wipUnderCarriageState || { enabled: false, type: '', cls: '', priority: '', smrMin: 0, activityMin: 0, travelPctMin: 0, travelHoursMin: 0, sort: false };",
    "  const state = window.__wipUnderCarriageState || { enabled: false, type: '', cls: '', priority: '', smrMin: 0, activityMin: 0, travelPctMin: 0, travelHoursMin: 0 };"
  );
  source = removeAll(source, "    mvm: ['data22.Class MVM par client', 'Class MVM par client'],\n");
  source = removeAll(source, '      mvm: mapEntries(get(row, COLS.mvm)),\n');
  source = removeAll(source, '      const mvm = cls(maps.mvm.get(key));\n');
  source = replaceRequired(source, 'undercarriage class set', '      const classes = [bull, exca, mvm].filter(Boolean);', '      const classes = [bull, exca].filter(Boolean);');
  source = replaceRequired(source, 'undercarriage machine mvm property', 'smr, bull, exca, mvm, travelPct', 'smr, bull, exca, travelPct');
  source = replaceRequired(source, 'undercarriage machine mvm data predicate', 'smr || bull || exca || mvm || travelPct', 'smr || bull || exca || travelPct');
  source = removeAll(source, "    if (state.type === 'MVM') return [machine.mvm].filter(Boolean);\n");
  source = replaceRequired(source, 'undercarriage selected classes', '    return [machine.bull, machine.exca, machine.mvm].filter(Boolean);', '    return [machine.bull, machine.exca].filter(Boolean);');
  source = replaceRequired(source, 'undercarriage active sort flag', ' || state.sort); }', '); }');
  source = removeAll(source, "    if (state.type === 'MVM' && !machine.mvm) return false;\n");
  source = replaceRequired(source, 'undercarriage priority sort condition', '    if (!state.priority && !state.sort) return filtered;', '    if (!state.priority) return filtered;');
  source = removeAll(source, '    state.sort = !!root.querySelector(\'[data-uc="sort"]\')?.checked;\n');
  source = replaceRequired(source, 'undercarriage MVM option', "${opt('MVM', 'MVM')}", '');
  source = removeAll(source, '          <label class="flex items-center gap-2 font-bold"><input data-uc="sort" type="checkbox"> Trier par potentiel undercarriage</label>\n');

  source = replaceRequired(
    source,
    'legacy undercarriage detail row MVM/Score',
    "    const rows = list.map(m => `<tr><td>${esc(m.label)}</td><td>${m.smr ? Math.round(m.smr).toLocaleString('fr-FR') + ' h' : ''}</td><td>${esc(m.bull)}</td><td>${esc(m.exca)}</td><td>${esc(m.mvm)}</td><td>${m.travelPct ? m.travelPct.toLocaleString('fr-FR') + ' %' : ''}</td><td>${m.travelHours ? Math.round(m.travelHours).toLocaleString('fr-FR') + ' h' : ''}</td><td>${Math.round(m.score || 0)}</td></tr>`).join('');",
    "    const rows = list.map(m => `<tr><td>${esc(m.label)}</td><td>${m.smr ? Math.round(m.smr).toLocaleString('fr-FR') + ' h' : ''}</td><td>${esc(m.bull)}</td><td>${esc(m.exca)}</td><td>${m.travelPct ? m.travelPct.toLocaleString('fr-FR') + ' %' : ''}</td><td>${m.travelHours ? Math.round(m.travelHours).toLocaleString('fr-FR') + ' h' : ''}</td></tr>`).join('');"
  );
  source = replaceRequired(
    source,
    'legacy undercarriage detail headers MVM/Score',
    '<thead><tr><th>Machine</th><th>SMR</th><th>BULL</th><th>EXCA</th><th>MVM</th><th>Travel %</th><th>Travel h</th><th>Score</th></tr></thead>',
    '<thead><tr><th>Machine</th><th>SMR</th><th>BULL</th><th>EXCA</th><th>Travel %</th><th>Travel h</th></tr></thead>'
  );
  return source;
}

function cleanupUndercarriageDetails(source) {
  source = removeAll(source, "    mvm: ['data22.Class MVM par client', 'Class MVM par client'],\n");
  source = removeAll(source, '      mvm: mapEntries(get(row, COLS.mvm)),\n');
  source = removeAll(source, '      const mvm = cls(maps.mvm.get(key));\n');
  source = replaceRequired(source, 'detail class set', '      const classes = [bull, exca, mvm].filter(Boolean);', '      const classes = [bull, exca].filter(Boolean);');
  source = removeAll(source, '        mvm,\n');
  source = replaceRequired(source, 'detail mvm predicate', 'smr || bull || exca || mvm || travelPct', 'smr || bull || exca || travelPct');
  source = removeAll(source, "        <td>${esc(machine.mvm || '—')}</td>\n");
  source = removeAll(source, '        <td>${Math.round(machine.score || 0)}</td>\n');
  source = replaceRequired(
    source,
    'detail undercarriage table headers',
    '<thead><tr><th>Machine</th><th>SMR</th><th>BULL</th><th>EXCA</th><th>MVM</th><th>Travel %</th><th>Travel h</th><th>Classe</th><th>Score</th></tr></thead>',
    '<thead><tr><th>Machine</th><th>SMR</th><th>BULL</th><th>EXCA</th><th>Travel %</th><th>Travel h</th><th>Classe</th></tr></thead>'
  );
  source = removeAll(source, '        <div><strong>${Math.round(row._undercarriageScore || 0)}</strong><span>score max</span></div>\n');
  return source;
}

function cleanupUndercarriageModelRules(source) {
  source = replaceRequired(
    source,
    'model-rules state sort flag',
    "  const state = window.__wipUnderCarriageState || { enabled: false, type: '', cls: '', priority: '', smrMin: 0, activityMin: 0, travelPctMin: 0, travelHoursMin: 0, sort: false };",
    "  const state = window.__wipUnderCarriageState || { enabled: false, type: '', cls: '', priority: '', smrMin: 0, activityMin: 0, travelPctMin: 0, travelHoursMin: 0 };"
  );
  source = removeAll(source, "        mvm: '',\n");
  source = removeAll(source, "    if (state.type === 'MVM') state.type = '';\n");
  source = removeAll(source, '    state.sort = false;\n');
  source = removeAll(source, "        if (option.value === 'MVM') option.remove();\n");
  source = removeAll(source, "      if (type.value === 'MVM') type.value = '';\n");
  source = removeAll(source, "      if (/\\bMVM\\b/i.test(node.textContent || '')) node.remove();\n");
  source = removeAll(source, "      if (/Trier par potentiel/i.test(node.textContent || '')) node.remove();\n");
  source = removeAll(source, "    root.querySelector('[data-uc=\"sort\"]')?.closest('label,div')?.remove();\n");
  source = removeAll(source, '      #wip-undercarriage-filter [data-uc="sort"]{display:none!important}\n');
  source = removeAll(source, '      #wip-undercarriage-filter label:has([data-uc="sort"]){display:none!important}\n');
  return source;
}

function cleanupUndercarriageSmr(source) {
  source = removeAll(source, "    if (current.type === 'MVM') current.type = '';\n");
  return source;
}

function cleanupReleaseNotes(source) {
  source = replaceRequired(
    source,
    'release note MVM wording',
    'Lecture des classes BULL, EXCA et MVM avec la bonne priorité',
    'Lecture des classes BULL et EXCA avec la bonne priorité'
  );
  return source;
}

export function sanitizeRuntimeSource(fileName, source) {
  let cleaned = source;
  if (fileName === 'wip-final-regression-fixes-patch.js') cleaned = cleanupFinalRegression(cleaned);
  if (fileName === 'wip-safe-undercarriage-home-route-patch.js') cleaned = cleanupSafeHomeRoute(cleaned);
  if (fileName === 'wip-undercarriage-filter-patch.js') cleaned = cleanupUndercarriageFilter(cleaned);
  if (fileName === 'wip-undercarriage-detail-ui-patch.js') cleaned = cleanupUndercarriageDetails(cleaned);
  if (fileName === 'wip-undercarriage-model-rules-patch.js') cleaned = cleanupUndercarriageModelRules(cleaned);
  if (fileName === 'wip-undercarriage-smr-filter-patch.js') cleaned = cleanupUndercarriageSmr(cleaned);
  if (fileName === 'wip-release-refine-patch.js') cleaned = cleanupReleaseNotes(cleaned);

  if (cleaned.includes('MVM')) throw new Error(`Runtime cleanup: ${fileName} still contains MVM`);
  if (cleaned.includes('data-uc="sort"')) throw new Error(`Runtime cleanup: ${fileName} still contains sort UI`);
  if (cleaned.includes('Trier par potentiel')) throw new Error(`Runtime cleanup: ${fileName} still contains legacy sort wording`);
  if (cleaned.includes('<th>Score</th>')) throw new Error(`Runtime cleanup: ${fileName} still contains Score column`);
  if (cleaned.includes('wip-route-start-home')) throw new Error(`Runtime cleanup: ${fileName} still contains legacy route start UI`);
  return cleaned;
}
