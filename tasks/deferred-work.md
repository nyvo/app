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

---

## 6. Multi-member studio orgs + freelancer/studio archetype

**Status:** Out of v1 scope. The DB model already supports it; the UI just assumes single-member orgs for now.

**Scenario:** A studio (Bob's Yoga Studio) has a regular instructor (Alice, who also teaches freelance under her own Alice Yoga brand). Bob wants Alice listed on studio courses, wants the studio's Dintero to collect the money, and wants to see the full schedule across all instructors. Alice wants to keep her own freelance business separate.

**What's already in place (no DB changes needed):**
- `organizations` — one row per money-collecting business entity.
- `org_members(org_id, user_id, role)` — many-to-many, composite PK on `(org_id, user_id)`. A user can belong to multiple orgs today.
- `course_instructors(course_id, profile_id, role='primary'|'guest')` — multi-instructor per course, already used for public display.
- `currentOrganizationId` in localStorage — seed of an org-switcher mechanism, just no visible UI for it yet.

**Freelancer vs studio is a data distinction, not an account type:**
- Org has 1 member → freelancer context → hide team management.
- Org has >1 member → studio context → show team management.
- User has >1 membership → show org switcher in the top bar.

No onboarding toggle needed. No new flag in the DB.

**What it'd take (post-launch, ~3–4 days of UI work):**

1. **Invite flow (~1–2 days):** new `org_invites` table (`id`, `org_id`, `email` or `code`, `role`, `invited_by`, `expires_at`, `accepted_at`). Admin generates invite → emails or shares code. Accept endpoint creates the `org_members` row with the invited role.
2. **Org switcher UI (~0.5 day):** sidebar or top-bar dropdown listing the user's memberships; swaps `currentOrganizationId`; existing page data re-scopes automatically.
3. **Role-scoped views (~1 day):** `teacher` role in a multi-member org sees their own courses + messages by default; `owner`/`admin` see all. Tweak RLS + page query filters.
4. **Instructor filter/column (~0.5 day):** on `/teacher/courses`, a studio admin can filter "show only Alice's classes."

**Money stays simple:** one org = one Dintero seller. Studio collects payment; pays instructors offline (invoice / Vipps / cash). Don't try to do per-instructor Dintero split payouts — adds per-guest KYC complexity no small studio wants.

**Trigger to pick up:** first real studio with multiple active instructors onboards.

---

## 7. Guest instructor access (single-course, no onboarding)

**Status:** Out of v1 scope. Sub-case of item 6.

**Scenario:** A studio hosts a one-off guest teacher (workshop, retreat) for 1–2 sessions. The guest doesn't want to go through Dintero onboarding or create a persistent account just for this. Studio admin needs to share signup info and let the guest message participants.

**Options, ranked by complexity:**

1. **Do nothing (ship-it reality).** Studio admin forwards signup info out-of-band. Works today, zero dev cost.
2. **Read-only share link per course (~2–3 hrs).** Tokenized URL, opens a read-only view of signups for one course. No auth, no messaging. Cheap but dead-end — skip in favour of option 3.
3. **Passwordless guest role (~1–2 days, recommended).** Magic-link login. New value `guest_instructor` in the `org_members.role` enum. Admin invites guest by email → creates/reuses auth user → inserts `org_members(role='guest_instructor')` → Supabase `signInWithOtp` sends the magic link. Guest dashboard is scoped: shows only courses where they're a `course_instructors` primary/guest; hides payments, other courses, org settings. No Dintero onboarding required.
4. **Cross-org federation.** Overkill. Only for power users with multiple studio relationships.

**Money:** studio's Dintero collects. Guest never enters the money flow. Admin handles their cut externally.

**Trigger to pick up:** first scheduled guest workshop with a studio that has onboarded.
