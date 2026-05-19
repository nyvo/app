-- Serialize concurrent calls to create_signup_if_available that share a
-- Dintero transaction id, and short-circuit redundant work.
--
-- Without this, the webhook + finalize-dintero-transaction routinely race
-- for the same transaction. The loser hits unique_violation on
-- signups_dintero_transaction_id_key and returns 'already_signed_up' —
-- an error code overloaded with the genuine duplicate-booking case
-- (unique_active_non_drop_in_signup_per_course_email). Callers had to
-- look up the signup by txn id to disambiguate, with the wrong guess
-- voiding a real captured transaction.
--
-- New shape:
--   1. Acquire xact lock on hashtext('dintero:' || transaction_id). Same-txn
--      callers serialize; second caller waits for the first to commit.
--   2. After the lock, check if a signup already exists for this txn.
--      If yes, return success with that signup_id and status='already_processed'
--      — the race was lost, but the work is done. No void, no email re-send
--      (caller's gated by signups.confirmation_sent_at).
--   3. Otherwise proceed as before (validate, capacity-lock, INSERT).
--
-- Net effect: 'already_signed_up' now has exactly one meaning — genuine
-- duplicate booking (unique_active_non_drop_in_signup_per_course_email).
-- Callers can void unconditionally on that error.
--
-- Free signups (dintero_transaction_id IS NULL) skip the txn lock — they
-- come from a single synchronous path (create-free-signup) so the race
-- doesn't apply.

CREATE OR REPLACE FUNCTION public.create_signup_if_available(
  p_seller_id                  UUID,
  p_course_id                  UUID,
  p_ticket_type_id             UUID,
  p_participant_name           TEXT,
  p_participant_email          TEXT,
  p_participant_phone          TEXT,
  p_amount_paid                NUMERIC,
  p_dintero_transaction_id     TEXT,
  p_dintero_session_id         TEXT,
  p_dintero_merchant_reference TEXT,
  p_course_session_id          UUID DEFAULT NULL,
  p_buyer_id                   UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tier               public.course_signup_packages%ROWTYPE;
  v_course             public.courses%ROWTYPE;
  v_session            public.course_sessions%ROWTYPE;
  v_package_end_date   DATE;
  v_signup_id          UUID;
  v_existing_signup_id UUID;
  v_count              INT;
  v_failing_session    UUID;
  v_lock_key           BIGINT;
BEGIN
  -- Serialize same-transaction callers (webhook vs finalize race).
  -- Held until this RPC's implicit transaction commits — the second caller
  -- can't even start until the first one has either inserted or rolled back.
  IF p_dintero_transaction_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('dintero:txn:' || p_dintero_transaction_id, 0)
    );

    -- Race-loser fast path: the lock-holder before us already inserted
    -- the signup. Return its id; caller treats this as success and skips
    -- void / re-charge / re-notify.
    SELECT id INTO v_existing_signup_id
    FROM public.signups
    WHERE dintero_transaction_id = p_dintero_transaction_id;

    IF v_existing_signup_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', true,
        'signup_id', v_existing_signup_id,
        'status', 'already_processed'
      );
    END IF;
  END IF;

  -- ---- Load + validate the ticket type
  SELECT * INTO v_tier
  FROM public.course_signup_packages
  WHERE id = p_ticket_type_id AND course_id = p_course_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_found',
      'message', 'Billettypen finnes ikke');
  END IF;

  IF NOT v_tier.is_active THEN
    RETURN json_build_object('success', false, 'error', 'ticket_inactive',
      'message', 'Denne billetten er ikke lenger tilgjengelig');
  END IF;

  IF v_tier.sales_starts_at IS NOT NULL AND v_tier.sales_starts_at > now() THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_yet_on_sale',
      'message', 'Denne billetten er ikke i salg ennå');
  END IF;

  IF v_tier.sales_ends_at IS NOT NULL AND v_tier.sales_ends_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'ticket_expired',
      'message', 'Tilbudet er utløpt');
  END IF;

  IF v_tier.ticket_kind = 'drop_in' AND p_course_session_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_required',
      'message', 'Drop-in krever at du velger en time');
  END IF;

  IF v_tier.ticket_kind <> 'drop_in' AND p_course_session_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_not_allowed',
      'message', 'Pakke-billetter kan ikke knyttes til en enkelt time');
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'course_not_found',
      'message', 'Kurset finnes ikke');
  END IF;

  IF v_tier.ticket_kind = 'drop_in' THEN
    SELECT * INTO v_session
    FROM public.course_sessions
    WHERE id = p_course_session_id AND course_id = p_course_id;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'session_not_found',
        'message', 'Timen finnes ikke');
    END IF;
  END IF;

  IF v_tier.ticket_kind <> 'drop_in' AND v_tier.weeks IS NOT NULL THEN
    v_package_end_date := v_course.start_date + ((v_tier.weeks - 1) * INTERVAL '7 days');
  END IF;

  -- Capacity-scoped lock: serialise concurrent buyers competing for seats.
  IF v_tier.ticket_kind = 'drop_in' THEN
    v_lock_key := hashtextextended(p_course_id::text || p_course_session_id::text, 0);
  ELSE
    v_lock_key := hashtextextended(p_course_id::text, 0);
  END IF;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF v_tier.ticket_kind = 'drop_in' THEN
    IF v_course.max_participants IS NOT NULL THEN
      v_count := public.count_signups_for_session(p_course_session_id);
      IF v_count >= v_course.max_participants THEN
        RETURN json_build_object('success', false, 'error', 'session_full',
          'message', 'Timen er full');
      END IF;
    END IF;
  ELSE
    IF v_course.max_participants IS NOT NULL AND v_package_end_date IS NOT NULL THEN
      SELECT cs.id INTO v_failing_session
      FROM public.course_sessions cs
      WHERE cs.course_id = p_course_id
        AND cs.session_date BETWEEN v_course.start_date AND v_package_end_date
        AND public.count_signups_for_session(cs.id) >= v_course.max_participants
      LIMIT 1;

      IF v_failing_session IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'course_full',
          'message', 'En eller flere timer i kurset er fulle');
      END IF;
    END IF;
  END IF;

  IF v_tier.max_quantity IS NOT NULL THEN
    v_count := public.count_signups_by_ticket_type(p_course_id, p_ticket_type_id);
    IF v_count >= v_tier.max_quantity THEN
      RETURN json_build_object('success', false, 'error', 'tier_sold_out',
        'message', 'Denne billettypen er utsolgt');
    END IF;
  END IF;

  INSERT INTO public.signups (
    seller_id, course_id, buyer_id,
    participant_name, participant_email, participant_phone,
    status, payment_status,
    ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot,
    course_session_id, package_end_date,
    dintero_transaction_id, dintero_session_id, dintero_merchant_reference,
    amount_paid, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone,
    'confirmed', 'paid',
    p_ticket_type_id, v_tier.label, v_tier.audience, v_tier.ticket_kind,
    p_course_session_id, v_package_end_date,
    p_dintero_transaction_id, p_dintero_session_id, p_dintero_merchant_reference,
    p_amount_paid, NOW(), NOW()
  )
  RETURNING id INTO v_signup_id;

  RETURN json_build_object(
    'success', true,
    'signup_id', v_signup_id,
    'status', 'confirmed',
    'package_end_date', v_package_end_date
  );

EXCEPTION
  WHEN unique_violation THEN
    -- With the txn-level lock + early lookup above, this can no longer fire
    -- on signups_dintero_transaction_id_key. The only remaining trigger is
    -- unique_active_non_drop_in_signup_per_course_email — i.e., this buyer
    -- already has a confirmed non-drop-in signup for this course.
    RETURN json_build_object('success', false, 'error', 'already_signed_up',
      'message', 'Du er allerede påmeldt dette kurset');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'database_error',
      'message', SQLERRM);
END;
$$;
