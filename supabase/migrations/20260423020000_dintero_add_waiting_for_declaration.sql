-- Add WAITING_FOR_DECLARATION to dintero_onboarding_status CHECK constraint.
-- Discovered during sandbox testing: Dintero's payout-destination approval
-- returns this case_status after creation, when the teacher hasn't yet
-- submitted the hosted declaration form at dashboard.quickr.no.
--
-- Transition graph:
--   PENDING → WAITING_FOR_DECLARATION → WAITING_FOR_SIGNATURE → ACTIVE
--                                    ↘ DECLINED
--                                                            ↘ TERMINATED

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_dintero_onboarding_status_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_dintero_onboarding_status_check
  CHECK (dintero_onboarding_status IN (
    'PENDING',
    'WAITING_FOR_DECLARATION',
    'WAITING_FOR_SIGNATURE',
    'ACTIVE',
    'DECLINED',
    'TERMINATED'
  ));
