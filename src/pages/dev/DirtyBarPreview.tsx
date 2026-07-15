import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { DevPage, PreviewSection } from './_kit';
import { Button } from '@/components/ui/button';
import { DirtyFormBar } from '@/components/ui/dirty-form-bar';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Dev preview for DirtyFormBar — the floating «ulagrede endringer»-pill.
 *
 * The pill measures its parent column (not the viewport), so the width
 * selector changes the column the live pill anchors to and walks it through
 * both responsive layouts without resizing the browser: wide single row →
 * buttons-only (compact).
 *
 * Save failures are not shown in the bar — the "Simuler feil" save fires a
 * sonner toast and leaves the bar up (still dirty) for a retry, exactly like
 * the real pages do.
 */

const COLUMN_WIDTHS = [
  { label: 'Bred (720px)', width: 720 },
  { label: 'Smal (460px)', width: 460 },
  { label: 'Mobil (360px)', width: 360 },
] as const;

export default function DirtyBarPreview() {
  const [width, setWidth] = useState<number>(720);
  const [visible, setVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const runSave = (fail: boolean) => {
    setIsSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setIsSaving(false);
      if (fail) {
        // Real pages route save failures here — the bar stays up because the
        // form is still dirty, so the user can retry.
        toast.error('Kunne ikke lagre. Prøv igjen.');
        return;
      }
      toast.success('Endringer lagret');
      setVisible(false);
    }, 1000);
  };

  return (
    <DevPage
      title="DirtyFormBar"
      description="Flytende «ulagrede endringer»-pill. Bredde-valget endrer kolonnen pillen måler seg mot: bred rad → kun knapper. Feil vises som toast, ikke i pillen."
    >
      <PreviewSection label="Kontroller">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COLUMN_WIDTHS.map((w) => (
              <Button
                key={w.width}
                variant={width === w.width ? 'default' : 'secondary'}
                onClick={() => setWidth(w.width)}
              >
                {w.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => runSave(true)}>
              Simuler feil (toast)
            </Button>
            {!visible && (
              <Button variant="outline" onClick={() => setVisible(true)}>
                Vis pillen igjen
              </Button>
            )}
          </div>
        </div>
      </PreviewSection>

      <PreviewSection label="Live">
        {/* The dashed frame is the column the pill anchors to; the pill itself
            renders fixed at the bottom of the viewport, centered over it. */}
        <div
          style={{ width, maxWidth: '100%' }}
          className="space-y-4 rounded-xl border border-dashed border-border p-6"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <DirtyFormBar
            visible={visible}
            isSaving={isSaving}
            onSave={() => runSave(false)}
            onCancel={() => setVisible(false)}
          />
        </div>
      </PreviewSection>
    </DevPage>
  );
}
