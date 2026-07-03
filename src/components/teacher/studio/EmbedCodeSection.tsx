import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { SettingsRow } from '@/components/teacher/SettingsRows';

/**
 * EmbedCodeSection — the seller-facing "copy embed code" panel on the Studio
 * Profil tab. Hands the teacher the iframe snippet for the public /embed/:slug
 * calendar so they can drop it into their own website.
 *
 * Renders as a SettingsRow so it sits inline with the other Profil rows (shared
 * horizontal settings layout). `slug` is the SAVED slug (from the seller row),
 * not a dirty unsaved edit — the embed only works once the slug is live.
 */
export function EmbedCodeSection({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const origin = window.location.origin;
  const previewUrl = `${origin}/embed/${slug}`;
  const snippet = `<iframe src="${origin}/embed/${slug}"
  style="width:100%;height:640px;border:0"
  loading="lazy" title="Kurskalender"></iframe>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Kunne ikke kopiere koden');
    }
  };

  return (
    <SettingsRow
      title="Kalender på eget nettsted"
      description="Lim inn koden på nettstedet ditt for å vise kurskalenderen med påmelding."
    >
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-[13px] leading-relaxed text-foreground select-all">
        <code>{snippet}</code>
      </pre>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => void handleCopy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Kopiert' : 'Kopier kode'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => window.open(previewUrl, '_blank')}
        >
          <ExternalLink className="size-4" />
          Forhåndsvis
        </Button>
      </div>
    </SettingsRow>
  );
}
