import { Building } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { PublicSeller } from '@/services/sellers';

export type StudioTab = 'kurs' | 'informasjon';

interface StudioHeroProps {
  organization: PublicSeller;
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
}

const TABS: { key: StudioTab; label: string }[] = [
  { key: 'kurs', label: 'Kurs' },
  { key: 'informasjon', label: 'Informasjon' },
];

/**
 * Full-bleed banner that doubles as the page header. The studio's avatar
 * sits on top of the banner so the studio's identity is the first thing
 * the visitor sees — no Openspot chrome above it.
 */
export function StudioHero({ organization, activeTab, onTabChange }: StudioHeroProps) {
  const coverUrl = organization.default_course_image_url;

  return (
    <section>
      <div
        className={cn(
          'relative w-full h-32 sm:h-40 lg:h-48 overflow-hidden',
          !coverUrl && 'bg-muted',
        )}
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-12 sm:-mt-14">
          {organization.logo_url ? (
            <div className="size-24 sm:size-28 rounded-full bg-background ring-4 ring-background overflow-hidden flex items-center justify-center shadow-sm">
              <img
                src={organization.logo_url}
                alt={`${organization.name} logo`}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div
              className={cn(
                'size-24 sm:size-28 rounded-full ring-4 ring-background shadow-sm',
                'bg-muted text-foreground-muted',
                'flex items-center justify-center',
              )}
              aria-label={organization.name}
            >
              <Building className="size-10 sm:size-12" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <h1 className="mt-5 sm:mt-6 font-semibold tracking-tight text-foreground text-3xl sm:text-4xl leading-tight">
          {organization.name}
        </h1>

        <div
          role="tablist"
          aria-label="Studioseksjoner"
          className="mt-6 flex gap-6 border-b border-border"
        >
          {TABS.map(tab => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  'relative -mb-px py-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 rounded-sm',
                  isActive
                    ? 'text-foreground'
                    : 'text-foreground-muted hover:text-foreground',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'absolute inset-x-0 -bottom-px h-px transition-colors',
                    isActive ? 'bg-foreground' : 'bg-transparent',
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
