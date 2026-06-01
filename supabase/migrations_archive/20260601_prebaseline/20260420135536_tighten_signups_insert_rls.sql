-- Tighten the signups INSERT policy so the client cannot forge free signups.
--
-- Before this migration, the policy allowed both authenticated users and
-- anon users to INSERT any signup row as long as user_id was null or matched
-- auth.uid(). There was no check that the course was actually free, so an
-- anon caller could insert `status='confirmed', payment_status='paid'` for
-- a paid course and bypass Stripe.
--
-- Public free-course bookings now go through the `create-free-signup` edge
-- function, which verifies course.price <= 0 server-side and calls the
-- atomic capacity RPC with the service role (RLS bypassed). Paid bookings
-- already flow through the stripe-webhook edge function with service role.
-- The only remaining client-side INSERT path is the teacher manual-add
-- dialog, which is authenticated and belongs to the signup's organization.

DROP POLICY IF EXISTS "Signups INSERT" ON public.signups;

CREATE POLICY "Signups INSERT by org member"
  ON public.signups FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, (SELECT auth.uid())));
