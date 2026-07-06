import { useState } from 'react'
import { Calendar, Clock, ImageIcon, MapPin } from '@/lib/icons'

/**
 * Dev-only DESIGN EXPLORATION — intentionally OFF the design system / tokens.
 * An Eventbrite/Luma-flavored take on the course builder: white card on a warm
 * canvas, large friendly inputs, bigger/bolder labels, generous spacing, a
 * cover banner, and a pinned action footer. Purely to react to a different,
 * less-technical perspective. Not wired to anything.
 */

const labelCls = 'block text-[15px] font-semibold text-neutral-900'
const subCls = 'mt-0.5 text-sm text-neutral-500'
const inputCls =
  'w-full h-12 rounded-xl border border-neutral-300 bg-white px-4 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5'

function Field({
  label,
  sub,
  children,
}: {
  label: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {sub && <p className={subCls}>{sub}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold tracking-tight text-neutral-900">{children}</h2>
}

export default function CourseBuilderEventbrite() {
  const [format, setFormat] = useState<'single' | 'series'>('single')

  return (
    <main className="flex h-screen flex-col bg-[#f4f3f0]">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pt-10 pb-10 sm:px-6">
          <h1 className="mb-6 text-3xl font-bold tracking-tight text-neutral-900">Lag et kurs</h1>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {/* Cover banner */}
            <button
              type="button"
              className="group flex h-44 w-full flex-col items-center justify-center gap-2 border-b border-neutral-200 bg-neutral-50 text-neutral-500 transition hover:bg-neutral-100"
            >
              <ImageIcon className="size-7" strokeWidth={1.5} />
              <span className="text-[15px] font-medium">Legg til et bilde</span>
              <span className="text-sm text-neutral-400">Anbefalt størrelse 1200 × 750</span>
            </button>

            <div className="space-y-8 p-8">
              {/* Om kurset */}
              <section className="space-y-5">
                <SectionTitle>Om kurset</SectionTitle>
                <Field label="Tittel" sub="Et tydelig navn deltakerne kjenner igjen.">
                  <input className={inputCls} defaultValue="Morgenyoga" placeholder="F.eks. Morgenyoga for nybegynnere" />
                </Field>
                <Field label="Beskrivelse" sub="Hva får deltakerne ut av kurset?">
                  <textarea
                    className={`${inputCls} h-auto py-3 leading-relaxed`}
                    rows={4}
                    placeholder="Fortell litt om kurset…"
                  />
                </Field>
              </section>

              <hr className="border-neutral-200" />

              {/* Tid */}
              <section className="space-y-5">
                <SectionTitle>Når</SectionTitle>
                <Field label="Type">
                  <div className="inline-flex rounded-xl bg-neutral-100 p-1">
                    {(['single', 'series'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormat(t)}
                        className={`rounded-lg px-5 py-2 text-[15px] font-medium transition ${
                          format === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        {t === 'single' ? 'Enkeltkurs' : 'Kursserie'}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={format === 'series' ? 'Startdato' : 'Dato'}>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" strokeWidth={1.75} />
                    <input className={`${inputCls} pl-12`} placeholder="Velg dato" defaultValue="tirsdag 8. juli 2026" />
                  </div>
                </Field>
                <Field label="Tidspunkt">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Clock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" strokeWidth={1.75} />
                      <input className={`${inputCls} pl-12`} defaultValue="06:00" />
                    </div>
                    <span className="text-[15px] font-medium text-neutral-400">til</span>
                    <div className="relative flex-1">
                      <Clock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" strokeWidth={1.75} />
                      <input className={`${inputCls} pl-12`} defaultValue="07:00" />
                    </div>
                  </div>
                </Field>
              </section>

              <hr className="border-neutral-200" />

              {/* Sted og pris */}
              <section className="space-y-5">
                <SectionTitle>Hvor og pris</SectionTitle>
                <Field label="Sted" sub="Hvor møtes dere?">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" strokeWidth={1.75} />
                    <input className={`${inputCls} pl-12`} placeholder="Søk etter studio eller adresse" />
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Antall plasser">
                    <input className={inputCls} defaultValue="12" inputMode="numeric" />
                  </Field>
                  <Field label={format === 'series' ? 'Pris for hele kurset' : 'Pris'}>
                    <div className="relative">
                      <input className={`${inputCls} pr-12`} defaultValue="350" inputMode="numeric" />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-neutral-400">kr</span>
                    </div>
                  </Field>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned footer */}
      <div className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-3 px-4 py-3.5 sm:px-6">
          <button type="button" className="h-11 rounded-full border border-neutral-300 bg-white px-5 text-[15px] font-semibold text-neutral-800 transition hover:bg-neutral-50">
            Lagre utkast
          </button>
          <button type="button" className="h-11 rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white transition hover:bg-neutral-800">
            Publiser
          </button>
        </div>
      </div>
    </main>
  )
}
