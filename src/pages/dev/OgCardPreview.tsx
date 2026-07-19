import '../public/landing.css';

/**
 * `/dev/og-card` — the STAGED SOURCE for the social share card
 * (public/og-brand.png, referenced by the og:image/twitter:image metas in
 * index.html). Brand-card composition (the root-domain convention: Stripe,
 * Vercel, Vipps — brand ground + logo lockup + one descriptor line, no UI).
 *
 * Capture with:
 *   node scripts/capture-landing-hero.mjs --shot og --url http://localhost:<port>
 *
 * The azure ground tops out at L 0.555 — the landing rule for white text on
 * azure (white only where the gradient is at or darker than L ≈ 0.555).
 * If this card changes meaningfully, ship it under a NEW filename and update
 * index.html — WhatsApp/Facebook cache og images by URL for weeks.
 */

/** UpNext mark on the chrome tile (same paths as LandingPage/favicon.svg). */
function UpNextMark() {
  return (
    <svg viewBox="486 392 1077 1264">
      <path
        className="lp-m"
        d="M1048.56 394.421C1061.4 393.353 1087.88 394.071 1101.76 394.1L1196.25 394.124L1319.9 394.06C1346 394.039 1383.63 392.807 1408.24 397.514C1438.32 403.194 1466.5 416.329 1490.2 435.716C1529.57 467.361 1554.7 513.398 1560.03 563.63C1562.08 583.862 1561.17 615.534 1561.15 636.882L1561.14 756.726L1561.17 896.284C1561.18 924.783 1562.64 964.325 1557.64 991.206C1551.78 1022.47 1538.1 1051.75 1517.88 1076.3C1484.34 1117.32 1434.71 1141.84 1381.76 1143.55C1357.7 1144.32 1328.38 1142.03 1305.01 1144.27C1276.49 1146.84 1249.45 1158.16 1227.61 1176.68C1205.74 1195.25 1190.14 1220.11 1182.93 1247.87C1176.71 1271.6 1177.81 1294.71 1177.83 1318.95L1177.99 1419.68C1178.02 1446.29 1179.43 1479.62 1174.03 1504.94C1167.38 1535.25 1153.53 1563.52 1133.67 1587.36C1098.59 1629.35 1055.36 1649.13 1001.68 1653.8C979.645 1654.62 954.718 1654.05 932.376 1654.04L807.272 1654.05L720.19 1654.09C692.878 1654.1 664.146 1655.44 637.487 1649.76C605.862 1643.16 576.564 1628.26 552.604 1606.58C514.282 1572.31 491.286 1524.12 488.755 1472.77C487.398 1448.22 488.232 1416.71 488.231 1391.77L488.293 1243.12L488.236 1135.07C488.223 1109.8 486.813 1076.54 491.636 1052.46C498.232 1020.13 513.225 990.113 535.107 965.42C567.164 929.452 612.149 907.627 660.24 904.708C686.351 903.373 714.75 905.629 740.127 904.08C769.722 902.443 797.986 891.244 820.671 872.167C876.63 825.181 872.92 767.951 872.725 703.078L872.507 606.96C872.465 582.401 871.632 562.567 877.11 538.213C884.029 508.005 898.393 480.007 918.894 456.767C952.953 418.316 997.505 397.35 1048.56 394.421Z"
      />
      <path
        className="lp-c"
        d="M1012.23 766.408C1048.13 763.053 1087.35 776.632 1115.08 799.315C1146.95 825.397 1167.07 863.142 1170.96 904.144C1172.38 919.031 1171.95 935.769 1171.95 950.869L1171.94 1019.9L1172.04 1094.1C1172.06 1116.44 1173.14 1141.69 1168.48 1163.31C1163.28 1188 1152.06 1211.04 1135.83 1230.37C1110.36 1260.78 1076.57 1278.01 1037.24 1281.64C1000.8 1284.44 963.358 1272 935.099 1248.98C902.555 1222.47 881.933 1184.08 877.805 1142.31C875.326 1117.43 876.881 1065.5 876.852 1038.29L876.776 957.141C876.764 935.404 875.714 910.597 879.952 889.506C885.096 863.153 896.673 838.48 913.653 817.681C939.786 785.851 971.716 770.398 1012.23 766.408Z"
      />
    </svg>
  );
}

const OgCardPreview = () => {
  return (
    <div className="lnd">
      <style>{`
        .ogc {
          width: 1200px; height: 630px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 34px; text-align: center;
          background: var(--background);
        }
        .ogc-lockup { display: flex; align-items: center; gap: 28px; }
        /* Tile radius keeps the nav's 14/38 logo-tile ratio at 100px. */
        .ogc .logo-tile { width: 100px; height: 100px; border-radius: 37px; }
        .ogc-name { font-size: 88px; font-weight: 600; letter-spacing: -0.035em; line-height: 1; color: var(--foreground); }
        .ogc-tag { font-size: 30px; letter-spacing: -0.01em; color: var(--muted-text); }
      `}</style>
      <div className="ogc">
        <div className="ogc-lockup">
          <span className="logo-tile" aria-hidden="true">
            <UpNextMark />
          </span>
          <span className="ogc-name">UpNext</span>
        </div>
        <p className="ogc-tag">Påmelding, betaling og kursoversikt for yogastudioer.</p>
      </div>
    </div>
  );
};

export default OgCardPreview;
