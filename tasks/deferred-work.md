# Deferred Work

Items explicitly parked during the public-booking redesign (April 2026). Each one has a reason it's out of v1 scope and a rough shape of what it'd take to pick up later.

---

## 1. Klippekort / punch card support

**Status:** Out of v1 scope. Revisit when we have user accounts.

**Why deferred:**
- Requires account persistence so a user can own a credit balance and return to spend it.
- Current app is guest-checkout only — a guest can't "own" a klippekort across sessions.
- Klippekort is common in the Nordic market (Glød, Kjernekraft, Eversports all sell them), so we'll lose some repeat-regular studios without it.

**What it'd take:**
- Sign-in / account system (the bigger prerequisite — weeks of work, not days).
- Schema: `punch_cards` table (id, user_id, course_type_eligible, credits_total, credits_used, expires_at, purchased_at, price_paid).
- Public course detail: secondary CTA "Bruk klippekort" when user is logged in and has a matching eligible card.
- Teacher dashboard: issue / see / revoke klippekort per customer.

**Trigger to pick up:** 20+ studios onboarded, or one strategic studio blocks adoption on it.

---

## 2. Vipps payment integration

**Status:** Deferred — user will tackle after new public booking pages are built.

**Why deferred:**
- Vipps is table stakes in Norway (Baymard-type conversion lift + Nordic market research is unambiguous), but it's a payments workstream, not a layout workstream. Can ship in parallel to / after layout changes.
- Stripe does not currently support Vipps as a payment method (verified ~Jan 2026; worth re-checking).
- So this is a **direct Vipps MobilePay integration**, not a Stripe payment-method bolt-on.

**What it'd take (direct integration path):**
- Vipps merchant account + API credentials.
- Vipps ePayment API integration (wraps create-payment, capture, refund).
- New edge function: `create-vipps-payment` parallel to `create-payment-intent`.
- Webhook handler for Vipps callbacks (parallel to `stripe-webhook`).
- Checkout UI: "Betal med Vipps" button as primary CTA above Stripe card entry on the public booking card.
- Bonus: Vipps Login can return name+email+phone, enabling a one-tap express checkout that skips the form entirely. This is the highest-leverage conversion piece.
- Refund flow: update `process-refund` to branch on payment method (Stripe vs Vipps).

**Trigger to pick up:** After new public course list + detail pages ship.

---

## 3. Delete zombie waitlist edge functions from Supabase

**Status:** Blocked on dashboard action (Supabase MCP doesn't expose function deletion).

**What:**
5 edge functions still deployed on the project with zero code references. Their backing DB RPCs have already been dropped (see `drop_zombie_waitlist_rpcs` migration). Safe to remove:

- `join-waitlist`
- `process-waitlist-promotion`
- `promote-waitlist-signup`
- `process-expired-offers`
- `validate-claim-token`

**How:** Supabase Dashboard → Edge Functions → click each → Delete. One-click per function.

---

## 4. Waitlist v2 (if we ever want it back)

**Status:** Out of scope. Feature was removed because there wasn't time to finish it correctly.

**If picked up again, the preferred pattern from research:**
- 1-click join (name + email, no payment) when a course is full.
- When a spot opens: send the next person on the list a unique claim-link email, expires in 24h. If they don't claim, roll to the next. Matches the guest-checkout mental model (no card on file needed).
- `validate-claim-token` and `process-expired-offers` edge-function names hint that this was the approach originally. They've been deleted; rebuild fresh if revisiting.

---

## 5. Deleted student-facing user flows (historical reference)

Commits `6a6343c`, `6f231e7`, `613a3c6` removed student account flows in Phases 1 / 2a / 2b. We are committed to **guest-only checkout** as the public booking model for the foreseeable future. Revisit only if studios explicitly ask for "my classes" history for end-users.
