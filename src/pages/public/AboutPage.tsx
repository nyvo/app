import { Link } from 'react-router-dom';
import { COMPANY } from '@/lib/company';

const AboutPage = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground antialiased flex flex-col selection:bg-muted selection:text-foreground">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          <h1 className="text-3xl font-medium text-foreground">
            Om Openspot
          </h1>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Hva vi lager</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Openspot er en digital påmeldings- og betalingsplattform for kurs, timer og arrangementer.
                Tjenesten brukes av studioer og arrangører som vil vise kurs, ta imot påmeldinger og håndtere betaling på ett sted.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Selskap</h2>
              <div className="space-y-1.5 text-base text-foreground-muted leading-relaxed">
                <p>{COMPANY.legalName}</p>
                <p>Org.nr. {COMPANY.organizationNumber}</p>
              </div>
              <p className="text-base text-foreground-muted leading-relaxed">
                Openspot er en digital tjeneste. Formell selskapsinformasjon for kjøp og betaling står i vilkårene.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Kontakt</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Spørsmål om Openspot, betaling eller en påmelding kan sendes til{' '}
                <a href={`mailto:${COMPANY.email}`} className="underline underline-offset-2">
                  {COMPANY.email}
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
