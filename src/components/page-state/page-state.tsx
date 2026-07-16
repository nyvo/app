import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

/**
 * PageState — the canonical "this whole page cannot render" shell.
 *
 * Studio pattern: illustration slot → headline → optional supporting line →
 * optional single action. No card chrome, no dual button, no eyebrow.
 * The browser's own back/URL bar is always available; an in-page action is
 * only added when there's a useful contextual destination.
 *
 * Variants supply pre-set copy + default action. Override any field via
 * props; pass `null` to hide a default (`description={null}` or `action={null}`).
 */

type PageStateVariant =
  | 'generic'
  | 'course'
  | 'public-course'
  | 'public-team'
  | 'permission'
  | 'server-error';

interface PageStateProps {
  variant?: PageStateVariant;
  title?: string;
  description?: string | null;
  action?: ReactNode | null;
  illustration?: ReactNode;
  /**
   * Root element. Defaults to `main` for public/standalone routes where this
   * is the page's landmark. Pass `div` when rendering inside the teacher
   * shell — SidebarInset already owns the `<main>` landmark there, and
   * nesting a second one is invalid.
   */
  as?: 'main' | 'div';
}

const VARIANTS: Record<
  PageStateVariant,
  { title: string; description: string | null; action: ReactNode | null }
> = {
  generic: {
    title: 'Vi finner ikke denne siden',
    description: 'Lenken er kanskje utdatert, eller siden er flyttet.',
    action: null,
  },
  course: {
    title: 'Vi finner ikke dette kurset',
    description: 'Det kan være slettet, eller lenken er utdatert.',
    action: (
      <Button asChild>
        <Link to={routes.courses}>Til kursoversikten</Link>
      </Button>
    ),
  },
  'public-course': {
    title: 'Kurset er ikke lenger tilgjengelig',
    description: 'Det kan være avsluttet, avlyst eller flyttet.',
    action: null,
  },
  'public-team': {
    title: 'Vi finner ikke dette studioet',
    description: 'Lenken er kanskje utdatert.',
    action: null,
  },
  permission: {
    title: 'Du har ikke tilgang til denne siden',
    description: 'Logg inn med en konto som har tilgang, eller be eieren invitere deg.',
    action: (
      <Button asChild>
        <Link to={routes.auth}>Logg inn</Link>
      </Button>
    ),
  },
  'server-error': {
    title: 'Noe gikk galt',
    description: 'Prøv igjen om noen sekunder.',
    action: (
      <Button onClick={() => window.location.reload()}>
        Last på nytt
      </Button>
    ),
  },
};

export function PageState({
  variant = 'generic',
  title,
  description,
  action,
  illustration,
  as: Root = 'main',
}: PageStateProps) {
  const cfg = VARIANTS[variant];
  const resolvedTitle = title ?? cfg.title;
  const resolvedDescription = description === undefined ? cfg.description : description;
  const resolvedAction = action === undefined ? cfg.action : action;

  return (
    <Root className="min-h-[60dvh] flex flex-col items-center justify-center text-center px-6 py-12">
      {illustration ? <div className="mb-8">{illustration}</div> : null}
      <h1 className="max-w-md text-balance text-2xl font-medium text-foreground">
        {resolvedTitle}
      </h1>
      {resolvedDescription ? (
        <p className="mt-3 max-w-md text-pretty text-base text-foreground-muted">
          {resolvedDescription}
        </p>
      ) : null}
      {resolvedAction ? <div className="mt-6">{resolvedAction}</div> : null}
    </Root>
  );
}
