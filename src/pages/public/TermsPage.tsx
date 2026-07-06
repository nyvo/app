import { Link } from 'react-router-dom';
import { COMPANY } from '@/lib/company';
import { useDocumentTitle } from '@/hooks/use-document-title';

const TermsPage = () => {
  useDocumentTitle('Vilkår');
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
          <h1 className="text-3xl font-medium text-foreground">
            Vilkår for påmelding
          </h1>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">1. Hvem du handler med</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Openspot driftes av {COMPANY.legalName}, org.nr. {COMPANY.organizationNumber}.
                Registrert adresse er {COMPANY.registeredAddress}.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Spørsmål om betaling, vilkår eller bruk av tjenesten kan sendes til{' '}
                <a href={`mailto:${COMPANY.email}`} className="underline underline-offset-2">
                  {COMPANY.email}
                </a>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">2. Hva Openspot er</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Openspot er en digital påmeldings- og betalingsplattform for kurs, timer og arrangementer.
                Studioer og arrangører bruker Openspot til å vise kurs, ta imot påmeldinger og håndtere betaling.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Selve kurset leveres av studioet eller arrangøren som står oppført på kurssiden.
                Openspot står for den tekniske løsningen for påmelding, betaling og kvittering.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">3. Påmelding og betaling</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Før du betaler ser du kursnavn, pris, eventuell tjenesteavgift og totalbeløp.
                Prisene som vises er totalpriser – det kommer ikke mva. i tillegg.
                Ved påmelding godtar du å betale beløpet som vises i kassen.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Betalingen gjennomføres hos vår betalingsleverandør Stripe.
                Påmeldingen bekreftes etter godkjent betaling. Du får bekreftelse og kvittering på e-post.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Openspot sender ikke fysiske varer. Returadresse er derfor kun relevant ved skriftlig
                henvendelse, og er samme som registrert adresse: {COMPANY.registeredAddress}.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">4. Levering</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                For kurs, timer og arrangementer skjer levering på datoen, tidspunktet og stedet som vises
                på kurssiden og i bekreftelsen du mottar på e-post.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                For digitale tjenester fra Openspot gis tilgang når konto eller påmelding er opprettet,
                med mindre noe annet er avtalt.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">5. Avbestilling, angrerett og refusjon</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Kurs, timer og arrangementer skjer på en fastsatt dato eller i en bestemt periode, og er
                derfor unntatt angrerett etter angrerettloven § 22 bokstav m. Påmeldingen er bindende når
                betalingen er gjennomført.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Avlyser studioet eller arrangøren kurset, refunderes betalt kursavgift til samme
                betalingsmåte.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Trenger du å avbestille, tar du kontakt med studioet eller arrangøren du har meldt deg på hos.
                Du kan også sende en e-post til {COMPANY.email}, så hjelper vi deg videre. Refusjon ved egen
                avbestilling avgjøres av studioet eller arrangøren.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">6. Klager</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Hvis noe er feil med en betaling, påmelding eller tjenesten, kan du klage til{' '}
                <a href={`mailto:${COMPANY.email}`} className="underline underline-offset-2">
                  {COMPANY.email}
                </a>.
                Beskriv hva saken gjelder, hvilken påmelding det gjelder, og hvilken løsning du ønsker.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi svarer så raskt vi kan og normalt innen rimelig tid. Gjelder klagen selve kurset,
                kan vi sette deg i kontakt med studioet eller arrangøren.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">7. Ansvar</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Deltakelse på kurs skjer på eget ansvar. Studioet eller arrangøren er ansvarlig for
                gjennomføring av kurset, innholdet i undervisningen og praktisk informasjon om oppmøte.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Har du helseutfordringer, bør du snakke med lege eller arrangøren før du deltar.
              </p>
            </section>

            <section className="space-y-4">
              <h2 id="personvern" className="scroll-mt-24 text-lg font-medium text-foreground">8. Personvern</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi behandler personopplysningene dine etter gjeldende personvernlovgivning.
                Opplysninger brukes til å administrere påmelding, betaling, kvittering og kommunikasjon
                knyttet til kurset.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Les mer i vår{' '}
                <Link to="/personvern" className="underline underline-offset-2">
                  personvernerklæring
                </Link>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">9. Endringer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi kan oppdatere vilkårene ved behov. Vesentlige endringer publiseres på denne siden
                eller sendes til berørte brukere på e-post.
              </p>
            </section>
          </div>

          <p className="text-sm text-foreground-muted">
            Sist oppdatert: 6. juli 2026
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
