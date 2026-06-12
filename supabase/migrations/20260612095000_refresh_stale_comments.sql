-- Pre-launch audit fix M14 (see .context/db-audit/AUDIT-REPORT.md)
-- Four comments described states that no longer exist and would steer a future
-- developer wrong. Comments only — no behavior change.

-- Said "Anon insert only" — anon INSERT was revoked in 20260606190000 and the
-- INSERT policy dropped in 20260608203822.
COMMENT ON TABLE public.waitlist IS
  'Pre-launch interest list. Sealed since 20260606190000/20260608203822: no anon or authenticated access — reads and writes go through service role only.';

-- Said "role column within = owner/admin" — the owner-only CHECK has applied
-- since 20260606140000; 'admin' rows cannot exist.
COMMENT ON COLUMN public.profiles.role IS
  'UX hint for routing — distinguishes buyer vs seller persona for /onboarding branching and /overview sidebar contents. NOT for authorization. Authz checks must use seller_members (presence of row = seller membership; role within is always ''owner'' — enforced by seller_members_role_owner_only since 20260606140000).';

-- Referenced Stripe; payments have been Dintero since April 2026.
COMMENT ON TABLE public.payment_attempts IS
  'Pre-payment context for a Dintero checkout attempt, inserted before the Dintero session opens. Keyed by a UUID we pass to Dintero as order.merchant_reference; looked up by dintero-webhook and finalize-dintero-transaction.';

-- Said fanout is "(future)" — member fanout shipped in 20260611120000.
COMMENT ON COLUMN public.notifications.seller_id IS
  'Tenant scope. Matches courses.seller_id et al — the studio/business that owns the event. Recipient is normally the seller owner; differs when seller members get fanout (e.g. affiliation join notifications, 20260611120000).';
