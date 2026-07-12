import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from '@/lib/icons';
import { routes } from '@/lib/routes';
import { useDocumentTitle } from '@/hooks/use-document-title';

/**
 * Preview wrapper for the embeddable calendar — the "Forhåndsvis" target from
 * the Studio embed-code row. Frames /embed/:slug in an actual iframe (so the
 * teacher sees exactly what their website will render) with page chrome the
 * bare embed route deliberately lacks: back link, title, description.
 * /embed/:slug itself stays chrome-less — it IS the iframe payload.
 */
const EmbedPreviewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  useDocumentTitle('Forhåndsvisning av kurskalender');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* max-w-4xl, not 3xl: the calendar's side-by-side layout needs a
          ≥672px container INSIDE the iframe (its @2xl container query), and
          a 3xl column left it 2px short — stacking it into mobile layout. */}
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <Link
          to={routes.studio}
          className="focus-ring -mb-1 inline-flex items-center gap-1.5 self-start rounded text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          Tilbake til Studio
        </Link>

        <header className="mt-6 mb-8">
          <h1 className="text-2xl font-medium text-foreground">Kurskalender</h1>
          <p className="mt-2 text-base text-foreground-muted">
            Slik ser kalenderen ut når den er lagt inn på nettstedet ditt.
          </p>
        </header>

        {slug && (
          <iframe
            src={`/embed/${slug}`}
            title="Kurskalender"
            loading="lazy"
            className="h-[640px] w-full"
          />
        )}
      </div>
    </div>
  );
};

export default EmbedPreviewPage;
