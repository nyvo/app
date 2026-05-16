---
name: norwegian-copy-audit
description: Use when the user asks to audit, review, fix, or rewrite Norwegian (Bokmål) UI copy — labels, buttons, errors, empty states, emails, marketing copy — or invokes /norwegian-copy-audit. Also use when the user asks "does this Norwegian sound native" or similar sanity checks on Norwegian strings. Catches Title Case headings, "vennligst", split compounds (særskriving), wrong currency/date formats, anglicisms, false friends, English leakage, user-blaming error voice, and bureaucratic filler. Modeled on the voice of Vipps, Fiken, Finn, Dintero, Tibber, DNB, Sbanken, Posten. Do NOT trigger for generic copy review or non-Norwegian languages.
---

# Norwegian Copy Audit

Audit Norwegian (Bokmål) UI copy so it reads like a native copywriter at Vipps or Fiken wrote it — direct, warm, klarspråk-compliant, and free of translation tells.

## How to operate

1. **Scope the audit.** If the user names a file or feature, audit only that. If they ask broadly ("audit our Norwegian copy"), start with the most visible surfaces: page titles, primary buttons, form labels, error messages, empty states, then expand. Use Grep to find Norwegian strings (search for `æ|ø|å`, `kr `, common words like `Lagre|Avbryt|Bekreft`).
2. **Report findings as a structured list.** For each issue: file:line, current text, suggested fix, one-line reason. Group by severity:
   - **Blocker** — meaning changes, dangerous ambiguity, særskriving that changes parsing, false friends, invalid currency/date/time formatting, English fallback leakage (untranslated strings in a Norwegian view), mixed-language UI within a single surface
   - **Major** — Title Case headings, "vennligst" / "vær så snill", anglicisms with a clear Norwegian equivalent, machine-translated phrasing, bureaucratic register, user-blaming error voice, inconsistent infinitive endings within a product surface
   - **Minor** — possessive tuning (preposed vs postposed), tone polish, typography and punctuation, missing non-breaking space, mildly stiff phrasing
3. **Offer to apply fixes.** After the report, ask the user which fixes to apply, or apply all if they pre-authorized. Never apply silently.
4. **Don't over-reach.** Don't rewrite for "feel" if the existing copy is correct — only fix real issues. Don't propose marketing rewrites unless asked.
5. **When in doubt, mirror Vipps and Fiken.** They are the gold standard for modern Norwegian SaaS voice.

## The audit checklist — apply in this order

### 1. Tone & formality
- **Use "du" / "deg" / "din" in all consumer UX** unless the domain explicitly requires formal legal or governmental language. Even banks (DNB, Sbanken), insurers, health services, and Skatteetaten use "du" in product surfaces today. Reserve "De / Dem / Deres" for legal contracts, formal correspondence with public authorities, or product copy that explicitly targets that register.
- **Zero tolerance for "vennligst"**. Drop it entirely; the imperative is polite enough. ("Vennligst logg inn" → "Logg inn".)
- **Zero tolerance for "vær så snill"**. Even more wrong.
- **Posessives**: prefer postposed in body copy ("kontoen din", "pakken din"), preposed only for headlines ("Din økonomi"). Spamming "din X, din Y, din Z" reads as marketing-translated.
- **Drop redundant possessives**: "Velkommen til din dashbord" → "Velkommen til oversikten" or just "Velkommen".

### 1b. Infinitive consistency (conservative vs radical Bokmål)
Norwegian Bokmål allows both conservative ("å sende", "å lagre", "å betale") and radical/feminine forms ("å senda" in dialect-flavored copy is rare; the real axis is in past tense and noun gender: "boken" vs "boka", "skrevet" vs "skrive"). Mixed registers within one product feel sloppy.
- **Default to conservative Bokmål**: `-en` definite forms ("boken", "saken", "siden"), `-et` past participle ("har sendt", "har lagret"). This matches Vipps, DNB, Sbanken, Fiken.
- **Stay consistent within the product.** If one surface says "boka" and another says "boken", that's a Major issue — flag the inconsistency, don't argue the choice.
- Radical forms (`-a` definite: "boka", "saka") are fine for brands deliberately targeting a younger or more dialect-aware voice — but only if applied throughout.

### 2. Sentence case (the #1 translation tell)
- Norwegian uses **sentence case for everything**: headings, buttons, menu items, page titles, table headers.
- "Send Penger" → "Send penger". "Lån Og Finansiering" → "Lån og finansiering".
- Lowercase: days (mandag), months (mai), languages (norsk), nationalities (nordmann).
- Capitalize only: first word of sentence + proper nouns.

### 3. Compounds — særskriving is the cardinal sin
Norwegian forms compound nouns by joining them. Splitting compounds is a meme-level error.

Join (do NOT split):
- kundeservice, nettside, e-postadresse, brukernavn, passord, betalingsmetode, kontoinformasjon, bestillingsbekreftelse, leveringsadresse, fakturaadresse, personvernerklæring, nyhetsbrev, kundenummer, ordrenummer, abonnementsavgift

Hyphenate when one part is an abbreviation, acronym, single letter, or number: `e-postadresse`, `SMS-varsling`, `PIN-kode`, `kunde-ID`, `2-faktorautentisering`.

Two words (fixed phrases): "vilkår og betingelser".

### 4. Numbers, currency, dates, times
- **Thousands separator**: non-breaking space. `1 200`, `1 000 000`. Never comma.
- **Decimal separator**: comma. `1 299,50`, `19,5 %`.
- **Currency**: `1 200 kr` — lowercase `kr` after the amount with a (non-breaking) space. In this codebase always use `formatKroner()` from `@/lib/utils` — never write `${amount} kr` inline.
- **NOK** prefix only for B2B / invoices / international contexts: `NOK 1 200,00`. Never in consumer UI.
- **Percent**: space before `%`. `19,5 %`, not `19,5%`.
- **Full date**: `14. mai 2026` (period after day, lowercase month, no comma).
- **Short date**: `14.05.2026`. Slashes are American — don't.
- **Time**: `kl. 14:00`, 24-hour, colon separator. Never AM/PM. Never `14.00`.
- **Range**: en-dash, no spaces. `kl. 9–17`, `mandag–fredag`, `100–200 kr`.

### 5. Canonical UI strings — deviations read as machine translation

| English | Bokmål | Avoid |
|---|---|---|
| Log in | **Logg inn** | Logg på, Innlogg |
| Log out | **Logg ut** | Logg av |
| Sign up / Register | **Registrer deg** / **Opprett konto** | Tegn opp, Meld på |
| Save | **Lagre** | Spar (= save money) |
| Cancel | **Avbryt** | Kanseller (anglicism), Avlys (= cancel event) |
| Confirm | **Bekreft** | Konfirmer (= religious) |
| Continue | **Fortsett** | Kontinuer (not a word) |
| Back | **Tilbake** | |
| Next | **Neste** | |
| Submit | **Send** / **Send inn** | Innsend |
| Delete | **Slett** | Fjern (= remove, different) |
| Remove | **Fjern** | |
| Edit | **Rediger** / **Endre** | "Endre" warmer, "Rediger" technical |
| Search | **Søk** | |
| Settings | **Innstillinger** | Oppsett (= setup) |
| Account | **Konto** | |
| Password | **Passord** | |
| Forgot password | **Glemt passord?** | Glemt ditt passord (over-translated) |
| Try again | **Prøv igjen** | Forsøk igjen (stiff) |
| Loading | **Laster…** | Lader (= charging battery) |
| Done | **Ferdig** | |
| Choose / Select | **Velg** | |
| Add | **Legg til** | |
| Required | **Obligatorisk** / **Påkrevd** | |
| Optional | **Valgfritt** | |

Confirmations are short, no "vellykket":
- "Lagret", "Sendt", "Endringene er lagret"
- NOT "Dine endringer har blitt vellykket lagret"

### 6. Klarspråk — words to strip

Bureaucratic filler that screams translated or corporate:
- "vennligst" → drop entirely
- "i forbindelse med" → "om", "for"
- "foreta" → "gjøre"
- "anmode om" → "be om"
- "informere om" → "fortelle"
- "samt" → "og"
- "således" → "derfor" or drop
- "vedrørende" → "om"
- "i henhold til" → "etter", "som"
- "benytte" → "bruke"
- "erholde" → "få"
- "inneværende" → "denne" / "i år"

Prefer: short sentences (≤20 words), active voice, concrete verbs, no nominalizations.
- "Betaling kan foretas her" → "Du kan betale her"
- "En e-post vil bli sendt til deg" → "Vi sender deg en e-post"

### 7. Errors & empty states — terse, one apology max, never blame the user

**Don't blame the user.** Norwegian UX writing keeps errors neutral and factual. Describe the state of the system or the field, not what the user did wrong.

- Bad: "Du skrev inn feil passord." / "Du har lagt inn en ugyldig e-postadresse."
- Better: "Passordet stemmer ikke." / "E-postadressen er ikke gyldig."

Errors:
- Good: "Noe gikk galt. Prøv igjen." / "Vi fant ikke siden." / "Passordet stemmer ikke." / "Sjekk at e-postadressen er riktig."
- Bad: "Beklager, vi er lei oss, men noe gikk dessverre galt." / "En feil har oppstått." / "Ugyldig input." / "Operasjonen mislyktes."

Empty states — factual, no apology, compact-first:
- "Ingen treff" / "Ingen meldinger enda" / "Ingen kunder enda" / "Du har ikke lagt til noen kunder"
- NOT "Beklager, vi fant ingen treff dessverre"

**Progressive disclosure.** Lead with the shortest possible state ("Ingen treff", "Ingen kunder enda"), then optionally one short helper sentence with the next action. Avoid long empty-state paragraphs unless the product voice explicitly calls for them.
- Good: `Ingen kunder enda` + `Legg til din første kunde for å komme i gang.`
- Bad: `Det ser ut til at du ikke har lagt til noen kunder enda. For å komme i gang med å bruke systemet, må du først registrere kundene dine ved å klikke på knappen nedenfor.`

Form validation — terse and specific:
- "Fyll inn navn", "Skriv en gyldig e-postadresse", "Minst 8 tegn"
- NOT "Dette feltet er obligatorisk og må fylles ut"

### 8. Softening without "vennligst"
Norwegian softens through structure, not "please":
- **"gjerne"**: "Ta gjerne kontakt", "Si gjerne fra"
- **"bare"**: "Bare trykk her", "Bare si fra"
- **Modals**: "Du kan…"
- **"Vi"-framing**: "Vi hjelper deg å…"
- **Question form**: "Vil du fortsette?"

### 9. False friends — flag every occurrence
- **eventuelt** ≠ eventually (means "possibly / if applicable")
- **aktuell** ≠ actual (means "relevant / current")
- **fabrikk** ≠ fabric (means "factory")
- **gift** ≠ gift (means "married" or "poison")
- **rar** ≠ rare (means "strange")
- **billett** ≠ billet (means "ticket")
- **konsekvent** ≠ consequent (means "consistent")

### 10. Anglicisms to translate
- "kanseller" → "avbryt" / "si opp"
- "supporter" (verb) → "støtter" / "har støtte for"
- "prosesserer" → "behandler"
- "sjekk ut" (checkout) → "gå til kasse" / "fullfør kjøp"
- "klikk her" → use a verb phrase: "Les mer", "Se vilkår", "Gå til kassen"

### 10b. English leakage — half-translated product vocabulary
Modern SaaS apps frequently leave product vocabulary in English mid-Norwegian-surface. **Mixed-language UI in a single view is a Major issue unless the brand has explicitly chosen English for that term.**

| English | Preferred Norwegian |
|---|---|
| workspace | **arbeidsområde** |
| subscription | **abonnement** |
| checkout | **kasse** |
| insights | **innsikt** / **oversikt** |
| onboarding | **onboarding** (accepted in SaaS) / **oppstart** (consumer, context-dependent) |
| dashboard | **oversikt** (consumer) / **dashbord** (B2B SaaS) |
| inbox | **innboks** |
| feed | **strøm** / **feed** (both seen; pick one and stay consistent) |
| settings | **innstillinger** |
| billing | **fakturering** / **betaling** |
| reports | **rapporter** |
| activity | **aktivitet** |
| invite | **inviter** (verb) / **invitasjon** (noun) |
| share | **del** (verb) — never as a noun for "portion", use "andel" |
| export | **eksporter** (verb) / **eksport** (noun) |
| import | **importer** / **import** |
| draft | **utkast** |
| archive | **arkiv** / **arkiver** (verb) |
| trash | **papirkurv** |

If you see an English term sitting next to translated copy ("Workspace innstillinger", "Insights for din konto") — flag it as Blocker if it changes meaning, Major otherwise.

### 11. Loanwords that ARE accepted
Keep these — they're standard Norwegian tech vocabulary:
- app, e-post, SMS, PIN-kode, ID, nettside, nettleser, nettbank, nyhetsbrev, abonnement, faktura, kvittering, innboks, varsler, oversikt (preferred over "dashbord" in consumer; "dashbord" OK in B2B SaaS), kasse (checkout), innlogging, kundeservice, brukerstøtte, tilbakemelding, last ned / last opp

### 12. Punctuation & typography
- **Quotation marks**: straight `"…"` in web UI. Don't import English curly quotes mid-paragraph.
- **Dash**: en-dash with spaces ` – ` for parenthetical (where English uses em-dash). En-dash without spaces for ranges (`9–17`).
- **No Oxford comma**: "epler, pærer og bananer".
- **No apostrophe-s genitive**: "Olas konto", not "Ola's konto". Apostrophe only when name ends in s/x/z: "Hans' bok".
- **å, æ, ø**: always real characters. Never `aa`, `ae`, `oe` in copy.

### 13. Word order
Norwegian negation goes after the finite verb in main clauses: "Jeg kan ikke se", not "Jeg ikke kan se". In subordinate clauses, "ikke" goes before the verb: "…fordi jeg ikke kan se det". LLM-translated copy often gets this wrong.

### 14. Translation smells — heuristics for detecting non-native or AI-translated copy

When you see these patterns, the copy was probably translated from English (by a tool or non-native writer). Flag and rewrite.

| Smell | Why it feels translated | Fix toward |
|---|---|---|
| Overuse of "har blitt" / "ble" passives | English passive-voice transfer | Active voice: "Vi har sendt deg en e-post", not "En e-post har blitt sendt til deg" |
| "ditt / din X" before every noun | Mirrored English possessives | Drop or postpose: "kontoen din", or just "kontoen" when context is obvious |
| Noun-heavy phrasing ("foreta en betaling", "gjennomføre en bestilling") | Enterprise-English nominalization | Verb-first: "betal", "bestill" |
| "utfør handling" / "utfør X" | Literal calque of "perform action" | Use the actual verb: "Slett", "Bekreft", "Send" |
| "påbegynn" / "igangsett" | Bureaucratic register | "Start", "Begynn", "Sett i gang" |
| "administrator panel", "kunde dashboard", "bruker profil" (open compounds) | English syntax leakage | Compound: "administratorpanel", "kundedashbord" / "kundeoversikt", "brukerprofil" |
| "vellykket lagret / sendt / opprettet" | English "successfully" calque | Drop the adverb: "Lagret", "Sendt", "Opprettet" |
| "klikk på knappen nedenfor for å…" | English instruction template | Just label the button properly and drop the sentence |
| "ta en titt på", "ta en sjanse" in headlines | Spoken-register calque in formal copy | "Se", "Sjekk", "Utforsk" |
| "vi er glade for å informere deg om at…" | Corporate-English opener | Open with the news directly |
| "din opplevelse" as filler ("forbedre din opplevelse") | Marketing-translation cliché | Be specific about what improves |
| "for å sikre at…" before benign actions | English hedging | Drop or restructure |
| Sentences starting with "I tillegg" / "Videre" / "Dessuten" stacked | English connector overuse | Norwegian prefers shorter sentences with fewer connectors |
| Misplaced "ikke" in subordinate clauses ("…fordi jeg kan ikke se det") | Word-order error common in LLM output | "…fordi jeg ikke kan se det" |

### 15. SaaS cringe — empty pep, overpromise, marketing clichés

Translation correctness isn't enough. Copy can be grammatically perfect Norwegian and still read as embarrassing marketing-template fluff. These patterns make native readers cringe. Treat them as Minor unless they actively mislead, then Major.

| Pattern | Why it cringes | Fix toward |
|---|---|---|
| **"fra første sekund" / "fra første dag" / "fra dag én"** | Hollow SaaS pep — nothing actually happens *at* that moment, the feature is just always-on | Drop entirely. `"Mobilvennlig fra første sekund"` → `"Mobilvennlig"` |
| **"online" in product copy** ("Du er online på...", "Bli online") | Anglicism + slight overpromise vibe | `"i gang"`, `"klar"`, `"oppe"`. `"Du er online på fem minutter"` → `"Du er i gang på fem minutter"` |
| **"med ett klikk" / "one-click X"** | Marketing cliché. Either trivially true (everything is "one click") or false | Be specific: `"Refusjon med ett klikk"` → `"Enkel refusjon"`. Drop the click-count claim. |
| **"i sanntid"** | Tech buzzword used decoratively. Often inaccurate (most "real-time" is polled every 30s) | `"direkte"`, `"med en gang"`, `"løpende"`. Drop if the feature is just "fast enough". |
| **"rett ut av boksen" / "out of the box"** | Direct English calque. Reads as translated SaaS-template | Drop or rephrase: `"klart med en gang"`, `"uten oppsett"`, or just remove. |
| **Overpromise speed claims** ("X på 30 sekunder", "Sett opp på 2 minutter") | If false, breaks trust on first try. If true, sounds like every other SaaS | Drop the number, or be specific about what's instant: `"Du er i gang på minutter"` is softer than `"...på 2 minutter"`. |
| **"Frigjør tiden din" / "Ta kontrollen tilbake" / "Få tiden tilbake"** | Direct calques of English marketing tropes ("Free up your time", "Take back control") | Be concrete about what you save. `"Slipp manuelle påminnelser"`, `"Aldri tast inn et beløp igjen"` |
| **"Den smarte måten å X på"** | Calque of "The smart way to X". Empty boast | Just say what it does: `"Den smarte måten å fakturere på"` → `"Faktura med to klikk"` |
| **"Designet for å..."** ("Designet for å hjelpe deg...") | "Designed to..." translation. Distancing — describes intent, not action | State what it does: `"Designet for å forenkle..."` → `"Forenkler..."` |
| **"Drøm stort" / "Bygg større" / "Skap framtiden"** | Aspirational fluff that signals nothing | Cut. Show product, not slogans. |
| **"Vi er stolte av å presentere..."** | Corporate-fluff opener | Open with the news: `"Vi er stolte av å presentere Openspot Pro"` → `"Openspot Pro er her."` |
| **"Forbedre din opplevelse"** | "Improve your experience" — empty | Name the specific improvement. |
| **"For deg som vil noe mer"** / **"For deg som tar X på alvor"** | Targeting via flattery. Reads as marketing-coach-spek | Describe the user concretely: `"For studioer i full drift"` (concrete tier-up signal) beats `"For deg som mener alvor"`. |
| **Empty superlatives** ("Best", "Markedsledende", "Ledende") | Unverifiable claim — every SaaS says it | Cut. Replace with specifics: `"Brukt av 200+ studioer"` if true, otherwise nothing. |
| **"Trygt og enkelt"** as a phrase | Twin-adjective filler. Two empty words pretending to be detail | Pick one and be concrete: `"Vipps-betaling, kryptert ende-til-ende"` |
| **"Alt du trenger" + nothing else** | Standalone, it's empty. Works only when followed by a concrete list | `"Alt du trenger for å komme i gang"` is fine; `"Alt du trenger."` alone is filler. |
| **Question-mark headlines that aren't really questions** ("Klar?", "Trenger du hjelp?", "Vil du vite mer?") | Sometimes punchy, sometimes flippant. Judge by audience: B2B SMB/consumer is fine, enterprise reads as flippant | Keep for casual/consumer surfaces; replace with declarative for formal B2B. Alternatives to `"Klar?"`: `"Kom i gang."`, `"La oss starte."`, `"Sett opp studioet."`, `"Klar når du er."` |
| **Stacked exclamation marks / emoji decoration** in product copy | Norwegian SaaS is calmer than US SaaS. Exclamation marks read as desperate | One ! max per page. Zero is better. No emojis in product copy unless the brand voice explicitly calls for them. |

**The cringe test, applied as a final pass:** read the copy out loud to a skeptical Norwegian friend. If they'd raise an eyebrow at any phrase, flag it. The bar isn't "is this technically correct Norwegian" — it's "would a native copywriter at Vipps or Fiken sign this off."

**When in doubt, cut.** The most common cringe-fix is deletion. SaaS cringe almost always comes from over-explaining or over-promising. Norwegian voice prefers under-stating.

## Final pass — the 18-point checklist

For every audited string, verify:

1. Sentence case on headings/buttons (no Title Case)
2. "du / deg / din" in consumer UX (formal pronouns only for explicit legal/governmental register)
3. Zero "vennligst" / "vær så snill"
4. Compounds joined (kundeservice, e-postadresse) — no særskriving
5. `1 200 kr` format, non-breaking thousands space, lowercase `kr` after
6. Dates: `14. mai 2026` or `14.05.2026`, lowercase month
7. Times: `kl. 14:00`, 24-hour
8. Sentence ≤20 words, active voice, concrete verbs
9. No "vellykket" padding on confirmations
10. Errors: terse, one apology max, ends with action, **no user-blaming** ("Passordet stemmer ikke", not "Du skrev feil passord")
11. Empty states: compact-first, optional helper second
12. No anglicisms (kanseller, supporter, prosesserer)
13. No English leakage — no untranslated UI terms (workspace, checkout, insights) mid-surface
14. No false friends (eventuelt, aktuell, gift)
15. No "klikk her" — link text is a verb phrase
16. No apostrophe-s genitives
17. Postposed possessives in body copy, preposed sparingly
18. Infinitive / definite-form register consistent across the product (conservative Bokmål unless brand says otherwise)
19. No SaaS cringe (§15): no "fra første sekund/dag", no "med ett klikk", no "i sanntid" decorative, no "rett ut av boksen", no empty superlatives, no aspirational fluff. Apply the read-it-out-loud test.

## Output format

When auditing, return a markdown report:

```
## Norwegian copy audit — <scope>

### Blockers (N)
- `path/to/file.tsx:42` — "Klikk her for å fortsette" → "Fortsett" (reason: "klikk her" is a link-label antipattern)

### Major (N)
- `path/to/file.tsx:88` — "Vennligst skriv inn passord" → "Skriv inn passord" (reason: drop "vennligst")
- `path/to/file.tsx:104` — "Lagre Endringer" → "Lagre endringer" (reason: Norwegian uses sentence case)

### Minor (N)
- `path/to/file.tsx:51` — "1200 kr" → "1 200 kr" via `formatKroner()` (reason: missing thousands separator)

### Looks good
- `path/to/file.tsx:12` — "Velg betalingsmetode" ✓

**Want me to apply all fixes, or pick specific ones?**
```

Be concise. Be confident. Cite the rule from this checklist when it isn't obvious why.
