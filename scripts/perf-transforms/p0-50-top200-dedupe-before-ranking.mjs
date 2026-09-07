const HELPER_MARKER = 'function dedupeTop200ScopeBeforeRanking(items)';

const BUILD_MARKER = '        function buildTop200ForCurrentPssr() {';
const OLD_SCOPE = `            const scope = globalData
                .filter(itemBelongsToActivePssr)
                .sort(compareTop200Pssr);`;
const NEW_SCOPE = `            const scope = dedupeTop200ScopeBeforeRanking(
                globalData.filter(itemBelongsToActivePssr)
            ).sort(compareTop200Pssr);`;

const HELPER = `        function top200SiretKeyBeforeRanking(item) {
            if (!item) return "";
            const raw = item?.[COL.siret]
                || item?.siret
                || item?.SIRET
                || item?.Siret
                || item?.["Client_Irium.SIRET"]
                || item?.["Client_Irium.Siret"]
                || item?.["SIRENE DATA.siret"]
                || item?.["data23.siret"]
                || "";
            const digits = String(raw).replace(/\\D/g, "");
            if (digits.length >= 14) return digits.slice(0, 14);
            if (digits.length >= 9) return digits;
            return "";
        }

        function dedupeTop200ScopeBeforeRanking(items) {
            const bySiret = new Map();
            const noSiret = [];

            (Array.isArray(items) ? items : []).forEach((item, index) => {
                const key = top200SiretKeyBeforeRanking(item);
                if (!key) {
                    noSiret.push(item);
                    return;
                }

                const current = bySiret.get(key);
                if (!current || compareTop200Pssr(item, current) < 0) {
                    bySiret.set(key, item);
                }
            });

            return [...bySiret.values(), ...noSiret];
        }

`;

export function transform(context) {
  let dashboardHtml = context.dashboardHtml;

  if (!dashboardHtml.includes(HELPER_MARKER)) {
    if (!dashboardHtml.includes(BUILD_MARKER)) {
      throw new Error('P0-50: buildTop200ForCurrentPssr marker missing');
    }
    dashboardHtml = dashboardHtml.replace(BUILD_MARKER, `${HELPER}${BUILD_MARKER}`);
  }

  if (dashboardHtml.includes(OLD_SCOPE)) {
    dashboardHtml = dashboardHtml.split(OLD_SCOPE).join(NEW_SCOPE);
  }

  if (!dashboardHtml.includes(HELPER_MARKER)) {
    throw new Error('P0-50: pre-ranking SIRET dedupe helper missing');
  }
  if (!dashboardHtml.includes('const scope = dedupeTop200ScopeBeforeRanking(')) {
    throw new Error('P0-50: Top 200 scope is not deduplicated before ranking');
  }

  return { dashboardHtml };
}
