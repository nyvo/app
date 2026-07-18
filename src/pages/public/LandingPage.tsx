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
// under the `.lnd` scope. "Raden" is the brand chosen for this page.
// =============================================================================

const NBSP = ' ';

const PROOF_ITEMS = ['Gratis å starte', 'Automatiske utbetalinger', 'Ingen bindingstid'];

/** R-monogram, white glyph on the chrome logo tile. */
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
function SignupCta({ className, label }: { className: string; label: string }) {
  if (PRELAUNCH) {
    return (
      <a className={className} href={`mailto:${COMPANY.email}`}>
        Ta kontakt
      </a>
    );
  }
  return (
    <Link className={className} to="/auth?intent=seller">
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
              <RadenMark />
            </span>
            <span className="wordmark">Raden</span>
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
            <h1>Mindre administrasjon. Mer tid til kurset.</h1>
            <p className="hero-sub">
              Påmeldinger, betalinger og deltakere – samlet på ett sted.
            </p>
            <div className="hero-ctas">
              <SignupCta className="btn btn-white" label="Opprett konto" />
              <a className="btn btn-glass-azure" href="#platforms">
                Se hvordan det fungerer
              </a>
            </div>

            <div
              className="shot"
              role="img"
              aria-label="Forenklet forhåndsvisning av oversikten i Raden med inntekt, neste kurs og siste påmeldinger"
            >
              <div className="shot-bar">
                <span className="shot-dot" />
                <span className="shot-dot" />
                <span className="shot-dot" />
                <span className="shot-url">raden.no</span>
              </div>
              <div className="shot-body">
                <aside className="shot-side">
                  <span className="shot-logo">
                    <span className="logo-tile" aria-hidden="true">
                      <RadenMark />
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
                        250 <em>kr</em>
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
              <SignupCta className="btn btn-chrome btn-full" label="Kom i gang" />
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
              <SignupCta className="btn btn-white btn-full" label="Velg Pro" />
            </article>
          </div>
        </section>

        {/* Final CTA band */}
        <section className="section container" aria-label="Kom i gang">
          <div className="cta-panel" data-reveal="">
            <h2>Start med neste kurs.</h2>
            <p>Opprett konto, legg inn kurset og del studiosiden din.</p>
            <div className="hero-ctas">
              <SignupCta className="btn btn-white" label="Opprett konto" />
            </div>
          </div>
        </section>
      </main>

      <footer className="footer container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a className="wordmark" href="#">
              Raden
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
                  <Link to="/auth?intent=seller">Opprett konto</Link>
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
          © {new Date().getFullYear()} Raden. Laget av {COMPANY.legalName}.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
