/**
 * Grain — expression-layer texture (SVG fractal noise overlay).
 * Marketing/public surfaces only; lives outside components/ui on purpose
 * so the dashboard can't pick it up as a shared primitive.
 */
type GrainProps = {
  opacity?: number;
  baseFrequency?: number;
  /** `multiply` darkens — for light surfaces. `soft-light` lifts/speckles — for dark surfaces (chrome bands). */
  blend?: 'multiply' | 'soft-light' | 'overlay';
  className?: string;
};

const BLEND_CLASS: Record<NonNullable<GrainProps['blend']>, string> = {
  multiply: 'mix-blend-multiply',
  'soft-light': 'mix-blend-soft-light',
  overlay: 'mix-blend-overlay',
};

// The noise itself only depends on baseFrequency — everything else (opacity,
// blend mode, className) is applied on the wrapping div. Rasterizing the
// feTurbulence filter is expensive, so build each distinct SVG once per
// baseFrequency and reuse the data URI across every mounted instance instead
// of every <Grain> re-running its own filter chain.
const grainDataUriCache = new Map<number, string>();

// Fixed tile size (px) the noise is rasterized at, then repeated as a CSS
// background. No viewBox is set, so 1 SVG user unit = 1px — baseFrequency
// keeps the same cycles-per-pixel density it had when the filter used to
// fill the whole container directly, just computed once at 200x200 instead
// of once per (larger) instance.
const TILE_SIZE = 200;

function getGrainDataUri(baseFrequency: number): string {
  const cached = grainDataUriCache.get(baseFrequency);
  if (cached) return cached;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}">` +
    `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="2" stitchTiles="stitch" />` +
    `<feColorMatrix type="saturate" values="0" />` +
    `<feComponentTransfer><feFuncA type="linear" slope="0.6" /></feComponentTransfer></filter>` +
    `<rect width="100%" height="100%" filter="url(#n)" /></svg>`;

  const dataUri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  grainDataUriCache.set(baseFrequency, dataUri);
  return dataUri;
}

export function Grain({
  opacity = 0.35,
  baseFrequency = 0.9,
  blend = 'multiply',
  className = '',
}: GrainProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${BLEND_CLASS[blend]} ${className}`}
      style={{
        opacity,
        backgroundImage: getGrainDataUri(baseFrequency),
        backgroundRepeat: 'repeat',
      }}
    />
  );
}
