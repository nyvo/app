import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { COMPANY } from '@/lib/company';

/* Legal document layout: single narrow reading column, two text tiers,
   no cards — structure from Unsplash/YouTube terms pages (Mobbin). */

const PrivacyPage = () => {
  useDocumentTitle('Personvern');
  return (
    <div className="min-h-dvh w-full bg-background text-foreground antialiased flex flex-col selection:bg-muted selection:text-foreground">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-medium text-foreground">Personvern</h1>
          <p className="mt-2 text-sm text-foreground-muted">Sist oppdatert 11. juli 2026</p>

          <div className="mt-12 space-y-8">
            <section className="space-y-4">
              <p className="text-base text-foreground-muted leading-relaxed">
                Openspot leveres av {COMPANY.legalName}, org.nr. {COMPANY.organizationNumber},
                som er behandlingsansvarlig for personopplysningene dine. Vi samler inn så lite
                som mulig og lagrer det ikke lenger enn nødvendig.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Spørsmål om personvern? Send en e-post til{' '}
                <a href={`mailto:${COMPANY.email}`} className="text-primary underline underline-offset-2 hover:decoration-2">
                  {COMPANY.email}
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Hva vi lagrer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Når du oppretter konto eller melder deg på et kurs, lagrer vi navn,
                e-postadresse, telefonnummer og hvilke kurs du har meldt deg på.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Betalinger håndteres av Stripe – vi lagrer aldri kortdetaljer.
                Kvitteringsinformasjon (navn, beløp, dato og kurs) lagrer vi i fem år, slik
                bokføringsloven krever.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                For studioer og arrangører lagrer vi i tillegg organisasjonsnummer, logo og
                kontoinformasjon for utbetaling.
              </p>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi bruker ikke informasjonskapsler til sporing eller analyse – bare de som
                trengs for innlogging. Kurssider viser kart fra Google Maps, og Google kan
                sette egne informasjonskapsler når kartet lastes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Hvorfor vi lagrer det</h2>
              <ul className="space-y-2 text-base text-foreground-muted leading-relaxed list-disc pl-5">
                <li>For å gi deg tilgang til kontoen din og kursene du har meldt deg på</li>
                <li>For å sende bekreftelser, kvitteringer og påminnelser</li>
                <li>For å oppfylle krav i bokføringsloven</li>
              </ul>
              <p className="text-base text-foreground-muted leading-relaxed">
                Det rettslige grunnlaget er avtalen mellom deg og oss (GDPR artikkel 6 nr. 1
                bokstav b) og rettslige forpliktelser (artikkel 6 nr. 1 bokstav c).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Hvem vi deler med</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi selger aldri data. Vi deler kun med tjenestene vi trenger for å drive
                Openspot:
              </p>
              <ul className="space-y-2 text-base text-foreground-muted leading-relaxed list-disc pl-5">
                <li>Supabase – database og innlogging, innenfor EU/EØS</li>
                <li>Stripe – betaling</li>
                <li>Resend – utsending av e-post</li>
              </ul>
              <p className="text-base text-foreground-muted leading-relaxed">
                Alle leverandørene har databehandleravtaler med oss.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Hvor lenge vi lagrer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Sletter du kontoen din, sletter vi innloggingen og profilen din. Dokumentasjon
                om påmeldinger og betalinger beholder vi bare så lenge loven krever, eller så
                lenge den trengs for refusjoner, klager eller regnskap – deretter slettes eller
                anonymiseres den.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Rettighetene dine</h2>
              <p className="text-base text-foreground-muted leading-relaxed">Du kan når som helst:</p>
              <ul className="space-y-2 text-base text-foreground-muted leading-relaxed list-disc pl-5">
                <li>Slette kontoen din fra innstillingene</li>
                <li>Få en kopi av det vi har lagret om deg, i et maskinlesbart format</li>
                <li>Rette opp feil ved å redigere profilen din eller kontakte oss</li>
                <li>Trekke tilbake samtykker du har gitt</li>
              </ul>
              <p className="text-base text-foreground-muted leading-relaxed">
                Er du uenig i hvordan vi behandler dataene dine, kan du klage til Datatilsynet
                på{' '}
                <a
                  href="https://datatilsynet.no"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2 hover:decoration-2"
                >
                  datatilsynet.no
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Sikkerhet</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                All data er kryptert i bevegelse og i ro. Skulle et datainnbrudd oppstå,
                varsler vi deg og Datatilsynet innen 72 timer, slik loven krever.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Endringer</h2>
              <p className="text-base text-foreground-muted leading-relaxed">
                Vi kan oppdatere denne erklæringen. Større endringer varsler vi om på e-post.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
