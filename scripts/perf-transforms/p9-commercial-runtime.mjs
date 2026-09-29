export async function transform(context) {
  let dashboard = context.dashboardHtml;
  if (!dashboard.includes('</body>')) throw new Error('P9 marker not found: dashboard body');
  if (!dashboard.includes('commercial-prospects-runtime.js')) {
    dashboard = dashboard.replace('</body>', '    <script src="commercial-prospects-runtime.js"></script>\n</body>');
  }
  return { dashboardHtml: dashboard };
}
