# Launch smoke-test checklist

Living checklist for the pre-launch smoke pass. Status column: `☐` todo · `✅` pass · `❌` fail · `⚠️` pass-with-note.

## Modes & targets
- **Stripe:** all tests run in **test mode** (CLI defaults to test; app must be on `pk_test`/`sk_test`, Framio `acct_1SmGDrKIZBVJdfNv`). A small live subset repeats once at cutover.
- **Local** = local frontend (`npm run dev`) + **remote** edge functions + the **shared** Supabase DB. Test rows land in the shared DB — see Cleanup.
- **Deployed** = the production/preview URL; used for header/CORS/webhook-endpoint checks that only exist server-side.

## Ownership legend
- 🤖 **AUTO** — runnable now (Supabase MCP · curl · Stripe CLI · Playwright · Mailosaur · Chrome)
- 🔧 **AUTO after setup** — needs a running dev server / test seller / flag flip first
- 👤 **MANUAL** — needs a human or a real-world condition

## Test-data hygiene
- Buyer emails: `smoke-<slug>@<mailosaur-server>.mailosaur.net` so every row is greppable.
- Every created signup/attempt/course recorded in `scripts/smoke/.manifest.json`.
- `scripts/smoke/cleanup.mjs` deletes exactly the manifest rows. Run after each session.

---

## A. Money & booking (highest priority)
| # | Test | Own | Verify |
|---|------|-----|--------|
| A1 | Paid guest booking happy path | 🔧 | UI to pay step in Chrome; confirm PI via Stripe API w/ `pm_card_visa`; `stripe listen` forwards webhook → DB signup `confirmed`+`paid`, 1 attempt, 1 charge |
| A2 | Declined card `4000000000000002` | 🤖 | Decline surfaced; no signup, no charge |
| A3 | Free-course signup end-to-end | 🤖 | Signup row + confirmation email (Mailosaur) |
| A4 | Oversell race on last seat | 🤖 | 2 concurrent bookings → exactly 1 confirmed, other voided, 1 charge |
| A5 | Sold-out / started-series / past-session / cancelled blocked server-side | 🤖 | Direct API call rejected, not just UI-hidden |
| A6 | Double-submit idempotency | 🤖 | Replay checkout → 1 signup, 1 charge |
| A7 | Webhook idempotency | 🤖 | `stripe trigger` same event twice → processed once, no double email |
| A8 | Pending-payment sweep | 🤖 | Leave PI uncaptured; invoke sweep cron → reconciled |
| A9 | Refund via teacher-cancel-signup | 🤖 | Full refund at Stripe, status correct, receipt email, retry no double-refund |
| A10 | Refund via cancel-course (multi-signup) | 🤖 | Every paid signup refunded exactly once |
| A11 | `charge.refunded` preserves `course_cancelled` | 🤖 | App-refund then `stripe trigger charge.refunded` → status stays `course_cancelled` (buyer sees "Avlyst") |
| A12 | Price tampering rejected | 🤖 | POST bogus amount → server prices from DB |
| A13 | Currency formatting | 🤖 | Screenshots assert `1 200 kr`, no raw `kr` |
| A14 | Honor discount (student/pensjonist) end-to-end | 🤖 | Enable 20 % studentrabatt on Studio → Rabatter; claim it in checkout → PI amount = server-recomputed discounted price (never the client's); receipt shows `Studentrabatt (−20 %)`; signup `ticket_label_snapshot` carries `– student (−20 %)` and roster + participant drawer show it; bogus `discountAudience` with discount disabled → full price charged |

## B. Auth & accounts
| # | Test | Own | Verify |
|---|------|-----|--------|
| B1 | Login + `/auth/callback` success & error paths | 🤖 | Playwright `01-auth`, `02-auth-redirects` |
| B2 | `/join/:code` valid / invalid / used | 🤖 | Correct role granted / rejected |
| B3 | Onboarding gating (no deep-link skip) | 🤖 | Playwright `07-protected-routes` |
| B4 | delete-account guards | 🤖 | Blocked w/ active subscription (new) + unfinished business; succeeds when dormant |
| B5 | Session expiry mid-checkout | 🔧 | Guest checkout still completes |

## C. Seller dashboard
| # | Test | Own | Verify |
|---|------|-----|--------|
| C1 | New-seller Connect onboarding (test) → publish paid course | 🔧 | Throwaway seller; charges_enabled true |
| C2 | Schedule save on published course (migration regression) | 🤖 | Save works; delete-guard doesn't block legit edits |
| C3 | Create → publish → edit-with-signups; publish rejects invalid | 🤖 | Lifecycle intact |
| C4 | payouts_enabled warning banner | 🔧 | Flip flag in test DB → banner renders (real Stripe block = 👤) |
| C5 | Cross-studio isolation | 🤖 | Seller A can't read/mutate B (RLS) |
| C6 | Empty states brand-new seller | 🤖 | Courses/schedule/payouts/billing render, no crash |
| C7 | Pro upgrade (Stripe Billing, test) | 🔧 | Subscription active, plan reflects |

## D. Public surface / SEO / embed
| # | Test | Own | Verify |
|---|------|-----|--------|
| D1 | All routes render (`/`, `/:slug`, `/:slug/:course`, `/terms`, `/personvern`, `/om-oss`, 404) | 🤖 | Chrome |
| D2 | Draft course doesn't leak | 🤖 | Guess draft slug via anon key → excluded/404 |
| D3 | Invalid slug → clean 404 | 🤖 | No spinner/crash |
| D4 | Frame-ancestors: `/auth` blocked, `/embed` allowed | 🤖 | `curl -I` headers + Chrome iframe test |
| D5 | Security headers present | 🤖 | `curl -I` CSP/XFO/HSTS/nosniff |
| D6 | Mobile 375px pamelding | 🤖 | Chrome viewport + screenshot, no overflow |
| D7 | Real share preview (og:image) | 👤 | Paste link in WhatsApp/iMessage + FB debugger |

## E. Edge-function security posture
| # | Test | Own | Verify |
|---|------|-----|--------|
| E1 | JWT-gated fns return 401 without token | 🤖 | curl each |
| E2 | Cron endpoints 401 without secret | 🤖 | curl each |
| E3 | Webhooks reject bad signature (400) | 🤖 | POST unsigned to all 3 |
| E4 | Rate limiting trips | 🤖 | N× create-free-signup / connect-session |
| E5 | send-email not an open relay | 🤖 | POST w/o service role → 401 |
| E6 | CORS allowed-origins only + preflight | 🤖 | curl OPTIONS |

## F. Database / ops
| # | Test | Own | Verify |
|---|------|-----|--------|
| F1 | Migration drift zero (after applying 3 new) | 🤖 | `supabase migration list` |
| F2 | Advisors clean (no new ERROR) | 🤖 | `get_advisors` |
| F3 | RLS spot-checks w/ anon key | 🤖 | Anon can't read other buyers' signups/payments/drafts |
| F4 | ops-health-alert fires + emails | 🔧 | Needs `OPS_ALERT_EMAIL`; invoke cron, check `alerted:true` |
| F5 | Sentry receives test error | 🔧 | After `VITE_SENTRY_DSN` set |
| F6 | Email DNS (SPF/DKIM/DMARC) | 🤖 | `dig` the sending domain |

## G. Legal
| # | Test | Own | Verify |
|---|------|-----|--------|
| G1 | Terms/privacy real content, angrerett, org number in footer + receipt | 🤖 | Assert strings |

---

## Manual-only (👤) — cannot automate
- One real **live-mode** transaction at cutover (real card, few kr, confirm charge + payout, then refund). Never automate live money.
- Email **deliverability** to a real Gmail/Apple Mail inbox + spam-folder + cross-client rendering (Mailosaur proves content, not inboxing).
- Real **iOS Safari** pass on booking (keyboard, autofill, Apple Pay sheet).
- Real **"payouts blocked"** Stripe requirement state (flag-flip proves the UI only).
- **Share-preview caches** (WhatsApp/iMessage/FB/LinkedIn debuggers).

## Setup state (verified 2026-07-11)
- ✅ Stripe CLI — test mode default, Framio `acct_1SmGDrKIZBVJdfNv`
- ✅ Mailosaur — API key + server id in `.env.local`, inbox reachable
- ✅ `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…` in `.env.local`
- ✅ Supabase URL + anon key present; Playwright + Vitest installed
- ✅ Edge-fn `STRIPE_SECRET_KEY` is test + same account (confirmed by A1 booking succeeding live)

## Run results (2026-07-14, final full-app pass before opening registrations)
Ran from workspace `full-app-smoke-test` at origin/main `71660eb`, Stripe test mode, all created data cleaned up (verified zero residue + `ops-health-alert` → 0 anomalies post-cleanup).

- **A money (harness): A1–A12 all PASS** against the deployed backend — paid booking w/ live webhook, decline, free+confirmation email, oversell race, 4 blocked states, double-submit + webhook idempotency, sweep, teacher-cancel refund, cancel-course refund, `charge.refunded` preservation, price tampering. (A13 not re-asserted this round; prior pass 07-11.)
- **E security (harness): E1–E6 all PASS** — 13 JWT-gated fns 401; 4 cron endpoints 401 w/o secret; all 3 webhooks reject missing/bad signature (E3 assertion fixed since 07-11); rate limiting trips 429 on create-free-signup + connect-session; send-email not an open relay; CORS echoes only allowed origins.
- **F ops: F1 PASS** (204 migrations, zero drift), **F2 PASS** (advisors: no new issues; standing WARNs = leaked-password toggle 👤 + intentional public SECURITY DEFINER RPCs), **F3 PASS** (RLS anon blocks). **F4/F5 pending config** (`OPS_ALERT_EMAIL`/Sentry DSN = launch-switch items; ops-health-alert itself runs green, `alerted:false`). **F6 FAIL — SPF TXT missing** on both `openspot.no` and `mail.openspot.no` (DKIM ✅ at `resend._domainkey.mail.openspot.no`, DMARC ✅ `p=none` at `openspot.no`) → the standing human DNS task (+ Resend bounce MX).
- **Uncovered edge functions (new `EX` suite, `.context/smoke-extra/run-extra.mjs`): 13/13 PASS** —
  check-stripe-connect-status (live sync, payouts_enabled=true) · get-stripe-settlements (balance/payouts/dashboard link) · create-stripe-portal-session (real portal URL for the test billing customer) · set-operating-model (idempotent same-value) · google-places (<3-char guard + live autocomplete/details round-trip) · send-course-message (notified=1, email in inbox) · update-session (reschedule + "Ny tid:" email) · **send-class-reminders cron** (24h-window fixture → sent=1, `reminder_sent_at` stamped, email received) · **send-pending-confirmations cron** (backfilled buyer confirmation + seller notification, both stamps set) · **ops-health-alert cron** (all 6 checks 0) · delete-account (disposable dormant user deleted end-to-end; course-delete retention guard also verified live during cleanup) · send-support-message (delivered to support inbox).
  Every email template verified live in Mailosaur: order-confirm (free + backfill), course-message, session-rescheduled, class-reminder, booking-notification (seller), support-message, refund receipt (via A9).
- **Playwright B/D: all functional specs PASS** (auth surface + routing B1/B3, protected routes, legacy password routes, D1 routes/404s, D2 draft-no-leak, D3 clean 404s, D4 embed iframe, D6 mobile 375px, A1 render-to-pay w/ Payment Element). Skips: 03-course-creation (hardcoded — lifecycle covered 07-11/QA 07-14) and D1 course-detail helper (page render evidenced via A1 flow).
- **B2 invite links**: `lookup_seller_invite_link` valid code → correct storefront payload; bogus code → clean `not_found` (anon).
- **Deployed surface**: apex→www 307 + HSTS; `/` + `/auth` ship `frame-ancestors 'none'` + `X-Frame-Options: DENY` + nosniff; `/embed/*` ships `frame-ancestors *` (D4/D5 on the real Vercel deploy).
- **Not covered here**: C1 Connect onboarding + payments UI (smoke-tested separately in another workspace, same day), C2–C7 seller-dashboard flows (prior passes 07-11 + overnight QA 07-14), the 👤 manual-only list (live-mode transaction, real-inbox deliverability, iOS Safari, share previews).

**Verdict: GO from the code side.** Remaining blockers are the known human launch-switch items only: Stripe live keys + live webhooks, SPF DNS, `OPS_ALERT_EMAIL`/Sentry, leaked-password toggle, real org number, test-data cleanup + `VITE_PRELAUNCH` flip.

## Run results (2026-07-11, test mode, all created data cleaned up)
Ran against the real deployed backend + shared DB. Fixtures under `kristoffer-studio`.

- **A1–A12 money — all PASS.** A11 initially failed and thereby caught that the committed `charge.refunded` fix was **not deployed**; after `supabase functions deploy stripe-connect-webhook` it passed live.
- **E1, E2, E5, E6 PASS.** E4 PASS after fixing it to trip the per-email bucket (sandbox rotates egress IPs). E3 — security is correct (all webhooks reject unsigned/bad-sig 4xx); harness assertion is over-strict (accept any 4xx) — TODO.
- **F3 PASS.** F1 = the 3 uncommitted-to-remote migrations (expected — Day-2 apply). F6 = SPF missing on the sending domain (`mail.openspot.no` has DKIM; DMARC `p=none`) — Day-2 DNS.
- **Playwright D1, D2, D3, D4, D6, A1-render — PASS.** D1 course-detail skips (storefront cards aren't anchors; covered indirectly by A1-render).

### Launch deploy gaps this surfaced (all committed, none live)
1. **Edge functions**: `stripe-connect-webhook` now deployed. Still to deploy WITH their migration: `check-stripe-connect-status` + `stripe-connect-account-events` (write `stripe_payouts_enabled`), `delete-account` (subscription blocker).
2. **Migrations**: `20260711120000`, `20260711130000`, `20260711131000` need `db push` + land on `main`.
3. **Frontend**: headers/OG/copy/payouts-banner ship on next Vercel deploy.
4. **Email DNS**: add SPF for the Resend sending domain (F6).
