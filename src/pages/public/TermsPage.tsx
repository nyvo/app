import { Link } from 'react-router-dom';
import { COMPANY } from '@/lib/company';
import { useDocumentTitle } from '@/hooks/use-document-title';

/* Legal document layout: single narrow reading column, two text tiers,
   no cards — structure from Unsplash/YouTube terms pages (Mobbin). */

const TermsPage = () => {
  useDocumentTitle('Vilkår');
  return (
    <div className="min-h-screen w-full bg-background text-foreground antialiased flex flex-col selection:bg-muted selection:text-foreground">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-medium text-foreground">Vilkår</h1>
          <p className="mt-2 text-sm text-foreground-muted">Sist oppdatert 11. juli 2026</p>

          <div className="mt-12 space-y-10">
            <section className="space-y-3">
              <h2 className="text-base font-medium text-foreground">Om tjenesten</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Openspot er en tjeneste for påmelding og betaling til kurs, timer og arrangementer.
                Tjenesten leveres av {COMPANY.legalName}, org.nr. {COMPANY.organizationNumber}.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Selve kurset leveres av studioet eller arrangøren som står på kurssiden.
                Openspot leverer den tekniske løsningen for påmelding, betaling og kvittering.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-medium text-foreground">Påmelding og betaling</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Før du betaler ser du kursnavn, pris og totalbeløp. Prisene er totalpriser –
                det kommer ikke mva. i tillegg.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Betalingen gjennomføres hos vår betalingsleverandør Stripe, og påmeldingen er
                bekreftet når betalingen er godkjent. Du får bekreftelse og kvittering på e-post.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Kurset gjennomføres på datoen, tidspunktet og stedet som står på kurssiden og i
                bekreftelsen.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-medium text-foreground">Angrerett og avbestilling</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Kurs, timer og arrangementer skjer på et fastsatt tidspunkt og er derfor unntatt
                angrerett etter angrerettloven § 22 bokstav m. Påmeldingen er bindende når
                betalingen er gjennomført.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Avlyses kurset, refunderes hele kursavgiften til samme betalingsmåte.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Trenger du å avbestille, kontakter du studioet eller arrangøren du har meldt deg
                på hos – de avgjør om du får refusjon. Du kan også skrive til{' '}
                <a href={`mailto:${COMPANY.email}`} className="underline underline-offset-2">
                  {COMPANY.email}
                </a>
                , så hjelper vi deg videre.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-medium text-foreground">Klager</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Er noe feil med en betaling eller påmelding, send en e-post til{' '}
                <a href={`mailto:${COMPANY.email}`} className="underline underline-offset-2">
                  {COMPANY.email}
                </a>
                . Beskriv hva saken gjelder og hvilken påmelding det handler om, så svarer vi så
                raskt vi kan.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-medium text-foreground">Ansvar</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Studioet eller arrangøren er ansvarlig for gjennomføringen og innholdet i kurset.
                Deltakelse skjer på eget ansvar.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-medium text-foreground">Personvern</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Hvordan vi behandler personopplysninger står i{' '}
                <Link to="/personvern" className="underline underline-offset-2">
                  personvernerklæringen
                </Link>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-medium text-foreground">Endringer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi kan oppdatere vilkårene ved behov. Vesentlige endringer publiseres her eller
                varsles på e-post.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
