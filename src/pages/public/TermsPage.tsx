import { Link } from 'react-router-dom';
import { Infinity } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TermsPage = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground antialiased flex flex-col selection:bg-muted selection:text-foreground">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
          <Button variant="outline-soft" size="sm" className="text-foreground-muted hover:text-foreground" asChild>
            <Link to="/">
              Tilbake
            </Link>
          </Button>
        </div>
        
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="size-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Infinity className="size-3.5" />
          </div>
          <span className="text-base font-medium text-foreground">
            Ease
          </span>
        </Link>

        <div className="w-24" />
      </header>

      {/* Terms Content */}
      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Vilkår for påmelding
            </h1>
          </div>

          <Card className="border-border bg-surface p-6 sm:p-8">
            <div className="space-y-10">
              <section className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">1. Påmelding og betaling</h2>
                <p className="text-base text-foreground-muted leading-relaxed">
                  Ved påmelding til kurs godtar du å betale det oppgitte beløpet. Påmeldingen er bindende når betalingen er fullført.
                </p>
                <p className="text-base text-foreground-muted leading-relaxed">
                  Du vil motta en bekreftelse på e-post når påmeldingen er bekreftet.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">2. Avbestilling og refusjon</h2>
                <p className="text-base text-foreground-muted leading-relaxed">
                  Trenger du å avbestille, ta kontakt med studioet du har meldt deg på hos. Refusjon avgjøres av studioet fra sak til sak.
                </p>
                <p className="text-base text-foreground-muted leading-relaxed">
                  Instruktøren forbeholder seg retten til å avlyse kurset ved for få påmeldte. Ved avlysning fra instruktørens side refunderes hele kursavgiften automatisk.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">3. Ansvar</h2>
                <p className="text-base text-foreground-muted leading-relaxed">
                  Deltakelse på kurs skjer på eget ansvar. Instruktøren er ikke ansvarlig for skader som måtte oppstå under kurset.
                </p>
                <p className="text-base text-foreground-muted leading-relaxed">
                  Ved eventuelle helseutfordringer anbefales det å konsultere lege før deltakelse.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">4. Personvern</h2>
                <p className="text-base text-foreground-muted leading-relaxed">
                  Vi behandler dine personopplysninger i henhold til gjeldende personvernlovgivning.
                  Opplysninger brukes kun til administrasjon av kurspåmelding og kommunikasjon relatert til kurset.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">5. Endringer</h2>
                <p className="text-base text-foreground-muted leading-relaxed">
                  Instruktøren forbeholder seg retten til å gjøre endringer i kursprogrammet eller vilkårene.
                  Eventuelle endringer vil bli kommunisert til påmeldte deltakere.
                </p>
              </section>
            </div>
          </Card>

          <div className="text-center">
            <p className="text-xs text-foreground-muted">
              Sist oppdatert: januar 2026
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
