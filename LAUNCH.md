# 🚀 Launch checklist — taking Openspot live

Last verified against reality: **2026-07-14 evening** (post-QA, post dev-teardown).
Everything code-side is DONE, tested and on `main`. What remains is config you flip
by hand, one cleanup an agent can run for you, and a short live test. Do the phases
in order. Total hands-on time: **roughly 1–2 hours**.

Legend: 👤 = you do this · 🤖 = ask an agent ("run the launch data sweep" etc.)

---

## ✅ Already done — nothing to do here

These are verified working, listed so you don't re-check them:

- All code on `main`; CI auto-deploys all edge functions on every merge
- Payments end-to-end in the real browser (pay, decline, duplicate, refund-exactly-once, oversell race)
- Email pipeline: confirmations, receipts, refund notices, day-before reminders (cron restored 2026-07-14, first run verified)
- Email DNS: SPF ✓ (send.mail.openspot.no), DKIM ✓, DMARC present (p=none — fine for launch)
- Ops monitoring cron healthy daily 06:00, `OPS_ALERT_EMAIL` + Resend secrets set
- Pro pricing: 499 kr for everyone (stale 999-kr "Studio" price ids removed from prod)
- One database again (`nollnnkksgicsvuthnjq`); migrations 204/204 in sync with `main`

---

## Phase 1 — Stripe: test mode → live (👤, ~30 min, do in one sitting)

This is THE switch. Until you do this, all payments are pretend; after, they're real.

1. **In the Stripe dashboard, leave test mode** (toggle top-right).
2. **Live secret key** → Supabase dashboard → Project Settings → Edge Functions secrets:
   replace `STRIPE_SECRET_KEY` (`sk_test_…` → `sk_live_…`).
   ⚠️ One key drives both course payments (Connect) and Pro subscriptions (Billing) —
   never rotate it casually later.
3. **Live publishable key** → Vercel → openspot project → Environment Variables:
   replace `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_test_…` → `pk_live_…`). Redeploy comes in Phase 4.
4. **Register the 3 webhooks in LIVE mode** (Stripe dashboard → Developers → Webhooks →
   Add endpoint), each pointing at
   `https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/<name>`:
   - `stripe-connect-webhook` — events: payment_intent.*, charge.refunded, refund.updated, charge.refund.updated
   - `stripe-billing-webhook` — events: checkout.session.completed, customer.subscription.*
   - `stripe-connect-account-events` — event: account.updated (⚠️ "listen to Connected accounts")
   Copy each endpoint's `whsec_…` signing secret into the matching Supabase secret.
   (Tip: open the existing TEST-mode webhooks side by side and mirror their event lists exactly.)
5. **Create the Pro subscription products in live mode** (test-mode prices don't exist in live):
   Product "Pro" → 499 kr/month price and 4 990 kr/year price. Then set Supabase secrets
   `STRIPE_PRO_SOLO_PRICE_ID` (monthly) and `STRIPE_PRO_SOLO_YEARLY_PRICE_ID` +
   `STRIPE_PRO_YEARLY_PRICE_ID` (yearly) to the new live `price_…` ids.
   Do NOT create the old 999-kr "Studio" variants.

## Phase 2 — small switches (👤, ~10 min)

6a. **⚠️ Activate Connect in LIVE mode (blocks all bookings + payouts).** Stripe → live mode →
   **Connect** → complete the platform setup/activation it prompts (platform profile, Connect
   branding: name/icon/color shown on seller onboarding pages, support contact, accept Connect
   terms). Until this is done, `create-stripe-connect-account` returns 500 and **no seller can
   onboard and no course can be paid for** (course payments are Connect destination charges).
   Verified needed 2026-07-14. Independent of Pro billing (that's already working).


6. **Leaked-password protection** → Supabase dashboard → Authentication → Providers →
   Email → enable "Prevent use of leaked passwords". (One toggle; clears the standing security warning.)
7. **Real organisasjonsnummer** → your seller profile still has the placeholder `999999999`,
   and it prints on customer receipts. Set your real org number on the seller row
   (🤖 an agent can do it in seconds if you give the number).
8. *(Recommended, not blocking)* **Sentry** → set `VITE_SENTRY_DSN` in Vercel so you see
   frontend crashes from real users.

## Phase 3 — clean out the test data (🤖, ~5 min, agent does it)

9. Ask any agent: **"Run the launch test-data sweep from LAUNCH.md."** It deletes, in order:
   - all `@example.com` seed signups (~170)
   - the test storefronts `kristoffer-studio` (seller `0c7bb843-284a-4058-929e-f3dac6d2532a`)
     and `audit-studio`, with their courses/sessions/signups (cascade via `delete from courses` + sellers)
   - anything matching `courses.slug like 'seed-%' or 'smoke-%' or 'audit-%'`
   - then verifies: zero test rows left, your real seller untouched.
   ⚠️ Only run this AFTER you've created your real seller account — or you'll have an empty app (which is also fine).

## Phase 4 — open the doors (👤, ~5 min)

10. **Flip `VITE_PRELAUNCH`** → Vercel env vars: remove it or set to `false`, then **Redeploy**.
    (It's baked into the bundle — the redeploy is what actually flips it. This also picks up
    the live `pk_live_` key from Phase 1.)

## Phase 5 — prove it with real money (👤, ~15 min)

11. **One real booking**: publish a small real course (or a cheap test course priced ~10 kr),
    book it with your own real card from your phone. Check:
    - money shows in Stripe live dashboard ✓
    - confirmation email lands in your real inbox (not spam) ✓
    - the booking shows in your dashboard ✓
    then **refund it** from the Påmeldte tab and check the refund email + Stripe refund. 
12. **iOS Safari pass**: do that booking (or a second one) on an iPhone — keyboard,
    autofill, and the payment sheet behave.
13. *(Nice-to-have)* Paste a course link into WhatsApp/iMessage — the share preview
    (og-image) renders.

## First week — keep half an eye on

- The **06:00 ops email** — it only mails when money-state anomalies exist, so silence is good.
  If you want proof it can reach you, ask an agent to trigger a test alert once.
- Stripe dashboard → Payments + Payouts after the first real bookings.
- Vercel + Supabase logs after the first real traffic day (🤖 "check prod logs for errors").

## Parked / someday (not launch blockers)

- PR #14 (retention policy, June 12) — rebase or close.
- Google Console: remove two dead OAuth redirect URIs (old dev project + ease-liard.vercel.app).
- DMARC: tighten `p=none` → `p=quarantine` once real mail has flowed for a few weeks.
- Recreate a dev environment (or use Supabase preview branches) before heavy post-launch
  development — see PRELAUNCH.md 2026-07-13 section for the how.
- **Tidy the `ALLOWED_ORIGIN` edge-function secret.** As of 2026-07-14 its first entry is
  `http://localhost:5173`, which makes a dev origin the CORS fallback for unmatched requests.
  Harmless (a non-whitelisted origin gets an ACAO its own browser rejects, so it's still
  blocked) — but reorder so a prod origin (`https://openspot.no`) is first and drop the
  localhost entry from the *production* secret. Verified prod-safe already: `openspot.no` +
  `www.openspot.no` are allowed for every browser-called function (checkout, google-places,
  free-signup, …), with correct Allow-Headers/Methods.
