export function transform(context) {
  const search = 'const response = await fetch(CSV_FILE, { cache: "no-cache" });';
  if (!context.dashboardHtml.includes(search)) {
    throw new Error('P0-01 cache fallback marker not found');
  }
  return {
    dashboardHtml: context.dashboardHtml.replace(
      search,
      'const response = await fetch(CSV_FILE, { cache: "force-cache" });'
    )
  };
}
