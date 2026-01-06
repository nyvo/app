import { Link } from 'react-router-dom';
import { ArrowLeft, Infinity } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-stone-900 font-sans antialiased flex flex-col selection:bg-stone-200 selection:text-stone-900">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 flex justify-center z-50">
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-stone-900 rounded-md flex items-center justify-center text-white shadow-sm">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-semibold tracking-tighter text-stone-900">
            Ease
          </span>
        </Link>
      </header>

      {/* Terms Content */}
      <main className="flex-1 px-4 sm:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </Link>

          {/* Title */}
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-8">
            Vilkår for påmelding
          </h1>

          {/* Content */}
          <div className="prose prose-stone prose-sm max-w-none">
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-stone-900 mb-3">1. Påmelding og betaling</h2>
              <p className="text-stone-600 leading-relaxed mb-3">
                Ved påmelding til kurs godtar du å betale det oppgitte beløpet. Påmeldingen er bindende når betalingen er gjennomført.
              </p>
              <p className="text-stone-600 leading-relaxed">
                Du vil motta en bekreftelse på e-post når påmeldingen er registrert.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-stone-900 mb-3">2. Avbestilling</h2>
              <p className="text-stone-600 leading-relaxed mb-3">
                Du kan avbestille din påmelding inntil 48 timer før kursstart for full refusjon.
              </p>
              <p className="text-stone-600 leading-relaxed mb-3">
                Ved avbestilling senere enn 48 timer før kursstart, eller ved uteblivelse, refunderes ikke kursavgiften.
              </p>
              <p className="text-stone-600 leading-relaxed">
                Instruktøren forbeholder seg retten til å avlyse kurset ved for få påmeldte. Ved avlysning fra instruktørens side refunderes hele kursavgiften.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-stone-900 mb-3">3. Ansvar</h2>
              <p className="text-stone-600 leading-relaxed mb-3">
                Deltakelse på kurs skjer på eget ansvar. Instruktøren er ikke ansvarlig for skader som måtte oppstå under kurset.
              </p>
              <p className="text-stone-600 leading-relaxed">
                Ved eventuelle helseutfordringer anbefales det å konsultere lege før deltakelse.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-stone-900 mb-3">4. Personvern</h2>
              <p className="text-stone-600 leading-relaxed">
                Vi behandler dine personopplysninger i henhold til gjeldende personvernlovgivning.
                Opplysninger brukes kun til administrasjon av kurspåmelding og kommunikasjon relatert til kurset.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-stone-900 mb-3">5. Endringer</h2>
              <p className="text-stone-600 leading-relaxed">
                Instruktøren forbeholder seg retten til å gjøre endringer i kursprogrammet eller vilkårene.
                Eventuelle endringer vil bli kommunisert til påmeldte deltakere.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-stone-200">
            <p className="text-xs text-stone-400">
              Sist oppdatert: Januar 2026
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
