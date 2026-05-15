import { EntityCard } from '@/components/teacher/dashboard/EntityCard';

export default function EntityCardPreview() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            EntityCard preview
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Hashnode-style workspace card. Image on the leading edge, title /
            subtitle / meta stacked to the right, pill actions + external link
            along the bottom.
          </p>
        </header>

        <div className="space-y-6">
          <EntityCard
            title="Morgenflyt Studio"
            subtitle="morgenflyt.openspot.no"
            meta="Sist endret 5. feb 2026"
            imageUrl={null}
            actions={[
              { key: 'edit', label: 'Rediger', onClick: () => undefined },
              { key: 'dashboard', label: 'Innstillinger', onClick: () => undefined },
            ]}
            externalHref="https://example.com"
          />

          <EntityCard
            title="Vinyasa Flow — vårsemester"
            subtitle="8 uker · onsdager kl. 18:00"
            meta="12 av 14 påmeldte"
            imageUrl={null}
            actions={[{ key: 'open', label: 'Åpne kurs', onClick: () => undefined }]}
          />

          <EntityCard
            title="Uten handlinger"
            subtitle="enkleste-variant.openspot.no"
            meta="Sist endret i går"
          />
        </div>
      </div>
    </div>
  );
}
