import { useState } from 'react';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

/**
 * Dev preview for the shared horizontal settings layout (SettingsRows /
 * SettingsRow). Auth-free, no data — mock state only. Sign-off surface for the
 * Phase 2 design pass before adopting the pattern on Studio / Innstillinger.
 *
 * Two blocks:
 *  1. "Rediger kurs" — the four course-edit sections (Bilde / Detaljer /
 *     Sted og tid / Påmelding) using the real primitives.
 *  2. "Studio" — a settings-page shape (Profilbilde / Navn / Nettadresse) to
 *     judge the same pattern for the next adoption step.
 *
 * The outer column mimics PageShell: max-w-6xl + px-8 py-12. The narrowing is
 * done entirely inside SettingsRow (220px label + 42rem control cap).
 */

/** Mirrors the local FieldLabel in CourseSettingsTab (vertical label-over-input). */
function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('mb-2 block text-sm font-medium text-foreground')}
    >
      {children}
    </label>
  );
}

const SettingsRowsPreview = () => {
  const [title, setTitle] = useState('Vinyasa Flow — Mandager');
  const [description, setDescription] = useState(
    'En rolig, pusteorientert flow for alle nivåer. Ta med egen matte.',
  );
  const [location, setLocation] = useState('Studio Sentrum, Oslo');
  const [date, setDate] = useState('2026-08-24');
  const [capacity, setCapacity] = useState('14');
  const [price, setPrice] = useState('220');

  const [avatarName, setAvatarName] = useState('Studio Sentrum');
  const [slug, setSlug] = useState('studio-sentrum');
  const [kontotype, setKontotype] = useState<'solo' | 'studio'>('studio');

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-6xl px-8 py-12 space-y-20">
        {/* Block 1 — course "Rediger" tab shape */}
        <section>
          <header className="mb-8">
            <h1 className="text-2xl font-medium text-foreground">
              Rediger kurs (preview)
            </h1>
            <p className="mt-2 text-base text-foreground-muted">
              Fire representative rader med de faktiske primitivene.
            </p>
          </header>

          <SettingsRows>
            <SettingsRow
              title="Bilde"
              description="Vises på kurskortet og kurssiden."
            >
              <div className="flex aspect-video max-w-sm items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-foreground-muted">
                Last opp bilde
              </div>
            </SettingsRow>

            <SettingsRow title="Detaljer" description="Tittel og beskrivelse slik de vises på kurssiden.">
              <div>
                <FieldLabel htmlFor="preview-title">Tittel</FieldLabel>
                <Input
                  id="preview-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base"
                />
              </div>
              <div>
                <FieldLabel htmlFor="preview-description">Beskrivelse</FieldLabel>
                <Textarea
                  id="preview-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </SettingsRow>

            <SettingsRow title="Sted og tid" id="preview-location" description="Hvor og når kurset holdes.">
              <div>
                <FieldLabel htmlFor="preview-place">Sted</FieldLabel>
                <Input
                  id="preview-place"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="preview-date">Startdato</FieldLabel>
                  <Input
                    id="preview-date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="preview-time">Tidspunkt</FieldLabel>
                  <Input id="preview-time" defaultValue="18:00–19:15" />
                </div>
              </div>
            </SettingsRow>

            <SettingsRow
              title="Påmelding"
              description="Plasser og pris for nye påmeldinger."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="preview-capacity">Plasser</FieldLabel>
                  <Input
                    id="preview-capacity"
                    inputMode="numeric"
                    value={capacity}
                    onChange={(e) =>
                      setCapacity(e.target.value.replace(/[^\d]/g, ''))
                    }
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="preview-price">Pris</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="preview-price"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value.replace(/[^\d]/g, ''))
                      }
                    />
                    <InputGroupAddon align="inline-end" aria-hidden="true">
                      kr
                    </InputGroupAddon>
                  </InputGroup>
                </div>
              </div>
            </SettingsRow>
          </SettingsRows>
        </section>

        {/* Block 2 — settings-page shape (Studio adoption target) */}
        <section>
          <header className="mb-8">
            <h1 className="text-2xl font-medium text-foreground">
              Studio (preview)
            </h1>
            <p className="mt-2 text-base text-foreground-muted">
              Samme mønster brukt på en innstillingsside.
            </p>
          </header>

          <SettingsRows>
            <SettingsRow
              title="Profilbilde"
              description="Vises på studiosiden og i kalenderen."
            >
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-border bg-muted/40 text-xs text-foreground-muted">
                  Bilde
                </div>
              </div>
            </SettingsRow>

            <SettingsRow title="Navn" description="Navnet på studioet slik kundene ser det.">
              <div>
                <FieldLabel htmlFor="preview-avatar-name">Studionavn</FieldLabel>
                <Input
                  id="preview-avatar-name"
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                />
              </div>
            </SettingsRow>

            <SettingsRow
              title="Nettadresse"
              description="Den offentlige lenken til studioet ditt."
            >
              <div>
                <FieldLabel htmlFor="preview-slug">Adresse</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start" aria-hidden="true">
                    openspot.no/
                  </InputGroupAddon>
                  <InputGroupInput
                    id="preview-slug"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.replace(/\s/g, ''))
                    }
                  />
                </InputGroup>
              </div>
            </SettingsRow>

            {/* Choice rows use the shared SegmentedTabs switch (same control as
                the course builder's Enkelttime/Kursrekke) — never cards. */}
            <SettingsRow
              title="Kontotype"
              description="Styrer hva du ser i verktøyet."
            >
              <div>
                <SegmentedTabs<'solo' | 'studio'>
                  value={kontotype}
                  onChange={setKontotype}
                  tabs={[
                    { key: 'solo', label: 'Jeg underviser selv' },
                    { key: 'studio', label: 'Jeg driver et studio' },
                  ]}
                  ariaLabel="Kontotype"
                />
                <p className="mt-3 text-sm text-foreground-muted">
                  {kontotype === 'solo'
                    ? 'Egen side med kursene dine.'
                    : 'Studioside med egne og tilknyttede instruktører.'}
                </p>
              </div>
            </SettingsRow>
          </SettingsRows>
        </section>
      </div>
    </div>
  );
};

export default SettingsRowsPreview;
