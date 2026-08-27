function replaceRegexRequired(html, label, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`P0-06 marker not found: ${label}`);
  return html.replace(pattern, replacement);
}

export function transform(context) {
  let html = context.dashboardHtml;
  html = replaceRegexRequired(
    html,
    'large Komatsu logo',
    /<img src="data:image\/png;base64,[^"]+" alt="Komatsu" class="brand-logo-large">/,
    '<img src="assets/komatsu-logo.svg" alt="Komatsu" class="brand-logo-large">'
  );
  html = replaceRegexRequired(
    html,
    'header Komatsu logo',
    /<img src="data:image\/png;base64,[^"]+" alt="Komatsu" class="brand-logo">/,
    '<img src="assets/komatsu-logo.svg" alt="Komatsu" class="brand-logo">'
  );
  return { dashboardHtml: html };
}
