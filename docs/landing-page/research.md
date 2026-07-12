# SaaS Landing Page Research — structure, header/footer, page-frame trends

_Research only, nothing built. 2026-07-11._

**Corpus:** 16 landing pages structurally analyzed (business SaaS: Stripe, Notion, Airtable, Intercom, Monday, Calendly, Slack, Loom; dev/design-forward: Linear, Vercel, Clerk, PostHog, Cal.com, Raycast, Attio, Clay — Rippling blocked, Supabase/Resend partially readable), 7 visually inspected in a real browser at 1440px (Linear, Attio, Vercel, Clay, Mercury, Resend, Polar), plus 2025–26 trend literature and a Mobbin footer-gallery check.

---

## 1. Section anatomy

**Median section count: 10–11.** Range 7–18. Two clear profiles:

- **Short conversion-funnel pages (7–9):** Calendly, PostHog, Vercel, Notion, Cal.com. Linear path to signup.
- **Long narrative pages (13–18):** Attio (18), Monday (15), Clay/Loom (14), Slack (13). Repeated capability-template sections, multiple proof waves.

**The canonical skeleton (present on effectively all 16):**

1. **Hero** — short outcome headline (4–7 words), 1-line subhead, 1–2 CTAs (primary "free" + secondary demo/sales). ~60% of 2026 headlines are AI/agent-framed ("for teams and agents", "agentic revenue", "Agentic Infrastructure").
2. **Logo wall** — social proof, almost always position 2, directly after hero. Often with a claim line ("Trusted by 500,000+ teams" / "60% of the Fortune 500").
3. **Feature blocks (3–6)** — three formats: (a) alternating narrative blocks named after workflow steps (Linear: Intake→Plan→Build→Diffs→Monitor), (b) tabbed carousels to compress density (business SaaS: Monday, Airtable, Intercom), (c) a repeated identical template of "capability + 3 case studies + illustration" (Clay ×4).
4. **Testimonials** — either one batched wall/carousel late-page (Loom, Clerk, Linear) or interspersed 2–3× between features (Intercom, Slack).
5. **Stats / trust layer** — metrics blocks, security & compliance badges (SOC2/GDPR/ISO), G2 rankings. Business SaaS uses badges *instead of* FAQ for objection handling.
6. **Final CTA** — ~14/16 end with a dedicated short-headline + repeated CTA-pair section ("Available today.", "Agentic revenue runs on Attio").

**What's usually NOT on the homepage:**
- **Pricing:** only 4/16 show any pricing (Calendly + PostHog full tables; Intercom + Clerk a mention). Everyone else links to /pricing from nav.
- **FAQ:** 1/16 (Cal.com). Zero in the business cohort.
- **Newsletter in footer:** ~1/16 (Raycast); Attio and Monday capture email in-body instead.

## 2. Headers

**Dominant pattern (13/16):** full-width sticky bar (translucent/blur over content), logo left, 3–6 top-level items — Product/Platform, Resources, Customers, Pricing (+ Enterprise/Company/Docs) — right side dual CTA: text/ghost "Log in" + solid pill "Sign up / Start for free / Get started". Business SaaS adds mega-menu dropdowns; dev tools keep single-level or light dropdowns.

- **Announcement bar:** ~25–30% (Airtable, Raycast, Attio, Clay, Polar) — always a launch/event promo, thin, dismissible, sits above the nav.
- **Floating island/pill nav:** confirmed live on Clay (white rounded bar floating inset over the hero illustration) and named as a 2025 trend in the literature (Design Shack, Tegan Digital). Still minority among big SaaS.
- **Nav-as-funnel:** trend sources report fewer links + persistent CTA; some landing pages remove nav entirely (single-CTA pages convert 13.5% vs 10.5% with 5+ CTAs, per SaaSFrame).
- **Outlier:** Loom — minimal header, logo + one CTA.

## 3. Footers

Taxonomy observed, most→least common:

1. **Sitemap mega-footer (~80%):** 4–6 link columns (Product, Features/Solutions, Resources, Company, Connect/Social) + thin legal bar (©, Privacy, Terms). Linear = 5 col; Attio = 6 groups w/ "New" badges + external-link arrows; Stripe = 6 col + language selector.
2. **Final-CTA + footer combo:** big CTA band fused directly above the sitemap (Linear "Available today.", Polar "Join Polar today ↗" inside the footer itself).
3. **Inverted / framed footer:** light page flips to a dark footer band (Attio), or footer rendered as an inset slab with visible edges inside the page (Polar).
4. **Oversized-wordmark footer:** giant brand name filling the footer. Confirmed real via Mobbin (Legora — serif SaaS, Zellerfeld, Structured, BAGGU, MOUTHWASH) but it skews expressive/editorial brands; the big PLG SaaS players don't do it.
5. **Utility extras seen:** theme toggle + live status badge (Vercel), **`llms.txt` / "site index for LLMs" links (Clerk, Attio — emerging 2026 AI-discoverability pattern)**, app-store badges (Airtable, Slack), language selector (global business SaaS), social icon row (near-universal).

Eleken's 2026 footer-UX taxonomy matches: utility-only, doormat (mirror of nav), sitemap-lite, marketing-CTA footer, consent-aware, region-aware. Oversized footers flagged as a mobile liability.

## 4. Page frame — current trends (the "frame" question)

Ranked by how established they are:

1. **App-window media frames (standard):** product screenshots in rounded macOS/browser chrome (traffic lights, toolbar), sitting on a soft tinted/gradient band — Attio (light blue band + pinstripes), Linear (dark app window breaking the hero fold). Minimal chrome > ornate chrome.
2. **Full-bleed + hairline dividers (dev default):** no outer frame; sections separated by 1px lines on dark (Linear, Polar, Resend).
3. **Exposed grid / pinstripe frame (rising):** visible hairline column lines, pinstriped bands, corner ticks — the "engineered blueprint" look (Attio's CTA band, Vercel's geist grid on inner pages; Qode/Tuts+ name "visible grid" a trend). Corner crosshairs specifically: real but niche, not source-confirmed as a trend.
4. **Rounded "sheet" containers (rising):** oversized big-radius section cards that rise over the hero and stack as you scroll (Clay: white sheet over full-bleed illustration). Related: bento grids are now mainstream-to-saturated for feature sections (67% of top ProductHunt SaaS per SaaSFrame).
5. **Cinematic full-bleed brand hero (2026 dev-infra move):** pure-black film-poster heroes with a single lit 3D object (Vercel triangle, Resend cube), mono-font eyebrow text; Vercel dropped its former light+grid homepage entirely for this.
6. **Full-bleed editorial photography** with glass/translucent UI on top (Mercury's surreal landscape + inline email-capture field).
7. **Dark hero → light body switch:** documented trend (Betterstack et al.); Attio inverts it (light body → dark footer).

**Typography note:** serif/editorial display type is entering SaaS (Resend's serif hero on a dev product, Legora's serif wordmark, Structured) — a deliberate anti-generic move.

## 5. What reads as dated / "AI-generated" in 2026

Strong multi-source consensus ("AI slop" tells):
- **Indigo→purple gradients** — "the loudest AI tell of 2026" (traced to Tailwind's old `bg-indigo-500` defaults in training data).
- Default **Inter** with no typographic intent.
- **Three rounded feature cards in a row** with soft shadows + generic thin-line icons.
- Weightless headline copy ("Build faster. Ship smarter.").
- Abstract 3D blobs and stock photography (replaced by real product UI + real human/context photography — Intercom, Ramp, Brex).
- Slow decorative animation (current ethos: fast functional micro-motion, "speed = trust").
- Long undifferentiated feature lists.

## 6. Other current section-level trends (sourced)

- **Interactive product demos replacing static screenshots** (Guideflow-style embedded tours) — positioned as *the* 2026 shift.
- **Real proof above the fold** — metrics/logos/testimonial snippets pulled into the hero zone (Databricks, Clay, Ramp).
- **Video social proof with hard metrics** near pricing (claimed +34% conversion).
- **Black/white + one accent color** restraint (Celonis, Tailscale).
- **Personalized heroes** by segment/traffic source (claimed +20–40%).
- **Performance as design constraint** — sub-2s LCP weighed against animation.

## 7. Reference gallery (Mobbin)

Curated section references per pattern, gathered via Mobbin MCP (7 queries, 30 sections reviewed). Method note: Mobbin's *sections* search is strong on heroes/features/testimonials/footers but does **not** index navigation headers well (pill-nav query returned unrelated sections) and doesn't match hairline/grid aesthetics semantically — for those, live-site captures remain the source.

### Heroes
- [Linear](https://mobbin.com/sites/sections/b3626c90-279d-4b7c-9de0-06309c5002cc) — the canonical "Linear look": dark, purple glow, gradient headline text, translucent app card. Origin of the whole aesthetic family.
- [Notion — agents hero](https://mobbin.com/sites/sections/46cbfc51-2786-4ba3-b54f-7e2c7ef58ae1) — dark navy band, white app-window screenshot breaking the fold, logo strip pinned at the bottom edge, playful mascots on connector lines.
- [Dovetail](https://mobbin.com/sites/sections/987c2b93-5574-49b7-b9d0-f2b1e2058e9a) — dark hero with faint blueprint grid-line background and small connected app-window frames = exposed-grid frame on dark, confirmed.
- [incident.io](https://mobbin.com/sites/sections/1f8c9d4b-9f7f-4bfa-aed3-9a849b84831e) — centered headline w/ accent-color second line, app window + phone-notification overlay, announcement bar.
- [Craft](https://mobbin.com/sites/sections/58c31ff2-407c-4d33-933f-3b0a08528728) — centered headline + dual CTA + laptop photo frame; announcement bar.
- [Maze](https://mobbin.com/sites/sections/efd123f4-8694-4da2-ad1e-7382fef9d90d) — 50/50 split hero: text left, full-bleed 3D illustration right.
- [Tailscale](https://mobbin.com/sites/sections/e72d1d36-a761-4557-b655-d2797beb7abb) — hero as two side-by-side rounded tiles (signup tile + demo tile) + phone frame + logo strip. Dual-CTA-as-cards variant.
- [ClickUp](https://mobbin.com/sites/sections/8327bdfc-5c9d-4240-b4af-9431eebd0f9e) — **anti-reference**: 2019-era purple gradient blob + email-capture hero; exactly the dated look trend sources call out.

### Feature sections / bento
- [Ramp](https://mobbin.com/sites/sections/b54966b6-e31a-4e18-af6a-80810799c008) — flat white 3×2 card grid on cream, icon + title + one line, hairline borders. Closest to our flat/on-token language.
- [Loom](https://mobbin.com/sites/sections/4470dfca-a7ae-4a96-a9b4-a33395edbd07) — 3×2 grid of big-radius pastel cards each holding a mini app-window.
- [FLORA](https://mobbin.com/sites/sections/27fbff58-42db-49e5-84c9-0a9ff1bcca07) — dark feature block: headline + CTA pair, large screenshot panel, 3 gradient sub-cards.
- [Square](https://mobbin.com/sites/sections/54ba196c-c979-4564-a54a-c02a23e8e8f7) — alternating photo + text rows w/ hairline dividers (photography-led business SaaS).
- [Jitter](https://mobbin.com/sites/sections/a0b1fcee-ed8b-4709-a230-d750ca54c280) — 2×2 icon+heading+paragraph grid; the generic pattern to avoid without a strong reason.

### Logo walls
- [Notion](https://mobbin.com/sites/sections/590675e3-3657-40b8-86ae-7898f1422af5) — single-row strip, "Trusted by top teams" caption left.
- [Daydream](https://mobbin.com/sites/sections/b8732dce-2387-4f3b-9cb5-925d6b80d54d) — logo strip on a rounded "sheet" curve rising over the hero.
- [Structured](https://mobbin.com/sites/sections/7a574cbe-94ed-4b21-9e35-b8bbf5389e1f) — centered "TRUSTED BY" eyebrow + row on black.
- [Voiceflow](https://mobbin.com/sites/sections/347a3553-ee9c-4f6f-a9e3-04bb684aefeb) — left-caption + 10-logo row, all mono-grey.

### Testimonials
- [Superhuman "Wall of Love"](https://mobbin.com/sites/sections/941c955b-be82-4baf-acef-4d6e20ec19d3) — 3-col masonry, avatar + name + role, tweet-length quotes.
- [Clay](https://mobbin.com/sites/sections/3e4f3739-4c83-4e12-8db4-f0781f33480a) — masonry wall with top/bottom fade-out + "Wall of love" button; giant left-aligned section headline.
- [Ada](https://mobbin.com/sites/sections/a2bc57d6-3544-4563-afc3-0bfd75975114) — quote wall with G2/LinkedIn source icons instead of headshots (source-badge variant).
- [Customer.io](https://mobbin.com/sites/sections/97fbd41c-4d64-4197-930b-f2a24fc65289) — classic 3-up centered avatars + quotes.

### Final CTA
- [Patreon](https://mobbin.com/sites/sections/3cc624bd-6244-4288-9776-852bd7ca4a94) — question headline + single button, whitespace, directly above footer.
- [Wix](https://mobbin.com/sites/sections/8245521f-6b81-458e-ad82-1cae8108180e) — full-width brand-color band + one button, then mega footer.
- [The Leap](https://mobbin.com/sites/sections/5a5e734d-0b06-4545-8131-5e421c4560be) — gradient brand band CTA + newsletter-forward footer.

### Footers
- [Midday](https://mobbin.com/sites/sections/503872ca-2331-4a6f-8cc6-66889b8586f8) — **key find**: SaaS footer merging the expressive + utility patterns — giant ghost/outline wordmark below link columns, plus dark-mode toggle, "System status: Operational" line, and GDPR/SOC2 badges.
- [Dub](https://mobbin.com/sites/sections/bc31e448-f56a-4b11-939d-55d0b472ebec) — light footer on rounded card, "All systems operational" pill, translucent glyph watermark.
- [Autosend](https://mobbin.com/sites/sections/f413db09-0a6f-44df-ae35-125468d270dc) — compact 5-col utility footer + status pill; includes "Compare" (vs-competitor) column — SEO pattern.
- [Vanta](https://mobbin.com/sites/sections/15f32198-9410-4592-add8-a95d08db61ef) — dark brand-purple mega footer, 7 columns, compliance seals + social row.
- [Fuser](https://mobbin.com/sites/sections/811a66b9-aeb0-482a-a4ff-eeedd3ac2ca5) — gradient footer with dot-matrix novelty wordmark; **also shows a true floating pill nav with theme toggle** at top.
- [Legora](https://mobbin.com/sites/sections/74f66481-04ab-4abc-bf99-7878c607e1f6) — serif giant-wordmark footer under sitemap columns (SaaS adopting the editorial pattern).
- [Structured](https://mobbin.com/sites/sections/cf954a98-4f2e-41d3-b2a1-168e4ba0108d), [Zellerfeld](https://mobbin.com/sites/sections/18df6730-6569-49da-9c23-3bee32fbe638) — editorial-brand oversized wordmark footers (light serif / dark sans variants).

**Gallery takeaways that refine the earlier findings:**
- The giant-wordmark footer in SaaS trends **ghost/outline/translucent** (Midday, Dub's watermark, Fuser's dot-matrix) rather than solid editorial black — it reads as texture, not statement.
- Status badges ("All systems operational") are more widespread than the live-site sample suggested — Dub, Midday, Autosend, Vanta all carry one; it's becoming a dev/B2B trust staple alongside compliance seals.
- Floating pill nav confirmed in SaaS proper (Fuser, Clay) — often paired with a theme toggle inside the pill.
- A "Compare / vs X" footer column (Autosend, Midday) is a recurring SEO-driven footer group not visible in the big-player sample.

## Sources

Site analysis: live fetch + browser inspection 2026-07-11. Trend literature: saasframe.io, stan.vision, frontend.horse ("The Linear Look"), eleken.co (footer UX 2026), qodeinteractive.com (grid lines), saashero.net, 925studios.co (AI-slop tells), tegan.io + designshack.net (pill nav), senorit.de / onecodesoft (bento), beetlebeetle.com (footers). Mobbin sections gallery for wordmark footers: [Legora](https://mobbin.com/sites/sections/74f66481-04ab-4abc-bf99-7878c607e1f6), [Structured](https://mobbin.com/sites/sections/cf954a98-4f2e-41d3-b2a1-168e4ba0108d), [Zellerfeld](https://mobbin.com/sites/sections/18df6730-6569-49da-9c23-3bee32fbe638).
