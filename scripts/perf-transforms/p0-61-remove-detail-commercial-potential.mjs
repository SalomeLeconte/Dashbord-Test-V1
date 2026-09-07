function removeDetailCommercialPotentialSections(html) {
  let output = html;

  // Detail view variants built with sections=[{ title, rows }]. These objects
  // contain no nested object braces, so keep the match strictly brace-bounded.
  output = output.replace(
    /\s*\{\s*title\s*:\s*["']Potentiel commercial["'][^{}]*\}\s*,?/g,
    ''
  );

  // Legacy V25 detail renderer lives on one source line. Keep the match line-bounded
  // so it cannot consume unrelated dashboard code.
  output = output.replace(
    /\s*sectionV25\(\s*["']Potentiel commercial["'][^\n]*\)\s*,?/g,
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

  // Keep the commercial-potential FILTER. The request only concerns the Details view.
  if (!dashboardHtml.includes('3. Potentiel commercial')) {
    throw new Error('Commercial potential filter was removed unexpectedly');
  }

  return { dashboardHtml };
}
