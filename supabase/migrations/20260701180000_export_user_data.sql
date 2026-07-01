-- GDPR right-of-access / portability export (support-run).
--
-- The privacy page promises "en kopi av det vi har lagret om deg innen 30 dager"
-- in "et maskinlesbart format". This RPC gathers one data subject's personal data
-- into a single JSON document. Support runs it (service_role) for a verified
-- requester and returns the JSON; there is no self-service UI yet.
--
-- IDENTITY: keyed strictly on the account id (auth.users.id) and its FK links —
-- never on a matching email. Guest emails are not an identity link (a buyer may
-- book for someone else), per account-deletion-design.md.
--
-- SCOPE: the subject's own data only —
--   * account (auth) + profile
--   * bookings they hold as the account holder (signups.buyer_id = them) — their
--     own participant details; NOT other people's bookings to their courses.
--   * seller memberships + the business identity of sellers they belong to
--     (name/contact/org number, locations, teams).
-- Deliberately excluded: other data subjects' PII, and internal payment-integration
-- identifiers (Stripe account/customer/subscription ids) which are system data, not
-- "personal data we stored about you".
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT jsonb_build_object(
    'export_generated_at', now(),
    'subject_user_id', p_user_id,
    'account', (
      SELECT jsonb_build_object(
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at
      )
      FROM auth.users u WHERE u.id = p_user_id
    ),
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'name', p.name,
        'phone', p.phone,
        'role', p.role,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'onboarding_completed_at', p.onboarding_completed_at
      )
      FROM public.profiles p WHERE p.id = p_user_id
    ),
    'bookings', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'course_id', s.course_id,
        'course_title', c.title,
        'participant_name', s.participant_name,
        'participant_email', s.participant_email,
        'participant_phone', s.participant_phone,
        'status', s.status,
        'payment_status', s.payment_status,
        'amount_paid', s.amount_paid,
        'refund_amount', s.refund_amount,
        'refunded_at', s.refunded_at,
        'note', s.note,
        'ticket_label', s.ticket_label_snapshot,
        'created_at', s.created_at
      ) ORDER BY s.created_at), '[]'::jsonb)
      FROM public.signups s
      LEFT JOIN public.courses c ON c.id = s.course_id
      WHERE s.buyer_id = p_user_id
    ),
    'seller_memberships', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'seller_id', sm.seller_id,
        'role', sm.role,
        'member_since', sm.created_at,
        'business', jsonb_build_object(
          'name', se.name,
          'email', se.email,
          'phone', se.phone,
          'organization_number', se.organization_number,
          'seller_type', se.seller_type,
          'created_at', se.created_at,
          'locations', (
            SELECT coalesce(jsonb_agg(jsonb_build_object(
              'name', tl.name,
              'address', tl.address
            ) ORDER BY tl.created_at), '[]'::jsonb)
            FROM public.teacher_locations tl WHERE tl.seller_id = se.id
          ),
          'teams', (
            SELECT coalesce(jsonb_agg(jsonb_build_object(
              'name', t.name,
              'slug', t.slug
            ) ORDER BY t.created_at), '[]'::jsonb)
            FROM public.teams t WHERE t.owner_seller_id = se.id
          )
        )
      ) ORDER BY sm.created_at), '[]'::jsonb)
      FROM public.seller_members sm
      JOIN public.sellers se ON se.id = sm.seller_id
      WHERE sm.user_id = p_user_id
    )
  );
$function$;
REVOKE ALL ON FUNCTION public.export_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO service_role;
