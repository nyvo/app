import { useId } from 'react';

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

export function Grain({
  opacity = 0.35,
  baseFrequency = 0.9,
  blend = 'multiply',
  className = '',
}: GrainProps) {
  const reactId = useId();
  const filterId = `grain-${reactId.replace(/:/g, '')}`;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${BLEND_CLASS[blend]} ${className}`}
      style={{ opacity }}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={baseFrequency}
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.6" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
}
