-- Durable "subscription reprice owed" flag (audit P1-10).
--
-- set_operating_model commits the operating_model change and merely RETURNS
-- repricing_needed; the Stripe price swap lives in the set-operating-model edge
-- function. Two holes: (a) when the Stripe call fails the edge function only
-- console.errors — nothing records that a swap is still owed, so it's silently
-- lost until the owner happens to toggle again; (b) set_operating_model is
-- granted to authenticated, so an owner can call it directly via PostgREST and
-- flip solo↔studio without ever hitting the reprice path.
--
-- Fix: a server-controlled sellers.subscription_pending_reprice flag the RPC
-- sets whenever a change needs repricing (so BOTH the bypass and the swallowed
-- failure leave a durable record). The edge function clears it once Stripe is
-- on the correct price; ops_health_check surfaces any that stay set. The column
-- has no client UPDATE grant, so only the RPC (definer) and service-role edge
-- functions can write it.

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS subscription_pending_reprice boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sellers.subscription_pending_reprice IS
  'Server-controlled. True when the operating_model changed but the Stripe '
  'subscription price has not yet been swapped to match. Set by '
  'set_operating_model; cleared by the set-operating-model edge function once '
  'Stripe matches. A row stuck true is a reprice that never completed '
  '(surfaced by ops_health_check).';

CREATE OR REPLACE FUNCTION public.set_operating_model(p_seller_id uuid, p_operating_model text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.sellers%ROWTYPE;
  v_repricing boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_operating_model NOT IN ('solo', 'studio') THEN
    RAISE EXCEPTION 'Invalid operating_model: %', p_operating_model USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_seller_owner(p_seller_id, v_user) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.sellers WHERE id = p_seller_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller not found' USING ERRCODE = '42704';
  END IF;

  IF v_row.operating_model = p_operating_model THEN
    RETURN jsonb_build_object(
      'operating_model', p_operating_model,
      'changed', false,
      'repricing_needed', false
    );
  END IF;

  -- Guardrail: a studio hosting affiliates cannot silently become solo — the
  -- guests' courses would keep rendering on a storefront whose management UI
  -- just disappeared. The owner removes the affiliates first.
  IF p_operating_model = 'solo' AND EXISTS (
    SELECT 1 FROM public.seller_affiliations sa WHERE sa.host_seller_id = p_seller_id
  ) THEN
    RAISE EXCEPTION 'has_active_affiliates' USING ERRCODE = 'P0001';
  END IF;

  -- Two-axis policy: the declaration prices nothing directly, but an active
  -- Pro subscription follows the declaration at the NEXT period. The Stripe
  -- price swap is performed by the set-operating-model edge function when
  -- this flag is true.
  v_repricing := v_row.subscription_plan = 'pro'
    AND v_row.subscription_status IN ('active', 'past_due')
    AND v_row.subscription_external_id IS NOT NULL;

  -- Persist BOTH the declaration and the durable reprice obligation in one
  -- write. Whether this call came from the edge function or straight from
  -- PostgREST, the flag now records that a swap is owed (edge clears it on
  -- success); a stuck flag is caught by monitoring.
  UPDATE public.sellers
     SET operating_model = p_operating_model,
         subscription_pending_reprice = v_repricing
   WHERE id = p_seller_id;

  RETURN jsonb_build_object(
    'operating_model', p_operating_model,
    'changed', true,
    'repricing_needed', v_repricing,
    'subscription_external_id', v_row.subscription_external_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.set_operating_model(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_operating_model(uuid, text) TO authenticated, service_role;
