import { Link } from 'react-router-dom';
import { ArrowLeft, Infinity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const TermsPage = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-geist antialiased flex flex-col selection:bg-muted selection:text-foreground">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
          <Button variant="outline-soft" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
            <Link to="/">
              <ArrowLeft className="size-4 mr-2" />
              Tilbake
            </Link>
          </Button>
        </div>
        
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="size-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-medium tracking-tight text-foreground">
            Ease
          </span>
        </Link>

        <div className="w-24" />
      </header>

      {/* Terms Content */}
      <main className="flex-1 px-4 sm:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <h1 className="font-geist text-2xl font-medium tracking-tight text-foreground mb-12 text-center">
            Vilkår for påmelding
          </h1>

          {/* Content */}
          <div className="space-y-12">
            <section>
              <h2 className="text-sm font-medium text-foreground mb-4">1. Påmelding og betaling</h2>
              <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
                Ved påmelding til kurs godtar du å betale det oppgitte beløpet. Påmeldingen er bindende når betalingen er fullført.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Du vil motta en bekreftelse på e-post når påmeldingen er bekreftet.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-medium text-foreground mb-4">2. Avbestilling</h2>
              <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
                Du kan avbestille din påmelding inntil 48 timer før kursstart for full refusjon.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
                Ved avbestilling senere enn 48 timer før kursstart, eller ved uteblivelse, refunderes ikke kursavgiften.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Instruktøren forbeholder seg retten til å avlyse kurset ved for få påmeldte. Ved avlysning fra instruktørens side refunderes hele kursavgiften.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-medium text-foreground mb-4">3. Ansvar</h2>
              <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
                Deltakelse på kurs skjer på eget ansvar. Instruktøren er ikke ansvarlig for skader som måtte oppstå under kurset.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Ved eventuelle helseutfordringer anbefales det å konsultere lege før deltakelse.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-medium text-foreground mb-4">4. Personvern</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Vi behandler dine personopplysninger i henhold til gjeldende personvernlovgivning.
                Opplysninger brukes kun til administrasjon av kurspåmelding og kommunikasjon relatert til kurset.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-medium text-foreground mb-4">5. Endringer</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Instruktøren forbeholder seg retten til å gjøre endringer i kursprogrammet eller vilkårene.
                Eventuelle endringer vil bli kommunisert til påmeldte deltakere.
              </p>
            </section>
          </div>

          {/* Footer */}
          <Separator className="mt-16" />
          <div className="pt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Sist oppdatert: januar 2026
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;