import { Link } from 'react-router-dom';
import { ArrowLeft, Infinity } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsPage = () => {
  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-gray-200 selection:text-gray-900">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
          <Button variant="outline-soft" size="sm" className="text-text-secondary hover:text-text-primary" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake
            </Link>
          </Button>
        </div>
        
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center text-white shadow-sm">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-semibold tracking-tighter text-text-primary">
            Ease
          </span>
        </Link>

        <div className="w-24" />
      </header>

      {/* Terms Content */}
      <main className="flex-1 px-4 sm:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary mb-12 text-center">
            Vilkår for påmelding
          </h1>

          {/* Content */}
          <div className="space-y-12">
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">1. Påmelding og betaling</h2>
              <p className="text-text-secondary leading-relaxed mb-4 text-sm">
                Ved påmelding til kurs godtar du å betale det oppgitte beløpet. Påmeldingen er bindende når betalingen er gjennomført.
              </p>
              <p className="text-text-secondary leading-relaxed text-sm">
                Du vil motta en bekreftelse på e-post når påmeldingen er registrert.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">2. Avbestilling</h2>
              <p className="text-text-secondary leading-relaxed mb-4 text-sm">
                Du kan avbestille din påmelding inntil 48 timer før kursstart for full refusjon.
              </p>
              <p className="text-text-secondary leading-relaxed mb-4 text-sm">
                Ved avbestilling senere enn 48 timer før kursstart, eller ved uteblivelse, refunderes ikke kursavgiften.
              </p>
              <p className="text-text-secondary leading-relaxed text-sm">
                Instruktøren forbeholder seg retten til å avlyse kurset ved for få påmeldte. Ved avlysning fra instruktørens side refunderes hele kursavgiften.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">3. Ansvar</h2>
              <p className="text-text-secondary leading-relaxed mb-4 text-sm">
                Deltakelse på kurs skjer på eget ansvar. Instruktøren er ikke ansvarlig for skader som måtte oppstå under kurset.
              </p>
              <p className="text-text-secondary leading-relaxed text-sm">
                Ved eventuelle helseutfordringer anbefales det å konsultere lege før deltakelse.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">4. Personvern</h2>
              <p className="text-text-secondary leading-relaxed text-sm">
                Vi behandler dine personopplysninger i henhold til gjeldende personvernlovgivning.
                Opplysninger brukes kun til administrasjon av kurspåmelding og kommunikasjon relatert til kurset.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">5. Endringer</h2>
              <p className="text-text-secondary leading-relaxed text-sm">
                Instruktøren forbeholder seg retten til å gjøre endringer i kursprogrammet eller vilkårene.
                Eventuelle endringer vil bli kommunisert til påmeldte deltakere.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-xs text-text-tertiary">
              Sist oppdatert: Januar 2026
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;