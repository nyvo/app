import { useId } from 'react';

/**
 * Grain — expression-layer texture (SVG fractal noise overlay).
 * Marketing/public surfaces only; lives outside components/ui on purpose
 * so the dashboard can't pick it up as a shared primitive.
 */
type GrainProps = {
  opacity?: number;
  baseFrequency?: number;
  className?: string;
};

export function Grain({
  opacity = 0.35,
  baseFrequency = 0.9,
  className = '',
}: GrainProps) {
  const reactId = useId();
  const filterId = `grain-${reactId.replace(/:/g, '')}`;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 mix-blend-multiply ${className}`}
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
