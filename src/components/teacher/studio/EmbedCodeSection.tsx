import { ExternalLink } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
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
  const previewUrl = `${origin}/embed/${slug}`;
  const snippet = `<iframe src="${origin}/embed/${slug}"
  style="width:100%;height:640px;border:0"
  loading="lazy" title="Kurskalender"></iframe>`;

  return (
    <SettingsRow
      title="Kalender på eget nettsted"
      description="Lim inn koden på nettstedet ditt for å vise kurskalenderen med påmelding."
    >
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed text-foreground select-all">
        <code>{snippet}</code>
      </pre>
      <p className="mt-2 text-sm text-foreground-muted">
        Juster height-verdien etter behov.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <CopyButton value={snippet} label="Kopier kode" />
        <Button
          type="button"
          variant="ghost"
          onClick={() => window.open(previewUrl, '_blank')}
        >
          <ExternalLink data-icon="inline-start" />
          Forhåndsvis
        </Button>
      </div>
    </SettingsRow>
  );
}
