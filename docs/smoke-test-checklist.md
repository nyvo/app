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
