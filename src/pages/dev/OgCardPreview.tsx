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

/** R-monogram on the chrome tile (same paths as LandingPage/favicon.svg). */
function RadenMark() {
  return (
    <svg viewBox="549 547 950 950">
      <path
        className="lp-m"
        d="M869.069 1349.05C868.739 1365.39 866.989 1378.56 861.024 1393.9C849.981 1422.69 827.683 1445.73 799.275 1457.71C771.234 1469.51 739.654 1469.68 711.488 1458.18C682.647 1446.35 659.678 1423.57 647.622 1394.82C635.181 1364.82 638.961 1309.41 638.986 1275.38L639.035 1120.63L639.018 981.163C638.992 957.041 637.929 929.434 639.413 905.733C642.758 852.347 692.445 804.244 745.593 801.392C770.093 800.077 787.437 803.688 810.59 794.144C838.669 782.546 858.961 757.515 864.501 727.645C869.621 700.061 864.199 693.621 877.548 662.477C892.314 628.936 919.9 602.707 954.142 589.65C966.729 584.693 979.963 581.572 993.438 580.384C1010.48 578.882 1035.82 579.533 1053.32 579.507L1152 579.375L1233.08 579.549C1248.65 579.562 1270.09 579.032 1285.11 580.585C1299.7 582.187 1313.95 586.077 1327.33 592.112C1361.44 607.395 1388.01 635.692 1401.12 670.69C1411.05 697.083 1409.59 728.96 1409.59 756.857L1409.56 832.245L1409.53 898.934C1409.5 929.156 1411.15 951.812 1398.34 980.045C1381.92 1017.2 1348.34 1043.96 1308.45 1051.66C1281.46 1056.87 1253.32 1053.94 1239.98 1085.74C1233.96 1100.01 1234.45 1116.2 1241.33 1130.08C1247.95 1143.46 1265.14 1158.89 1276.05 1169.73L1347.96 1240.98C1359.12 1252.06 1378.69 1270.55 1387.87 1282.44C1393.73 1290.07 1398.54 1298.45 1402.18 1307.36C1413.1 1334.15 1411.87 1366.26 1400.53 1392.71C1387.9 1422.45 1363.76 1445.8 1333.61 1457.42C1324.78 1460.88 1315.55 1463.2 1306.14 1464.31C1287.63 1466.34 1249.76 1465.38 1230.21 1465.29C1209.67 1465.19 1173.04 1466.41 1154.66 1464.07C1144.12 1462.73 1133.84 1459.8 1124.18 1455.37C1113.61 1450.58 1103.76 1444.33 1094.93 1436.81C1081.61 1425.44 1063.33 1406.14 1050.56 1393.37L980.204 1323.57L929.383 1273.06C901.61 1245.97 885.791 1235.3 871.527 1198.14C867.519 1205.01 872.151 1328.98 869.069 1349.05Z"
      />
      <path
        className="lp-c"
        d="M869.105 1031.7L868.962 957.61C868.94 937.647 867.536 910.094 872.152 891.353C876.489 873.593 885.559 857.341 898.398 844.325C933.095 809.631 971.98 814.389 1016.23 814.617L1085.09 814.688C1159.59 815.239 1206.88 861.718 1204.09 936.59C1202.92 967.872 1193.8 993.164 1170.47 1015.46C1137.74 1045.5 1110.65 1047.21 1069.67 1047.08L1013.42 1046.89C1002.02 1046.86 990.628 1046.7 979.244 1047.18C933.894 1049.1 888.885 1080.72 873.997 1124.16L870.923 1133.2L870.134 1136.25L869.307 1136.1C868.366 1124.45 868.892 1105.42 868.883 1093.28C868.868 1073.21 868.461 1051.68 869.105 1031.7Z"
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
            <RadenMark />
          </span>
          <span className="ogc-name">Raden</span>
        </div>
        <p className="ogc-tag">Påmelding, betaling og kursoversikt for yogastudioer.</p>
      </div>
    </div>
  );
};

export default OgCardPreview;
