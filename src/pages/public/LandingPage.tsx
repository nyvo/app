import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatKroner } from '@/lib/utils';
import { COMPANY } from '@/lib/company';
import { useDocumentTitle } from '@/hooks/use-document-title';
import '@/styles/plan-cards.css';
import './landing.css';

const PRELAUNCH = import.meta.env.VITE_PRELAUNCH === 'true';

// =============================================================================
// Exact port of the ratified hybrid marketing page (openspot-marketing skill,
// artifact 9da916b0). Structure, copy and mocks are locked by that skill —
// change them there first, then mirror here. Styles live in ./landing.css
// under the `.lnd` scope. "UpNext" is the brand chosen for this page.
// =============================================================================

const NBSP = ' ';

const PROOF_ITEMS = ['Gratis å starte', 'Automatiske utbetalinger', 'Ingen bindingstid'];

/** UpNext stair-step S, white glyph on the chrome logo tile. */
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

function CheckGlyph() {
  return (
    <span className="check">
      <svg viewBox="0 0 12 12" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5l2.6 2.6L10 3.5" />
      </svg>
    </span>
  );
}

function AvatarGlyph() {
  return (
    <span className="row-ava">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19c.8-3.4 3.6-5 7-5s6.2 1.6 7 5" />
      </svg>
    </span>
  );
}

/** Signup CTA — mailto during prelaunch, auth link when open. */
function SignupCta({
  className,
  label,
  intent,
}: {
  className: string;
  label: string;
  /**
   * Entry-context role intent (auth-routes.ts § 21.3a). The hero CTA omits it —
   * the landing page is read by buyers too, so top-of-page signups get the
   * onboarding role chooser. CTAs under the pricing cards and the final band
   * sit in unambiguous seller context and carry `seller` so onboarding skips
   * the chooser.
   */
  intent?: 'seller';
}) {
  if (PRELAUNCH) {
    return (
      <a className={className} href={`mailto:${COMPANY.email}`}>
        Ta kontakt
      </a>
    );
  }
  return (
    <Link className={className} to={intent ? `/auth?intent=${intent}` : '/auth'}>
      {label}
    </Link>
  );
}

const LandingPage = () => {
  useDocumentTitle();
  const rootRef = useRef<HTMLDivElement>(null);
  // Pricing billing period. Yearly = 4 990 kr vs 12 × 499 kr — the 998 kr
  // difference is exactly two monthly payments, hence "2 måneder gratis"
  // (same math + badge copy as the dashboard BillingPage).
  const [yearly, setYearly] = useState(false);

  // Scroll reveals: flip data-reveal → data-revealed once per element.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', '');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -80px 0px' }
    );
    for (const el of root.querySelectorAll('[data-reveal]')) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // Pointer-tracking for the hero chart highlight (hover-capable devices
  // only): the whole highlight exists only while hovering — cursor/dot/
  // tooltip fade in together, ride the drawn path with slight smoothing,
  // and values interpolate along the period. Touch devices never see it.
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const wrap = rootRef.current?.querySelector<HTMLElement>('.chart-wrap');
    const path = wrap?.querySelector<SVGPathElement>('.chart-line');
    const hl = wrap?.querySelector<HTMLElement>('.chart-hl');
    if (!wrap || !path || !hl) return;
    const cursor = hl.querySelector<HTMLElement>('.hl-cursor');
    const dot = hl.querySelector<HTMLElement>('.hl-dot');
    const tip = hl.querySelector<HTMLElement>('.hl-tip');
    const value = hl.querySelector<HTMLElement>('.hl-row b');
    const date = hl.querySelector<HTMLElement>('.hl-row em');
    if (!cursor || !dot || !tip || !value || !date) return;

    // Sample the path once; y lookup by x works because the line is
    // monotonic in x (viewBox units, 600×120).
    const length = path.getTotalLength();
    const samples = Array.from({ length: 121 }, (_, i) =>
      path.getPointAtLength((length * i) / 120)
    );
    const yAt = (f: number) => {
      const x = f * 600;
      let nearest = samples[0];
      for (const s of samples) {
        if (Math.abs(s.x - x) < Math.abs(nearest.x - x)) nearest = s;
      }
      return nearest.y;
    };

    const REST = 2 / 3;
    const TOTAL = 41745;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = wrap.clientWidth;
    let height = wrap.clientHeight;
    let target = REST;
    let current = REST;
    let raf = 0;

    const render = () => {
      const x = current * width;
      const y = (yAt(current) / 120) * height;
      cursor.style.translate = `${x}px 0`;
      dot.style.translate = `calc(${x}px - 50%) calc(${y}px - 50%)`;
      // Flip to the right of the cursor near the left edge (recharts-style);
      // scale-in grows out of the cursor-facing edge.
      const flipped = x > 130;
      tip.style.translate = flipped
        ? `calc(${x}px - 100% - 12px) 0`
        : `calc(${x}px + 12px) 0`;
      tip.style.transformOrigin = flipped ? '100% 50%' : '0% 50%';
      const day = Math.round(current * 30);
      // Skip identical writes — a text change re-lays-out the tooltip.
      const nextValue = formatKroner(Math.round(TOTAL * current));
      if (value.textContent !== nextValue) value.textContent = nextValue;
      const nextDate = day <= 15 ? `${15 + day}. jun` : `${day - 15}. jul`;
      if (date.textContent !== nextDate) date.textContent = nextDate;
    };

    const tick = () => {
      raf = 0;
      // Reduced motion: 1:1 feedback, no trailing lag.
      const factor = reduceMotion.matches ? 1 : 0.16;
      current += (target - current) * factor;
      if (Math.abs(target - current) < 0.0008) current = target;
      render();
      if (current !== target) raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    render();

    // Rect cached per hover — pointermove can fire at up to 1000Hz and only
    // left/width are used, which vertical scrolling never changes.
    let rect: DOMRect | null = null;
    const onEnter = () => {
      hl.classList.add('is-hovering');
      rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    };
    const onMove = (e: PointerEvent) => {
      if (!rect) rect = wrap.getBoundingClientRect();
      target = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      schedule();
    };
    const onLeave = () => {
      hl.classList.remove('is-hovering');
      target = REST;
      schedule();
    };

    wrap.addEventListener('pointerenter', onEnter);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener('pointerenter', onEnter);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="lnd" ref={rootRef}>
      <header className="nav">
        <div className="container nav-inner">
          <a className="nav-logo" href="#">
            <span className="logo-tile" aria-hidden="true">
              <UpNextMark />
            </span>
            <span className="wordmark">UpNext</span>
          </a>
          <nav aria-label="Hovednavigasjon" className="nav-right">
            <a className="nav-link" href="#pricing">
              Pris
            </a>
            {!PRELAUNCH && (
              <Link className="btn btn-secondary" to="/auth">
                Logg inn
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero — azure gradient panel, dashboard mock rising from the bottom */}
        <section className="hero container" aria-label="Introduksjon">
          <div className="hero-panel">
            <span className="eyebrow">Bygget i Norge</span>
            <h1>Alt du trenger for å administrere kurs.</h1>
            <p className="hero-sub">
              Påmelding, betaling og deltakere – samlet på ett sted.
            </p>
            <div className="hero-ctas">
              <SignupCta className="btn btn-white" label="Opprett konto" />
              <a className="btn btn-glass-azure" href="#product">
                Se hvordan det fungerer
              </a>
            </div>

            <div
              className="shot"
              role="img"
              aria-label="Forenklet forhåndsvisning av oversikten i UpNext med inntekt, neste kurs og siste påmeldinger"
            >
              <div className="shot-bar">
                <span className="shot-dot" />
                <span className="shot-dot" />
                <span className="shot-dot" />
                <span className="shot-url">upnext.no</span>
              </div>
              <div className="shot-body">
                <aside className="shot-side">
                  <span className="shot-logo">
                    <span className="logo-tile" aria-hidden="true">
                      <UpNextMark />
                    </span>
                  </span>
                  <div className="shot-nav">
                    <span className="active">
                      <i />
                      Oversikt
                    </span>
                    <span>
                      <i />
                      Timeplan
                    </span>
                    <span>
                      <i />
                      Kurs
                    </span>
                    <span>
                      <i />
                      Studio
                    </span>
                    <span>
                      <i />
                      Utbetalingskonto
                    </span>
                  </div>
                  <div className="shot-studio">
                    <b>Flyt Studio</b>
                    <small>Pro</small>
                  </div>
                </aside>
                <div className="shot-main">
                  <div className="shot-head">
                    <h4>Oversikt</h4>
                    <span className="shot-bell" />
                  </div>
                  <div className="shot-card">
                    <div className="inntekt-top">
                      <div>
                        <span className="inntekt-label">Inntekt</span>
                        <div className="inntekt-row">
                          <span className="inntekt-sum">{formatKroner(41745)}</span>
                          <span className="chip-up">{`+19${NBSP}%`}</span>
                        </div>
                      </div>
                      <span className="seg">
                        <span>Uke</span>
                        <span className="on">Måned</span>
                        <span>År</span>
                      </span>
                    </div>
                    <div className="chart-wrap" aria-hidden="true">
                    <svg className="chart" viewBox="0 0 600 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lnd-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.54 0.15 245)" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="oklch(0.54 0.15 245)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="30" x2="600" y2="30" stroke="oklch(0.887 0.005 250)" strokeDasharray="3 5" strokeWidth="1" />
                      <line x1="0" y1="60" x2="600" y2="60" stroke="oklch(0.887 0.005 250)" strokeDasharray="3 5" strokeWidth="1" />
                      <line x1="0" y1="90" x2="600" y2="90" stroke="oklch(0.887 0.005 250)" strokeDasharray="3 5" strokeWidth="1" />
                      <path
                        className="chart-area"
                        d="M0,95 C50,70 80,55 130,72 C180,90 220,100 270,78 C320,55 350,30 400,42 C450,55 480,48 530,38 C560,32 580,36 600,40 L600,120 L0,120 Z"
                        fill="url(#lnd-area)"
                      />
                      <path
                        className="chart-line"
                        pathLength={1}
                        d="M0,95 C50,70 80,55 130,72 C180,90 220,100 270,78 C320,55 350,30 400,42 C450,55 480,48 530,38 C560,32 580,36 600,40"
                        fill="none"
                        stroke="oklch(0.54 0.15 245)"
                        strokeWidth="2"
                      />
                    </svg>
                    {/* The live IncomeChart hover highlight (cursor +
                        activeDot + "Sum hittil" tooltip) — exists only while
                        hovering, driven by the pointer-tracking effect. */}
                    <div className="chart-hl">
                      <span className="hl-cursor" />
                      <span className="hl-dot" />
                      <span className="hl-tip">
                        <small>Sum hittil</small>
                        <span className="hl-row">
                          <i />
                          <b>{formatKroner(27830)}</b>
                          <em>5. jul</em>
                        </span>
                      </span>
                    </div>
                    </div>
                    <div className="chart-x">
                      <span>15. jun</span>
                      <span>15. jul</span>
                    </div>
                  </div>
                  <div className="shot-cols">
                    <div className="shot-col">
                      <h5>Neste kurs</h5>
                      <div className="row">
                        <span className="row-date">
                          <small>jul</small>
                          <b>15</b>
                        </span>
                        <span className="row-txt">
                          <b>Morning Flow</b>
                          <small>I dag kl. 09:00</small>
                        </span>
                        <span className="row-meta">{`8${NBSP}/${NBSP}10`}</span>
                      </div>
                      <div className="row">
                        <span className="row-date">
                          <small>jul</small>
                          <b>16</b>
                        </span>
                        <span className="row-txt">
                          <b>Vinyasa Flow</b>
                          <small>I morgen kl. 18:00</small>
                        </span>
                        <span className="row-meta">{`12${NBSP}/${NBSP}14`}</span>
                      </div>
                    </div>
                    <div className="shot-col">
                      <h5>Siste påmeldinger</h5>
                      <div className="row">
                        <AvatarGlyph />
                        <span className="row-txt">
                          <b>Olav Hansen</b>
                          <small>Morning Flow</small>
                        </span>
                        <span className="row-meta">2 timer siden</span>
                      </div>
                      <div className="row">
                        <AvatarGlyph />
                        <span className="row-txt">
                          <b>Mari Eriksen</b>
                          <small>Vinyasa Flow</small>
                        </span>
                        <span className="row-meta">5 timer siden</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Proof strip — static centered row on desktop; on narrow screens the
            three items roll as a marquee band (copies 2–3 exist only for the
            seamless loop and are hidden from assistive tech). */}
        <section className="proof" aria-label="Nøkkelpunkter">
          <div className="proof-band">
            <div className="proof-track">
              {[0, 1, 2].map((copy) => (
                <div className="proof-group" key={copy} aria-hidden={copy > 0 || undefined}>
                  {PROOF_ITEMS.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Storefront showcase */}
        <section id="platforms" className="section container" aria-label="Studiosiden">
          <div className="split">
            <div className="section-head">
              <h2>En side for kursene dine.</h2>
              <p className="section-sub">
                Timeplan, påmelding og betaling på én offentlig side. Deltakerne ser ledige plasser og melder seg på
                direkte.
              </p>
            </div>
            <div
              className="frame"
              data-reveal=""
              role="img"
              aria-label="Forhåndsvisning av studiosiden til Flyt Studio med timeplan og påmelding"
            >
              <div className="sf">
                <div className="sf-head">
                  <span className="sf-ava">≈</span>
                  <div>
                    <b>Flyt Studio</b>
                    <small>Grünerløkka · Markveien 12, 0554 Oslo</small>
                  </div>
                  <span className="sf-filter">Alle kurstyper ▾</span>
                </div>
                <div className="sf-body">
                  <p className="sf-date">Tirsdag 11. august</p>
                  <div className="sf-row">
                    <div className="sf-time">
                      <b>18:00</b>
                      <small>90 min</small>
                    </div>
                    <div className="sf-txt">
                      <b>Yoga for nybegynnere</b>
                      <small>8 økter · Ingrid Larsen</small>
                    </div>
                    <div className="sf-cta">
                      <small>fra {formatKroner(250)}</small>
                      <span className="sf-pill">Reserver</span>
                    </div>
                  </div>
                  <div className="sf-row">
                    <div className="sf-time">
                      <b>19:45</b>
                      <small>60 min</small>
                    </div>
                    <div className="sf-txt">
                      <b>Yin Yoga</b>
                      <small>6 økter · Kine Berg</small>
                    </div>
                    <div className="sf-cta">
                      <small>fra {formatKroner(250)}</small>
                      <span className="sf-pill">Reserver</span>
                    </div>
                  </div>
                  <p className="sf-date">Onsdag 12. august</p>
                  <div className="sf-row">
                    <div className="sf-time">
                      <b>07:00</b>
                      <small>45 min</small>
                    </div>
                    <div className="sf-txt">
                      <b>Morgenpilates</b>
                      <small>Kine Berg</small>
                    </div>
                    <div className="sf-cta">
                      <small>fra {formatKroner(99)}</small>
                      <span className="sf-pill">Reserver</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Functionality flow — numbered steps + settings card */}
        <section id="product" className="section container" aria-label="Funksjonalitet">
          <div className="section-head centered">
            <h2>Fra påmelding til utbetaling.</h2>
            <p className="section-sub">Du slipper fakturaer, regneark og purringer.</p>
          </div>
          <div className="flow">
            <div className="flow-step">
              <div>
                <span className="step-num">1</span>
              </div>
              <div className="step-text" data-reveal="">
                <h3>Påmelding</h3>
                <p>Deltakerne melder seg på selv, og deltakerlisten oppdateres automatisk.</p>
              </div>
              <div className="step-visual grey" data-reveal="" aria-hidden="true">
                <div className="mini mini-list">
                  <div className="p-row">
                    <AvatarGlyph />
                    <div>
                      <b>Olav Hansen</b>
                      <small>olav.hansen@gmail.com</small>
                    </div>
                  </div>
                  <div className="p-row">
                    <AvatarGlyph />
                    <div>
                      <b>Mari Eriksen</b>
                      <small>mari.eriksen@gmail.com</small>
                    </div>
                  </div>
                  <div className="p-row">
                    <AvatarGlyph />
                    <div>
                      <b>Anne Sørensen</b>
                      <small>anne.sorensen@gmail.com</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flow-step">
              <div>
                <span className="step-num">2</span>
              </div>
              <div className="step-text" data-reveal="">
                <h3>Betaling</h3>
                <p>Deltakerne betaler ved påmelding. Du får utbetalingen til bankkontoen din.</p>
              </div>
              <div className="step-visual grey" data-reveal="" aria-hidden="true">
                <div className="mini mini-pay">
                  <div className="pay-top">
                    <div>
                      <small>Utbetaling</small>
                      <p className="pay-sum">{formatKroner(12480)}</p>
                    </div>
                    <span className="chip-paid">Sendt</span>
                  </div>
                  <div className="pay-sub">
                    <small>{`Til konto ···${NBSP}4321 · 15. juli`}</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="flow-step">
              <div>
                <span className="step-num">3</span>
              </div>
              <div className="step-text" data-reveal="">
                <h3>Oversikt</h3>
                <p>Se inntekter, påmeldinger og deltakere for hvert kurs.</p>
              </div>
              <div className="step-visual grey" data-reveal="" aria-hidden="true">
                <div className="mini mini-stats">
                  <div className="stat-head">
                    <b>Yoga for nybegynnere</b>
                  </div>
                  <div className="stat-tiles">
                    <div className="stat-tile">
                      <small>Påmeldte</small>
                      <b>{`12${NBSP}/${NBSP}14`}</b>
                    </div>
                    <div className="stat-tile">
                      <small>Inntekt</small>
                      <b>{formatKroner(18500)}</b>
                    </div>
                    <div className="stat-tile">
                      <small>Pris</small>
                      <b>{formatKroner(2400)}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="settings-card" data-reveal="">
            <div className="settings-text">
              <h3>Drop-in og påmelding etter oppstart</h3>
              <ul className="settings-list">
                <li>
                  <CheckGlyph />
                  Åpne for påmelding etter oppstart
                </li>
                <li>
                  <CheckGlyph />
                  Prisen justeres automatisk
                </li>
              </ul>
            </div>
            <div aria-hidden="true">
              <div className="mini mini-set">
                <div className="set-row">
                  <div>
                    <span className="set-label">
                      <b>Tillat drop-in</b>
                      <i className="info-dot">i</i>
                    </span>
                    <div className="set-price">
                      <small>Pris per time</small>
                      <span className="field">
                        {formatKroner(250).replace(/ kr$/, '')} <em>kr</em>
                      </span>
                    </div>
                  </div>
                  <span className="switch" />
                </div>
                <div className="set-row">
                  <span className="set-label">
                    <b>Tillat påmelding etter oppstart</b>
                    <i className="info-dot">i</i>
                  </span>
                  <span className="switch" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="section container plan-cards" aria-label="Pris">
          <div className="section-head centered">
            <h2>En pris som er enkel å forstå.</h2>
            <p className="section-sub">Start gratis – bytt til Pro når salget vokser.</p>
          </div>
          {/* Billing-period toggle — Maze pricing pattern (labels flank the
              switch, discount badge OUTSIDE the control beside Årlig): the
              incentive must be readable before the toggle is flipped — same
              rule as the dashboard billing toggle. */}
          <div className="price-toggle" data-reveal="">
            <button
              type="button"
              className="pt-opt"
              data-active={yearly ? undefined : ''}
              onClick={() => setYearly(false)}
            >
              Månedlig
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={yearly}
              aria-label="Årlig betaling"
              className="pt-switch"
              onClick={() => setYearly((v) => !v)}
            >
              <span className="pt-knob" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pt-opt"
              data-active={yearly ? '' : undefined}
              onClick={() => setYearly(true)}
            >
              Årlig
            </button>
            <span className="pt-save">2 måneder gratis</span>
          </div>
          <div className="pricing-grid">
            <article className="plan plan-white" data-reveal="">
              <h3 className="plan-name">Start</h3>
              <p className="plan-price">Gratis</p>
              <p className="plan-desc">{`Du betaler 5${NBSP}% plattformgebyr per salg.`}</p>
              <ul className="plan-list">
                <li>
                  <CheckGlyph />
                  Ubegrenset antall kurs og deltakere
                </li>
                <li>
                  <CheckGlyph />
                  Kortbetaling og automatiske utbetalinger
                </li>
                <li>
                  <CheckGlyph />
                  Egen studioside
                </li>
              </ul>
              <SignupCta className="btn btn-chrome btn-full" label="Kom i gang" intent="seller" />
            </article>
            <article className="plan plan-featured" data-reveal="">
              <h3 className="plan-name">
                Pro <span className="plan-tag">Anbefalt</span>
              </h3>
              <p className="plan-price plan-price-swap" data-yearly={yearly ? '' : undefined}>
                <span className="pp-layer pp-monthly" aria-hidden={yearly}>
                  {formatKroner(499)}
                  <small> / mnd eks. mva.</small>
                </span>
                <span className="pp-layer pp-yearly" aria-hidden={!yearly}>
                  {formatKroner(4990)}
                  <small> / år eks. mva.</small>
                </span>
              </p>
              <p className="plan-desc">
                {yearly
                  ? 'Fast årspris – ingen plattformgebyr.'
                  : 'Fast månedspris – ingen plattformgebyr.'}
              </p>
              <ul className="plan-list">
                <li>
                  <CheckGlyph />
                  Alt i Start
                </li>
                <li>
                  <CheckGlyph />
                  {`0${NBSP}% plattformgebyr`}
                </li>
                <li>
                  <CheckGlyph />
                  Ingen bindingstid
                </li>
              </ul>
              <p className="plan-note">
                Selger du for mer enn {formatKroner(10000)} i måneden, lønner Pro seg.
              </p>
              <SignupCta className="btn btn-white btn-full" label="Velg Pro" intent="seller" />
            </article>
          </div>
        </section>

        {/* Final CTA band */}
        <section className="section container" aria-label="Kom i gang">
          <div className="cta-panel" data-reveal="">
            <h2>Start med neste kurs.</h2>
            <p>Opprett konto, legg inn kurset og del studiosiden din.</p>
            <div className="hero-ctas">
              <SignupCta className="btn btn-white" label="Opprett konto" intent="seller" />
            </div>
          </div>
        </section>
      </main>

      <footer className="footer container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a className="wordmark" href="#">
              UpNext
            </a>
            <p>Påmelding, betaling og kursoversikt for yogastudioer.</p>
          </div>
          <nav aria-label="Produktlenker">
            <h3>Produkt</h3>
            <ul>
              <li>
                <a href="#pricing">Pris</a>
              </li>
              <li>
                <Link to="/om-oss">Om oss</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Kontolenker">
            <h3>Konto</h3>
            <ul>
              <li>
                <Link to="/auth">Logg inn</Link>
              </li>
              {!PRELAUNCH && (
                <li>
                  <Link to="/auth">Opprett konto</Link>
                </li>
              )}
            </ul>
          </nav>
          <nav aria-label="Juridiske lenker">
            <h3>Juridisk</h3>
            <ul>
              <li>
                <Link to="/terms">Vilkår</Link>
              </li>
              <li>
                <Link to="/personvern">Personvern</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="footer-legal">
          © {new Date().getFullYear()} UpNext. Laget av {COMPANY.legalName}.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
