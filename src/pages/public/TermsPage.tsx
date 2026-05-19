import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground antialiased flex flex-col selection:bg-muted selection:text-foreground">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      {/* Terms Content */}
      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          <h1 className="text-3xl font-medium tracking-tight text-foreground">
            Vilkår for påmelding
          </h1>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-medium tracking-tight text-foreground">1. Påmelding og betaling</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Ved påmelding til kurs godtar du å betale det oppgitte beløpet. Påmeldingen er bindende når betalingen er fullført.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Du vil motta en bekreftelse på e-post når påmeldingen er bekreftet.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium tracking-tight text-foreground">2. Avbestilling og refusjon</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Trenger du å avbestille, ta kontakt med studioet du har meldt deg på hos. Refusjon avgjøres av studioet fra sak til sak.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Instruktøren forbeholder seg retten til å avlyse kurset ved for få påmeldte. Ved avlysning fra instruktørens side refunderes hele kursavgiften automatisk.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium tracking-tight text-foreground">3. Ansvar</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Deltakelse på kurs skjer på eget ansvar. Instruktøren er ikke ansvarlig for skader som måtte oppstå under kurset.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Har du helseutfordringer, bør du snakke med lege før du deltar.
              </p>
            </section>

            <section className="space-y-4">
              <h2 id="personvern" className="scroll-mt-24 text-lg font-medium tracking-tight text-foreground">4. Personvern</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi behandler personopplysningene dine etter gjeldende personvernlovgivning.
                Opplysninger brukes kun til administrasjon av kurspåmelding og kommunikasjon relatert til kurset.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium tracking-tight text-foreground">5. Endringer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Instruktøren forbeholder seg retten til å gjøre endringer i kursprogrammet eller vilkårene.
                Endringer sender vi til alle påmeldte.
              </p>
            </section>
          </div>

          <p className="text-xs text-foreground-muted">
            Sist oppdatert: januar 2026
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
