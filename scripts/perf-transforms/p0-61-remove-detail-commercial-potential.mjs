function removeDetailCommercialPotentialSections(html) {
  let output = html;

  // Detail view variants built with sections=[{ title, rows }].
  output = output.replace(
    /\s*\{\s*title\s*:\s*["']Potentiel commercial["']\s*,\s*rows\s*:\s*rowsFrom\(\[\s*\[["']CA Global["'][\s\S]*?\[["']CA SERVICE cumulé["'][\s\S]*?\]\]\)\s*\}\s*,?/g,
    ''
  );

  // Legacy V25 detail renderer variant.
  output = output.replace(
    /\s*sectionV25\(\s*["']Potentiel commercial["']\s*,\s*rowsFrom\(\[\s*\[["']CA Global["'][\s\S]*?\[["']CA SERVICE cumulé["'][\s\S]*?\]\]\)\s*\)\s*,?/g,
    ''
  );

  return output;
}

export function transform(context) {
  const source = context.dashboardHtml;
  const dashboardHtml = removeDetailCommercialPotentialSections(source);

  const forbiddenDetailMarkers = [
    'title: "Potentiel commercial"',
    "title:'Potentiel commercial'",
    "sectionV25('Potentiel commercial'",
    'sectionV25("Potentiel commercial"'
  ];

  for (const marker of forbiddenDetailMarkers) {
    if (dashboardHtml.includes(marker)) {
      throw new Error(`Detail commercial potential section still present: ${marker}`);
    }
  }

  // The commercial-potential FILTER must remain untouched. Only the Details visual is removed.
  if (!dashboardHtml.includes('3. Potentiel commercial')) {
    throw new Error('Commercial potential filter was removed unexpectedly');
  }

  return { dashboardHtml };
}
