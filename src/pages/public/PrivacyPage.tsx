import { Link } from 'react-router-dom';

const PrivacyPage = () => {
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
            Personvernerklæring
          </h1>

          <p className="text-base text-foreground-muted leading-relaxed">
            Openspot er en tjeneste for å finne, booke og tilby kurs. Vi samler inn så lite data som mulig, og oppbevarer det ikke lenger enn nødvendig.
          </p>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Hvem er ansvarlig</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Openspot driftes av Framio AS, org.nr. 935 967 511, som er behandlingsansvarlig for personopplysningene dine.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Kontakt: <a href="mailto:hei@framio.no" className="underline underline-offset-2">hei@framio.no</a>
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Hva vi lagrer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Når du oppretter konto lagrer vi e-postadresse, navn og telefonnummer.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Når du booker et kurs lagrer vi navn, e-postadresse, telefonnummer og hvilke kurs du har meldt deg på.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Når du betaler håndteres betalingen av Dintero. Vi lagrer ikke kortdetaljer. Vi lagrer kvitteringsinformasjon (navn, beløp, dato og kurs) i fem år, slik bokføringsloven krever.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Når du er lærer eller studio lagrer vi i tillegg organisasjonsnummer, logo og kontoinformasjon for utbetaling.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi bruker ikke informasjonskapsler til sporing eller analyse. De eneste informasjonskapslene vi setter, er nødvendige for at du skal kunne logge inn og bruke tjenesten.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Hvorfor vi lagrer det</h2>
              <ul className="space-y-2 text-base text-foreground-muted leading-relaxed list-disc pl-5">
                <li>For å gi deg tilgang til kontoen din og kursene du har booket</li>
                <li>For å sende bekreftelser, kvitteringer og påminnelser</li>
                <li>For å oppfylle krav i bokføringsloven</li>
              </ul>
              <p className="text-base text-foreground-muted leading-relaxed">
                Det rettslige grunnlaget er avtalen mellom deg og oss (GDPR artikkel 6 nr. 1 bokstav b) og rettslige forpliktelser (artikkel 6 nr. 1 bokstav c).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Hvem vi deler med</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi selger aldri data. Vi deler kun med tjenester vi trenger for å drive Openspot:
              </p>
              <ul className="space-y-2 text-base text-foreground-muted leading-relaxed list-disc pl-5">
                <li>Supabase – database og innlogging, innenfor EU/EØS</li>
                <li>Dintero – betaling, norsk leverandør</li>
                <li>Resend – utsending av e-post</li>
              </ul>
              <p className="text-base text-foreground-muted leading-relaxed">
                Alle leverandørene har skriftlige databehandleravtaler med oss.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Hvor lenge vi lagrer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi lagrer ikke data lenger enn vi trenger det.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Når du sletter kontoen din, sletter vi innloggingen og profilen din. Dokumentasjon om påmeldinger og betalinger kan vi oppbevare der loven krever det, eller der det er nødvendig for gjennomførte kjøp, refusjoner, klager, regnskap eller kontroll. Når oppbevaringstiden er ute, sletter eller anonymiserer vi også denne dokumentasjonen.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Rettighetene dine</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Du kan når som helst:
              </p>
              <ul className="space-y-2 text-base text-foreground-muted leading-relaxed list-disc pl-5">
                <li>Slette kontoen din fra innstillingene</li>
                <li>Få en kopi av det vi har lagret om deg innen 30 dager</li>
                <li>Rette opp feil ved å redigere profilen din eller kontakte oss</li>
                <li>Få dataene dine utlevert i et maskinlesbart format</li>
                <li>Trekke tilbake samtykker du har gitt</li>
              </ul>
              <p className="text-base text-foreground-muted leading-relaxed">
                Er du uenig i hvordan vi behandler dataene dine, kan du klage til Datatilsynet på{' '}
                <a href="https://datatilsynet.no" target="_blank" rel="noreferrer" className="underline underline-offset-2">datatilsynet.no</a>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Sikkerhet</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                All data er kryptert i bevegelse og i ro. Tilgang til personopplysninger er begrenset til ansatte som trenger det for å gjøre jobben sin.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Skulle et datainnbrudd oppstå, varsler vi deg og Datatilsynet innen 72 timer, slik loven krever.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Endringer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi kan oppdatere denne erklæringen. Større endringer varsler vi om på e-post.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Kontakt</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Spørsmål om personvern? Send en e-post til{' '}
                <a href="mailto:hei@framio.no" className="underline underline-offset-2">hei@framio.no</a>.
              </p>
            </section>
          </div>

          <p className="text-sm text-foreground-muted">
            Sist oppdatert: 5. juni 2026
          </p>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
