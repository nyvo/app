# Norsk tekst i appen – stilguide

Referanse for all norsk tekst i Ease. Målet er konsekvent, naturlig bokmål som følger
designspråket: rolig, direkte, uten markedsspråk.

> Denne filen utfyller [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md) (tone, filosofi) og
> [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (tokens, komponenter).
> Sentraliserte kopier finnes i `src/lib/auth-messages.ts`.

---

## 1) Tone og stil

- **Kort, tydelig, vennlig** – som en kompetent kollega, ikke en selger.
- **Handlingsorientert**: fortell hva brukeren kan gjøre nå.
- **Konsekvent**: samme ord for samme ting, overalt.
- **Norsk rytme**: 1–2 korte setninger. Unngå lange innskudd.
- **Tiltale**: du/din (uformelt, standard i norske apper).
- **Setningskasus**: "Lagre endringer" (ikke "Lagre Endringer").
- **Ingen utropstegn** som standard. Bruk sparsomt.

---

## 2) Domeneordbok – fastsatte begreper

Bruk **kun** disse termene. Ikke varier med synonymer.

### Roller og aktører

| Konsept | Bruk | Ikke bruk |
|---|---|---|
| Kursansvarlig / eier | **instruktør** | lærer, trener, coach |
| Person som melder seg på | **deltaker** (påmeldingskontekst) | bruker, kunde |
| Person som følger kurs | **elev** (instruktør-vendt kontekst) | student, bruker |
| Bedriften/studioet | **studio** (uformelt), **organisasjon** (internt/teknisk) | bedrift, selskap |

### Kurs og typer

| Konsept | Bruk | Ikke bruk |
|---|---|---|
| Gjentagende ukentlig kurs | **kursrekke** | kurs-serie, serie |
| Enkeltstående event | **arrangement** | event, workshop (kan brukes i beskrivelse, ikke som type) |
| Nettbasert kurs | **nettkurs** | online kurs, digitalt kurs |
| Én enkelttime i en kursrekke | **økt** (formelt), **time** (uformelt) | session, klasse |
| Liste over økter | **kursplan** | timeplan (reservert for kalendervisning) |
| Kalendervisning | **timeplan** | plan, schedule |
| Uferdig kurs | **utkast** | draft, kladd |

### Påmelding og betaling

| Konsept | Bruk | Ikke bruk |
|---|---|---|
| Å melde seg på | **påmelding** | registrering, booking |
| Status: påmeldt | **påmeldt** | registrert, booket |
| Avbestille (deltaker) | **avbestille** | kansellere, avmelde |
| Avlyse (instruktør avlyser kurs) | **avlyse** | kansellere |
| Betaling | **betaling** | transaksjon |
| Kvittering | **kvittering** | receipt |
| Refusjon | **refusjon** / **refundert** | tilbakebetaling |
| Gratis | **Gratis** | 0 kr, kostnadsfritt |

### Status (kurs)

| Kode | Visning |
|---|---|
| `draft` | *(vises ikke offentlig)* |
| `upcoming` | **Kommende** |
| `active` | **Pågår** |
| `completed` | **Fullført** |
| `cancelled` | **Avlyst** |

### Status (påmelding)

| Kode | Visning |
|---|---|
| `confirmed` | **Påmeldt** |
| `cancelled` | **Avbestilt** |
| `course_cancelled` | **Kurs avlyst** |

### Status (betaling)

| Kode | Visning |
|---|---|
| `paid` | **Betalt** |
| `pending` | **Venter betaling** |
| `failed` | **Betaling feilet** |
| `refunded` | **Refundert** |

### Nivå

| Kode | Etikett | Offentlig visning |
|---|---|---|
| `ALL_LEVELS` / `alle` | Alle nivåer | Passer for alle nivåer |
| `BEGINNER` / `nybegynner` | Nybegynner | Passer for nybegynnere |
| `INTERMEDIATE` / `viderekommen` | Viderekommende | Viderekommende |

### Navigasjon og UI

| Konsept | Bruk | Ikke bruk |
|---|---|---|
| Logg inn / Logg ut | **Logg inn** / **Logg ut** | Sign in, Innlogg |
| Innstillinger | **Innstillinger** | Settinger, Settings |
| Varsler | **Varsler** / **Varslinger** | Notifikasjoner |
| Hjelp | **Hjelp** | Support (med mindre det er merkenavn) |
| Konto | **Konto** | Bruker (hvis det er kontoen) |
| Oversikt | **Oversikt** | Dashboard |
| Sikkerhet | **Sikkerhet** | Security |
| Meldinger | **Meldinger** | Messages |

---

## 3) Formatering – tall, dato, valuta

### Valuta (NOK)
- Heltall, ingen desimaler: **450 kr**, **1 200 kr**
- Plassering: tall først, deretter `kr` med mellomrom.
- Per-enhet: **450 kr / time**
- Gratis: vis **Gratis**, ikke "0 kr".

### Tall
- Tusenskille med mellomrom: **1 000**, **10 500**
- Desimal med komma: **12,5**
- Prosent med mellomrom: **25 %**

### Dato
- Lang (i tekst): **4. mars 2026**, **mandag 15. januar 2024**
- Kort (kompakt): **15. jan**, **04.03.2026**
- Øktliste: **Man 14. Okt** (tre-bokstavs dag + dato + tre-bokstavs måned)
- Datoperiode: **17. jan – 7. feb 2025**
- Aldri: "March 4" eller "2026-03-04" i brukervendt tekst.

### Klokke
- Format: **kl. 09:30** (med "kl." i løpende tekst)
- Kompakt (tabeller, kort): **09:30–10:15**

### Varighet
- Under 60 min: **45 min**
- Nøyaktig 1 time: **1 time**
- Flere hele timer: **2 timer**
- Timer + minutter: **1t 30min**

### Telefonnummer
- Norsk: **912 34 567**
- Med landskode: **+47 912 34 567**

---

## 4) Mikrocopy

### Knapper (CTA)
- Start med verb. 1–3 ord.
- Primærknapp er handlingen, sekundær er "Avbryt".

| Kontekst | Primær | Sekundær |
|---|---|---|
| Opprette | **Opprett kurs** | Avbryt |
| Lagre | **Lagre endringer** | Avbryt |
| Sende | **Send melding** | Avbryt |
| Betale | **Fullfør påmelding** | Tilbake |
| Slette | **Slett** | Avbryt |
| Avbestille | **Avbestill** | Behold plassen |
| Videre i flyt | **Fortsett** | Tilbake |
| Prøve igjen | **Prøv igjen** / **Prøv på nytt** | — |
| Lastende | **Logger inn** / **Lagrer** / **Sender** / **Behandler** | — |

**Unngå:** "Klikk her for å fortsette", "Bekreft at du ønsker å lagre endringene"

### Feltetiketter
- Substantiv eller kort frase: "E-post", "Telefonnummer", "Postnummer".
- Placeholder = eksempel, aldri eneste forklaring.
- Hjelpetekst: 1 setning, konkret.

**Eksempel:**
- Etikett: **Telefonnummer**
- Placeholder: *f.eks. 912 34 567*
- Hjelpetekst: "Vi bruker det kun til å sende kvittering."

**Appspesifikke eksempler som er i bruk:**
- Etikett: **E-post** → Placeholder: *navn@eksempel.no*
- Etikett: **By / Sted** → Placeholder: *F.eks. Oslo*
- Etikett: **Om studioet** → Placeholder: *Fortell litt om studioet ditt*
- Etikett: **Beskjed til instruktør (valgfritt)** → Placeholder: *Noe instruktøren bør vite?*

### Feilmeldinger
Mal: hva skjedde + hva du kan gjøre.

**I bruk i appen:**
- "Noe gikk galt. Prøv igjen."
- "E-post eller passord stemmer ikke"
- "Sjekk at e-posten er riktig"
- "Passord må være minst 8 tegn"
- "Passordene er ikke like"
- "Kunne ikke lagre. Sjekk nettforbindelsen og prøv på nytt."
- "For mange forsøk. Vent litt før du prøver igjen."

**Unngå:**
- "En feil oppstod under prosessering av forespørsel."
- Tekniske koder (HTTP 500) i brukervendt tekst.
- "Vennligst" foran alt.

### Toast-meldinger
- Maks ~60 tegn.
- Ingen punktum på fragmenter. Punktum på hele setninger.
- Inkluder alltid hva som ble påvirket.

**Bekreftelse (suksess):**
- "Endringer lagret"
- "Betaling fullført"
- "Avbestilt. Du får refusjon."

**Feil:**
- "Kunne ikke lagre profildata"
- "Påmeldingen kunne ikke fullføres"
- "Kunne ikke avbestille. Prøv på nytt."

### Tomtilstander (empty states)
Si hva som mangler + neste steg.

**I bruk i appen:**
- "Opprett ditt første kurs" + "Kom i gang ved å sette opp din første yogaøkt eller workshop." → CTA: **Opprett nytt kurs**
- "Ingen nye påmeldinger" + "Nye påmeldinger vises her."
- "Ingen kommende kurs" + "Ingen kurs å vise." → CTA: **Finn kurs**
- "Ingen deltakere funnet" → CTA: **Nullstill filter**
- "Alt i orden" + "Ingen åpne saker."
- "Ingen påmeldinger ennå" + "Publiser et kurs for å se påmeldinger."

### Tilgjengelighet (availability)
- **Fullt**
- **1 plass igjen** (entall)
- **3 plasser igjen** (flertall)
- **Ledige plasser** (når eksakt tall ikke vises)

### Relativ tid
- **Pågår nå**
- **Starter om 15 min**
- **Starter om 1 time** / **Starter om 2 timer**
- **Starter i morgen**
- **Starter om 3 dager**
- **I dag** / **I morgen**

---

## 5) Unngå "translatey" – typiske feller

### Engelske mønstre som blir stive på norsk
| Unngå | Bruk heller |
|---|---|
| "Vennligst" overalt | Dropp det, eller bruk bare i formelle kontekster |
| "Klikk her" | Knappetekst er nok |
| "Vi kunne ikke prosessere forespørselen din" | "Noe gikk galt. Prøv igjen." |
| "Du er klar!" / "Du er satt!" | "Ferdig." / "Alt er klart." |
| "Opplev" / "Utforsk" / "Oppdag" i hver setning | "Åpne", "Se", "Velg", "Fortsett" |
| "Gjennomfør" | "Betal", "Send", "Fullfør" |
| "Verifiser" | "Bekreft" |
| "Lokasjon" | "Sted" |
| "Autentisering" | "Innlogging" |
| "Forespørsel" / "prosesser" / "initiere" | Konkret verb: "send", "opprett", "start" |
| "Optimaliser" / "Maksimer" / "Utnytt" | Konkret verb som passer konteksten |

### Sammensatte ord (norsk elsker sammensetninger – AI splitter dem ofte)

| Riktig | Feil |
|---|---|
| brukervilkår | bruker vilkår |
| innloggingskode | innlogging kode |
| betalingsmåte | betaling metode |
| kundeservice | kunde service |
| kontoinnstillinger | konto innstillinger |
| personverninnstillinger | personvern innstillinger |
| kursrekke | kurs rekke |
| kursbilde | kurs bilde |
| deltakerliste | deltaker liste |
| påmeldingsskjema | påmelding skjema |
| forsidebilde | forside bilde |
| nettforbindelse | nett forbindelse |

---

## 6) Norske språknormer som ofte glipper

### Flertallsformer å passe på
- kurs → kurs (uendret i flertall)
- økt → økter
- time → timer
- deltaker → deltakere
- plass → plasser
- arrangement → arrangementer
- instruktør → instruktører
- melding → meldinger
- endring → endringer
- innstilling → innstillinger
- påmelding → påmeldinger

### Tegnsetting
- Punktum i fullstendige setninger. Ikke tving punktum i korte etiketter.
- Toast-fragmenter uten punktum ("Endringer lagret"), hele setninger med ("Avbestilt. Du får refusjon.").
- Unngå utropstegn som standard.

---

## 7) Kopimaler for vanlige flyter

### Onboarding / Førstegangsbruk
- Tittel: "Kom i gang"
- Tekst: "Opprett konto og kom i gang med studioet ditt."
- CTA: **Opprett konto** / **Logg inn**

### Setup-sjekkliste (instruktør)
- "Fullfør offentlig profil" → "Legg til by så elevene finner deg." → CTA: **Fullfør profil**
- "Sett opp betalinger" → "Knytt kontoen din til Stripe, så du kan motta betaling fra elever." → CTA: **Sett opp**
- "Opprett ditt første kurs" → "Publiser et kurs så elevene kan melde seg på." → CTA: **Opprett kurs**
- Progresjon: "{n} av {total} fullført"

### Kursopprettelse
- Gjennomgangstittel: "Sjekk oppsummering"
- Seksjoner: "Kursdetaljer", "Tid, sted og kapasitet", "Pris og praktisk info"
- Mangler: "Kursbilde mangler: Kurs uten bilde er mindre synlig i søk."
- Ikke angitt: "Ikke angitt"

### Påmelding (deltaker-flyt)
- Steg-indikator: "Steg 1" / "Steg 2"
- Behandler: "Går til betaling ..." / "Behandler"
- Vilkår: "Jeg godtar vilkårene for påmelding"
- Trygghet: "Sikker betaling. Du belastes ikke før bekreftelse."

### Betalingsbekreftelse
- Suksess: "Betaling fullført" + "Du er påmeldt {kursTitle}."
- Kvittering: "Bekreftelse sendt" + "Kvittering sendt til {email}."
- Fullt: "Kurset ble fullt" + "Kurset ble fullt før betalingen gikk gjennom." + "Ingen belastning / Du er ikke belastet."
- CTA: **Mine kurs** / **Se flere kurs**

### Avbestilling
- Tittel: "Avbestille?"
- Tekst: "Du får refusjon fordi det er mer enn 48 timer til start."
- CTA: **Avbestill** / **Behold plassen**
- Toast: "Avbestilt. Du får refusjon."

### Sletting (destruktivt)
- Tittel: "Slette {ting}?"
- Tekst: "Dette kan ikke angres."
- CTA: **Slett** / **Avbryt**

### Nettverksfeil
- "Sjekk internettforbindelsen og prøv på nytt."
- CTA: **Prøv igjen** / **Prøv på nytt**

### Glemt passord
- "Glemt passord?"
- "Skriv inn e-posten din, så sender vi en lenke."
- Suksess: "Sjekk e-posten din" + "Vi har sendt en lenke til {email}"
- Hint: "Sjekk spam-mappen hvis du ikke finner den."

### Validering i skjema
- "Skriv inn {felt}."
- "Må være minst {n} tegn."
- "Ugyldig e-post"
- "Du må godta vilkårene for å gå videre"

---

## 8) Hilsener og tidsbasert tekst

Brukes i dashboardet:
- **God morgen** (05:00–11:59)
- **God dag** (12:00–17:59)
- **God kveld** (18:00–04:59)

Tidssone: `Europe/Oslo`

---

## 9) Kvalitetssjekk

Før tekst publiseres:

- [ ] Høres dette ut som noe en nordmann faktisk ville skrevet?
- [ ] Er det kort nok til mobil?
- [ ] Brukes domenebegrepene fra ordbok-tabellen konsekvent?
- [ ] Har feilmeldingen et konkret neste steg?
- [ ] Er sammensatte ord riktig skrevet (ikke splittet)?
- [ ] Er tall/dato/valuta på norsk format?
- [ ] Er knappen et verb og maks 3 ord?
- [ ] Passer tonen med DESIGN_LANGUAGE.md (rolig, direkte, uten markedsspråk)?

---

## 10) Sentraliserte kopifiler

For å unngå ordvariasjon, sentraliseres tekst i egne filer der det gir mening:

| Fil | Innhold |
|---|---|
| `src/lib/auth-messages.ts` | All validering, feil, placeholders og hint for innlogging/registrering |

Vurder å opprette tilsvarende filer for:
- Betalingstekster
- Kurs-relaterte meldinger
- Generelle feilmeldinger

---

## 11) Refaktoreringssjekkliste (for AI / LLM-generert tekst)

Når tekst skrives eller genereres:

1. Sjekk mot domeneordboken (seksjon 2) – bruk riktig term.
2. Del opp lange setninger i to.
3. Bytt abstrakte verb med konkrete.
4. Fjern høflighetsfyll ("vennligst", "på dette tidspunktet").
5. Sjekk sammensatte ord – norsk slår sammen.
6. Sjekk tall, dato, valuta mot seksjon 3.
7. Les høyt: hvis det høres stivt eller oversatt ut, forenkle.
