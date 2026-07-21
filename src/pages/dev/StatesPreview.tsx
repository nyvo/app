import { useState } from 'react';
import { DevPage, PreviewSection } from './_kit';
import { PageState } from '@/components/page-state/page-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  Skeleton,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTableRows,
} from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/page-loader';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';

/**
 * Dev preview for every shared empty / error / loading primitive in the repo,
 * rendered live from the real source files (never re-implemented). One page,
 * one look, per building block — see .context/dev-audit/state-components.md
 * for the full API inventory this preview was built from.
 */

const PAGE_STATE_VARIANTS = [
  'generic',
  'course',
  'public-course',
  'public-team',
  'permission',
  'server-error',
] as const;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-background">
      {children}
    </div>
  );
}

function FrameLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-border-subtle bg-muted px-4 py-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
      {children}
    </p>
  );
}

export default function StatesPreview() {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <DevPage
      title="Tilstander"
      description="Tomme, feil- og lastetilstander — ekte komponenter"
    >
      {PAGE_STATE_VARIANTS.map((variant) => (
        <PreviewSection key={variant} label={`PageState — ${variant}`}>
          <Frame>
            <PageState variant={variant} as="div" />
          </Frame>
        </PreviewSection>
      ))}

      <PreviewSection
        label="Tomme tilstander"
        description="EmptyState (default/compact) + den domenespesifikke CoursesEmptyState-wrapperen."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Frame>
            <FrameLabel>default</FrameLabel>
            <EmptyState
              title="Du har ingen kurs ennå"
              description="Opprett ditt første kurs for å komme i gang."
            />
          </Frame>
          <Frame>
            <FrameLabel>compact + description</FrameLabel>
            <EmptyState
              variant="compact"
              title="Ingen påmeldinger ennå"
              description="Påmeldinger vises her så snart noen melder seg på."
            />
          </Frame>
          <div className="md:col-span-2">
            <Frame>
              <FrameLabel>CoursesEmptyState (domain wrapper)</FrameLabel>
              <CoursesEmptyState />
            </Frame>
          </div>
        </div>
      </PreviewSection>

      <PreviewSection
        label="Feiltilstander"
        description="ErrorState — default/inline/card, med en ekte onRetry-handler koblet til."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Frame>
            <FrameLabel>default</FrameLabel>
            <ErrorState />
          </Frame>
          <Frame>
            <FrameLabel>inline + onRetry</FrameLabel>
            <ErrorState
              variant="inline"
              onRetry={() => setRetryCount((count) => count + 1)}
            />
          </Frame>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
              card (selvinnrammet)
            </p>
            <ErrorState
              variant="card"
              title="Kunne ikke laste kontoen din"
              message="Last siden på nytt."
              onRetry={() => setRetryCount((count) => count + 1)}
            />
          </div>
        </div>
        <p className="mt-3 text-sm text-foreground-muted">
          "Prøv igjen" klikket {retryCount} {retryCount === 1 ? 'gang' : 'ganger'}.
        </p>
      </PreviewSection>

      <PreviewSection
        label="Lastetilstander"
        description="Skeleton-primitiver, PageLoader (Suspense-fallback) og Spinner."
      >
        <div className="space-y-8">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Skeleton
            </p>
            <div className="space-y-2 rounded-xl border border-border-subtle p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
              SkeletonCard
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SkeletonCard className="h-32 w-full" />
              <SkeletonCard className="h-32 w-full" />
              <SkeletonCard className="h-32 w-full" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
              SkeletonTableRow / SkeletonTableRows
            </p>
            <div className="overflow-hidden rounded-xl border border-border-subtle">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="px-4 py-3 text-sm font-medium text-foreground-muted sm:px-6">
                      Deltaker
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-foreground-muted sm:px-6">
                      Status
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-foreground-muted sm:px-6">
                      Beløp
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-foreground-muted sm:px-6">
                      Dato
                    </th>
                  </tr>
                </thead>
                <SkeletonTableRows rows={3} columns={4} />
                <tbody>
                  <SkeletonTableRow columns={4} hasAvatar />
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
              PageLoader (Suspense-fallback)
            </p>
            <div className="overflow-hidden rounded-xl border border-border-subtle [&>div]:min-h-64">
              <PageLoader />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Spinner
            </p>
            <div className="flex items-center gap-6 rounded-xl border border-border-subtle p-4">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="xs" />
                <span className="text-xs text-foreground-muted">xs</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="sm" />
                <span className="text-xs text-foreground-muted">sm</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="md" />
                <span className="text-xs text-foreground-muted">md</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <span className="text-xs text-foreground-muted">lg</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="xl" />
                <span className="text-xs text-foreground-muted">xl</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button loading loadingText="Lagrer…" />
                <span className="text-xs text-foreground-muted">
                  Button loading
                </span>
              </div>
            </div>
          </div>
        </div>
      </PreviewSection>
    </DevPage>
  );
}
