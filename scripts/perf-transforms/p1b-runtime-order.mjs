export function transform(context) {
  let dashboardHtml = context.dashboardHtml;
  const inlineScript = '<script src="assets/dashboard-inline.min.js"></script>';
  const runtimePattern = /<script src="\.\/wip-runtime\.bundle\.js([^\"]*)"><\/script>/;

  if (!dashboardHtml.includes(inlineScript)) {
    throw new Error('P1b: dashboard-inline.min.js marker not found');
  }
  if (!runtimePattern.test(dashboardHtml)) {
    throw new Error('P1b: wip-runtime.bundle.js marker not found');
  }

  // P1 extrait tout le JS inline dans dashboard-inline.min.js. Ce JS contient
  // les fonctions de base (selectSector, runFilter, renderGrid, etc.). Le bundle
  // WIP doit impérativement être exécuté APRES ces définitions, comme dans la
  // source non compilée. Sinon les patches capturent des fonctions undefined.
  dashboardHtml = dashboardHtml.replace(inlineScript, '');
  dashboardHtml = dashboardHtml.replace(runtimePattern, (runtimeTag) => `${inlineScript}\n${runtimeTag}`);

  return { dashboardHtml };
}
