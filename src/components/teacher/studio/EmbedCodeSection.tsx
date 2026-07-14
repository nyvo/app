import { Check, Copy, ExternalLink } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/components/ui/copy-button';
import { SettingsRow } from '@/components/teacher/SettingsRows';

/**
 * EmbedCodeSection — the seller-facing "copy embed code" row on the Studio
 * Nettsted tab. Hands the teacher the iframe snippet for the public
 * /embed/:slug calendar so they can drop it into their own website.
 *
 * Lives on its own tab, never inline in the profile form — raw HTML mid-form
 * reads as a dev tool. On a dedicated integration surface the snippet is shown
 * (Circle's Embed settings page on Mobbin). `slug` is the SAVED slug (from the
 * seller row), not a dirty unsaved edit — the embed only works once the slug
 * is live.
 */
export function EmbedCodeSection({ slug }: { slug: string }) {
  const origin = window.location.origin;
  // Forhåndsvis opens the framed preview page, not the bare iframe payload.
  const previewUrl = `${origin}/embed/${slug}/preview`;
  const snippet = `<iframe src="${origin}/embed/${slug}"
  style="width:100%;height:640px;border:0"
  loading="lazy" title="Kurskalender"></iframe>`;
  const { copied, copy } = useCopyToClipboard();

  return (
    <SettingsRow
      title="Kalender på eget nettsted"
      description="Lim inn koden på nettstedet ditt for å vise kurskalenderen med påmelding."
    >
      {/* Copy lives INSIDE the code window (top-right icon, Copy→Check swap)
          — the standard SaaS code-block anatomy — not as a button below. */}
      <div className="relative">
        {/* select-text (not select-all): all-select hijacked click-drag so
            partial selection was impossible — normal text selection now works
            alongside the copy chip. */}
        <pre className="select-text overflow-x-auto rounded-lg bg-muted p-4 pr-14 font-mono text-xs leading-relaxed text-foreground">
          <code>{snippet}</code>
        </pre>
        <button
          type="button"
          onClick={() => void copy(snippet)}
          aria-label={copied ? 'Kopiert' : 'Kopier kode'}
          // Opaque chip (white + hairline) so horizontally-scrolling code
          // can't render through it — GitHub's copy-chip anatomy.
          className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-lg border border-border-subtle bg-surface text-foreground-muted transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="mt-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.open(previewUrl, '_blank')}
        >
          <ExternalLink data-icon="inline-start" />
          Forhåndsvis
        </Button>
      </div>
    </SettingsRow>
  );
}
