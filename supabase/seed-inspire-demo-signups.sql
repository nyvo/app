-- ============================================================================
-- Inspire Yogastudio demo signup seed
-- ============================================================================
--
-- Re-creates the demo signup state for the Inspire Yogastudio org. Wipes
-- existing signups + payment_attempts for that org and inserts 64 fresh
-- signups across 12 courses:
--
--   • 74 confirmed + paid (the happy-path majority)
--   • 6 of those are drop-in tickets linked to specific upcoming sessions
--   • 5 faulty cases for the dashboard exception story:
--       – 2 pending payment (signup placed, checkout abandoned)
--       – 1 failed payment (Dintero declined the card)
--       – 1 cancelled + refunded (someone backed out, money returned)
--       – 1 cancelled + paid (no refund yet — admin still needs to handle)
--   • 2 spots-state demo cases (visible on the public course list + booking):
--       – Ashtanga Yoga (cap 10) is FULL (10/10) — booking shows "Kurset er fullt"
--       – Gravid Yoga (cap 10) is LOW (8/10) — booking shows "2 plasser igjen"
--
-- created_at uses NOW() - INTERVAL offsets, so re-running 3 months later
-- still produces "recent" timestamps. Most signups were placed Jan-Feb 2026
-- when the semester courses started; drop-ins + faults are within the last
-- 2 weeks; the workshop signups are within the last 3 weeks.
--
-- ─── Prerequisites ──────────────────────────────────────────────────────────
--
-- The Inspire Yogastudio org must exist (slug = 'inspire-yogastudio' OR name
-- starts with 'Inspire'), AND its 16 demo courses must exist with their
-- default + drop-in tiers. Both were seeded in earlier sessions; this file
-- assumes the structural data is already in the database.
--
-- ─── How to run ─────────────────────────────────────────────────────────────
--
-- Paste into the Supabase SQL editor and execute, or:
--   psql "$DATABASE_URL" -f supabase/seed-inspire-demo-signups.sql
--
-- Idempotent: re-running cleanly resets the demo. The wipe at the top
-- removes prior demo signups before re-inserting.
-- ============================================================================

DO $$
DECLARE
  v_org      UUID;
  v_course   UUID;
  v_tier     UUID;  -- default (full-course / package) tier for the course
  v_dropin   UUID;  -- drop-in tier (if the course offers one)
BEGIN
  -- ─── Resolve the Inspire org ──────────────────────────────────────────────
  SELECT id INTO v_org
  FROM organizations
  WHERE slug = 'inspire-yogastudio' OR name ILIKE 'inspire%'
  ORDER BY created_at
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Inspire Yogastudio org not found. Onboard the org first.';
  END IF;

  RAISE NOTICE 'Seeding demo signups for org %', v_org;

  -- ─── Wipe prior demo state ───────────────────────────────────────────────
  DELETE FROM signups WHERE organization_id = v_org;
  DELETE FROM payment_attempts WHERE organization_id = v_org;


  -- ════════════════════════════════════════════════════════════════════════
  -- VINYASA YOGA — onsdag kveld (20 cap; 14 signups, 7 spots left)
  -- 11 happy + 1 drop-in + 1 cancelled-refunded + 1 pending (FAULT 1+2)
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Vinyasa Yoga — onsdag kveld';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele kurset' AND ticket_kind = 'package';
  SELECT id INTO v_dropin FROM course_signup_packages WHERE course_id = v_course AND ticket_kind = 'drop_in';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Kari Hansen',      'kari.hansen@gmail.com',     '90123456', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-001', 'demo-sess-001', 'demo-ref-001', NOW() - INTERVAL '78 days', NOW() - INTERVAL '78 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Erik Solberg',     'erik.solberg@gmail.com',    '92112233', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-002', 'demo-sess-002', 'demo-ref-002', NOW() - INTERVAL '76 days', NOW() - INTERVAL '76 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Ingrid Nilsen',    'ingrid.nilsen@hotmail.com', '47556677', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-003', 'demo-sess-003', 'demo-ref-003', NOW() - INTERVAL '74 days', NOW() - INTERVAL '74 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Petter Olsen',     'petter.olsen@gmail.com',    '99887766', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-004', 'demo-sess-004', 'demo-ref-004', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Sofie Berg',       'sofie.berg@outlook.com',    '40123456', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-005', 'demo-sess-005', 'demo-ref-005', NOW() - INTERVAL '68 days', NOW() - INTERVAL '68 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Magnus Lien',      'magnus.lien@gmail.com',     '47889900', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-006', 'demo-sess-006', 'demo-ref-006', NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Astrid Pedersen',  'astrid.pedersen@gmail.com', '98765432', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-007', 'demo-sess-007', 'demo-ref-007', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Henrik Andersen',  'henrik.andersen@gmail.com', '41223344', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-008', 'demo-sess-008', 'demo-ref-008', NOW() - INTERVAL '58 days', NOW() - INTERVAL '58 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Maja Strand',      'maja.strand@hotmail.com',   '92334455', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-009', 'demo-sess-009', 'demo-ref-009', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Lars Knutsen',     'lars.knutsen@gmail.com',    '47667788', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-010', 'demo-sess-010', 'demo-ref-010', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Liv Eriksen',      'liv.eriksen@gmail.com',     '90778899', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-011', 'demo-sess-011', 'demo-ref-011', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days');

  -- Drop-in linked to the 04-29 19:00 session
  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, course_session_id, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_dropin, 'Drop-in', 'standard', 'drop_in', 'Mari Aas', 'mari.aas@gmail.com', '92998877', 'confirmed', 'paid', 250,
    (SELECT id FROM course_sessions WHERE course_id = v_course AND session_date = '2026-04-29' AND start_time = '19:00:00'),
    'demo-tx-012', 'demo-sess-012', 'demo-ref-012', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

  -- FAULT 1: cancelled + refunded
  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, refund_amount, refunded_at, created_at, updated_at)
  VALUES (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Tobias Iversen', 'tobias.iversen@gmail.com', '47445566', 'cancelled', 'refunded', 2200, '2026-04-29',
    'demo-tx-013', 'demo-sess-013', 'demo-ref-013', 2200, NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '32 days', NOW() - INTERVAL '12 days');

  -- FAULT 2: pending payment (abandoned checkout — no transaction id)
  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Selma Birkeland', 'selma.birkeland@gmail.com', '99221133', 'confirmed', 'pending', NULL, '2026-04-29',
    NULL, 'demo-sess-014', 'demo-ref-014', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- YIN YOGA — søndag kveld (18 cap; 12 signups, 6 spots left)
  -- 10 happy + 1 drop-in + 1 failed payment (FAULT 3)
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Yin Yoga — søndag kveld';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele kurset' AND ticket_kind = 'package';
  SELECT id INTO v_dropin FROM course_signup_packages WHERE course_id = v_course AND ticket_kind = 'drop_in';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Hanna Thomassen',  'hanna.thomassen@gmail.com',  '40998877', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-020', 'demo-sess-020', 'demo-ref-020', NOW() - INTERVAL '72 days', NOW() - INTERVAL '72 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Aksel Eira',       'aksel.eira@gmail.com',       '92776655', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-021', 'demo-sess-021', 'demo-ref-021', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Sigrid Moen',      'sigrid.moen@hotmail.com',    '47554433', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-022', 'demo-sess-022', 'demo-ref-022', NOW() - INTERVAL '67 days', NOW() - INTERVAL '67 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Vilma Aas',        'vilma.aas@gmail.com',        '90332211', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-023', 'demo-sess-023', 'demo-ref-023', NOW() - INTERVAL '63 days', NOW() - INTERVAL '63 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Frida Berg',       'frida.berg@gmail.com',       '99001122', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-024', 'demo-sess-024', 'demo-ref-024', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Lukas Solberg',    'lukas.solberg@gmail.com',    '92443322', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-025', 'demo-sess-025', 'demo-ref-025', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Ida Nilsen',       'ida.nilsen@hotmail.com',     '40221133', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-026', 'demo-sess-026', 'demo-ref-026', NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Mathias Pedersen', 'mathias.pedersen@gmail.com', '47990011', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-027', 'demo-sess-027', 'demo-ref-027', NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Mia Kristiansen',  'mia.kristiansen@gmail.com',  '92889900', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-028', 'demo-sess-028', 'demo-ref-028', NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Kasper Larsen',    'kasper.larsen@gmail.com',    '40887766', 'confirmed', 'paid', 2200, '2026-05-03', 'demo-tx-029', 'demo-sess-029', 'demo-ref-029', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days');

  -- Drop-in for next session
  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, course_session_id, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_dropin, 'Drop-in', 'standard', 'drop_in', 'Tuva Olsen', 'tuva.olsen@gmail.com', '99334455', 'confirmed', 'paid', 250,
    (SELECT id FROM course_sessions WHERE course_id = v_course AND session_date >= CURRENT_DATE - INTERVAL '14 days' ORDER BY session_date LIMIT 1),
    'demo-tx-030', 'demo-sess-030', 'demo-ref-030', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days');

  -- FAULT 3: failed payment (Dintero declined the card)
  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Even Karlsen', 'even.karlsen@gmail.com', '47332211', 'confirmed', 'failed', NULL, '2026-05-03',
    'demo-tx-031', 'demo-sess-031', 'demo-ref-031', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- VINYASA FLOW — morgen (20 cap; 8 signups, 12 spots left)
  -- 7 happy + 1 drop-in
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Vinyasa Flow — morgen';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele semesteret (13 uker)' AND ticket_kind = 'package';
  SELECT id INTO v_dropin FROM course_signup_packages WHERE course_id = v_course AND ticket_kind = 'drop_in';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Maria Hansen',   'maria.hansen@gmail.com',    '92112244', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-040', 'demo-sess-040', 'demo-ref-040', NOW() - INTERVAL '74 days', NOW() - INTERVAL '74 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Anna Olsen',     'anna.olsen@gmail.com',      '40556677', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-041', 'demo-sess-041', 'demo-ref-041', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Nora Eriksen',   'nora.eriksen@gmail.com',    '99776655', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-042', 'demo-sess-042', 'demo-ref-042', NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Emma Strand',    'emma.strand@gmail.com',     '92334411', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-043', 'demo-sess-043', 'demo-ref-043', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Brage Iversen',  'brage.iversen@gmail.com',   '47882233', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-044', 'demo-sess-044', 'demo-ref-044', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Filip Berg',     'filip.berg@hotmail.com',    '40445566', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-045', 'demo-sess-045', 'demo-ref-045', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Mathilde Lien',  'mathilde.lien@gmail.com',   '92667788', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-046', 'demo-sess-046', 'demo-ref-046', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days');

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, course_session_id, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_dropin, 'Drop-in', 'standard', 'drop_in', 'Andreas Knutsen', 'andreas.knutsen@gmail.com', '99554433', 'confirmed', 'paid', 220,
    (SELECT id FROM course_sessions WHERE course_id = v_course AND session_date >= CURRENT_DATE - INTERVAL '14 days' ORDER BY session_date LIMIT 1),
    'demo-tx-047', 'demo-sess-047', 'demo-ref-047', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- YIN YOGA — onsdag (18 cap; 6 signups, 12 spots left)
  -- 5 happy + 1 drop-in
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Yin Yoga — onsdag';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele semesteret (13 uker)' AND ticket_kind = 'package';
  SELECT id INTO v_dropin FROM course_signup_packages WHERE course_id = v_course AND ticket_kind = 'drop_in';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Mari Strand',     'mari.strand@gmail.com',      '92334466', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-060', 'demo-sess-060', 'demo-ref-060', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Sara Pedersen',   'sara.pedersen@gmail.com',    '40998811', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-061', 'demo-sess-061', 'demo-ref-061', NOW() - INTERVAL '62 days', NOW() - INTERVAL '62 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Camilla Berg',    'camilla.berg@hotmail.com',   '99887711', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-062', 'demo-sess-062', 'demo-ref-062', NOW() - INTERVAL '54 days', NOW() - INTERVAL '54 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Ole Knutsen',     'ole.knutsen@gmail.com',      '47776611', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-063', 'demo-sess-063', 'demo-ref-063', NOW() - INTERVAL '47 days', NOW() - INTERVAL '47 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Aslaug Andersen', 'aslaug.andersen@gmail.com',  '92556677', 'confirmed', 'paid', 2200, '2026-04-29', 'demo-tx-064', 'demo-sess-064', 'demo-ref-064', NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days');

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, course_session_id, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_dropin, 'Drop-in', 'standard', 'drop_in', 'Eline Andersen', 'eline.andersen@gmail.com', '40112266', 'confirmed', 'paid', 250,
    (SELECT id FROM course_sessions WHERE course_id = v_course AND session_date >= CURRENT_DATE - INTERVAL '14 days' ORDER BY session_date LIMIT 1),
    'demo-tx-065', 'demo-sess-065', 'demo-ref-065', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- KUNDALINI YOGA (15 cap; 5 signups, 10 spots left)
  -- 4 happy + 1 drop-in
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Kundalini Yoga';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele kurset' AND ticket_kind = 'package';
  SELECT id INTO v_dropin FROM course_signup_packages WHERE course_id = v_course AND ticket_kind = 'drop_in';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Solveig Aas',        'solveig.aas@gmail.com',        '99221199', 'confirmed', 'paid', 2200, '2026-04-28', 'demo-tx-070', 'demo-sess-070', 'demo-ref-070', NOW() - INTERVAL '76 days', NOW() - INTERVAL '76 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Karoline Birkeland', 'karoline.birkeland@gmail.com', '92443377', 'confirmed', 'paid', 2200, '2026-04-28', 'demo-tx-071', 'demo-sess-071', 'demo-ref-071', NOW() - INTERVAL '68 days', NOW() - INTERVAL '68 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Espen Moen',         'espen.moen@gmail.com',         '47998877', 'confirmed', 'paid', 2200, '2026-04-28', 'demo-tx-072', 'demo-sess-072', 'demo-ref-072', NOW() - INTERVAL '57 days', NOW() - INTERVAL '57 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Kristin Moen',       'kristin.moen@gmail.com',       '40334411', 'confirmed', 'paid', 2200, '2026-04-28', 'demo-tx-073', 'demo-sess-073', 'demo-ref-073', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days');

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, course_session_id, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_dropin, 'Drop-in', 'standard', 'drop_in', 'Tora Iversen', 'tora.iversen@gmail.com', '99664422', 'confirmed', 'paid', 250,
    (SELECT id FROM course_sessions WHERE course_id = v_course AND session_date >= CURRENT_DATE - INTERVAL '14 days' ORDER BY session_date LIMIT 1),
    'demo-tx-074', 'demo-sess-074', 'demo-ref-074', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- POWER VINYASA (18 cap; 3 signups, 15 spots left)
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Power Vinyasa';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele semesteret (13 uker)' AND ticket_kind = 'package';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Trine Solberg',  'trine.solberg@gmail.com',  '92113344', 'confirmed', 'paid', 2400, '2026-04-30', 'demo-tx-080', 'demo-sess-080', 'demo-ref-080', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Jon Olsen',      'jon.olsen@gmail.com',      '40887722', 'confirmed', 'paid', 2400, '2026-04-30', 'demo-tx-081', 'demo-sess-081', 'demo-ref-081', NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Camilla Larsen', 'camilla.larsen@gmail.com', '99334477', 'confirmed', 'paid', 2400, '2026-04-30', 'demo-tx-082', 'demo-sess-082', 'demo-ref-082', NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- MANDAGSYOGA FORDYPNING (18 cap; 2 signups, 16 spots left)
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Mandagsyoga Fordypning';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele semesteret (13 uker)' AND ticket_kind = 'package';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Ragnhild Aas',     'ragnhild.aas@gmail.com',     '47221133', 'confirmed', 'paid', 2400, '2026-04-27', 'demo-tx-090', 'demo-sess-090', 'demo-ref-090', NOW() - INTERVAL '78 days', NOW() - INTERVAL '78 days'),
  (v_org, v_course, v_tier, 'Hele semesteret (13 uker)', 'standard', 'package', 'Helene Birkeland', 'helene.birkeland@gmail.com', '92112299', 'confirmed', 'paid', 2400, '2026-04-27', 'demo-tx-091', 'demo-sess-091', 'demo-ref-091', NOW() - INTERVAL '64 days', NOW() - INTERVAL '64 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- ASHTANGA YOGA (samarbeid med VÆR) (25 cap; 4 signups including FAULT 4)
  -- 2 happy + 1 drop-in + 1 cancelled-paid (no refund yet)
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Ashtanga Yoga (samarbeid med VÆR)';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele kurset' AND ticket_kind = 'package';
  SELECT id INTO v_dropin FROM course_signup_packages WHERE course_id = v_course AND ticket_kind = 'drop_in';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Jonas Hansen',  'jonas.hansen@gmail.com',  '99001144', 'confirmed', 'paid', 4500, '2026-05-20', 'demo-tx-100', 'demo-sess-100', 'demo-ref-100', NOW() - INTERVAL '110 days', NOW() - INTERVAL '110 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Petter Strand', 'petter.strand@gmail.com', '40556633', 'confirmed', 'paid', 4500, '2026-05-20', 'demo-tx-101', 'demo-sess-101', 'demo-ref-101', NOW() - INTERVAL '105 days', NOW() - INTERVAL '105 days');

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, course_session_id, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_dropin, 'Drop-in', 'standard', 'drop_in', 'Aksel Lien', 'aksel.lien@gmail.com', '92774411', 'confirmed', 'paid', 280,
    (SELECT id FROM course_sessions WHERE course_id = v_course AND session_date >= CURRENT_DATE - INTERVAL '14 days' ORDER BY session_date LIMIT 1),
    'demo-tx-102', 'demo-sess-102', 'demo-ref-102', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

  -- FAULT 4: cancelled but still paid — admin needs to issue refund
  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Ingrid Olsen', 'ingrid.olsen@gmail.com', '47338822', 'cancelled', 'paid', 4500, '2026-05-20',
    'demo-tx-103', 'demo-sess-103', 'demo-ref-103', NOW() - INTERVAL '95 days', NOW() - INTERVAL '1 day');


  -- ════════════════════════════════════════════════════════════════════════
  -- ASHTANGA YOGA (10 cap; 10 signups → FULL)
  -- Demo state: course shows "Kurset er fullt" on the booking page.
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Ashtanga Yoga';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele kurset' AND ticket_kind = 'package';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Mari Hansen',     'mari.hansen.2@gmail.com',    '99884411', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-110', 'demo-sess-110', 'demo-ref-110', NOW() - INTERVAL '72 days', NOW() - INTERVAL '72 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Marit Hansen',    'marit.hansen@gmail.com',     '92118844', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-111', 'demo-sess-111', 'demo-ref-111', NOW() - INTERVAL '85 days', NOW() - INTERVAL '85 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Sondre Berg',     'sondre.berg@gmail.com',      '40557788', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-112', 'demo-sess-112', 'demo-ref-112', NOW() - INTERVAL '80 days', NOW() - INTERVAL '80 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Hege Aas',        'hege.aas@gmail.com',         '99221177', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-113', 'demo-sess-113', 'demo-ref-113', NOW() - INTERVAL '75 days', NOW() - INTERVAL '75 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Aleksander Lie',  'aleksander.lie@gmail.com',   '47883322', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-114', 'demo-sess-114', 'demo-ref-114', NOW() - INTERVAL '68 days', NOW() - INTERVAL '68 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Kristine Holt',   'kristine.holt@gmail.com',    '92664433', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-115', 'demo-sess-115', 'demo-ref-115', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Nils Hagen',      'nils.hagen@gmail.com',       '40998822', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-116', 'demo-sess-116', 'demo-ref-116', NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Iver Olsen',      'iver.olsen@hotmail.com',     '99445566', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-117', 'demo-sess-117', 'demo-ref-117', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Synnøve Berg',    'synnove.berg@gmail.com',     '92117788', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-118', 'demo-sess-118', 'demo-ref-118', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Jakob Pedersen',  'jakob.pedersen@gmail.com',   '47221199', 'confirmed', 'paid', 2600, '2026-04-29', 'demo-tx-119', 'demo-sess-119', 'demo-ref-119', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- BARSEL YOGA (12 cap; 2 signups)
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Barsel Yoga';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele kurset' AND ticket_kind = 'package';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Linda Berg',    'linda.berg@gmail.com',    '92447799', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-120', 'demo-sess-120', 'demo-ref-120', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Hanna Iversen', 'hanna.iversen@gmail.com', '40119922', 'confirmed', 'paid', 1800, '2026-04-28', 'demo-tx-121', 'demo-sess-121', 'demo-ref-121', NOW() - INTERVAL '54 days', NOW() - INTERVAL '54 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- GRAVID YOGA (10 cap; 8 signups → LOW: 2 plasser igjen)
  -- Demo state: course shows the low-spots warning badge on the booking page.
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Gravid Yoga';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Hele kurset' AND ticket_kind = 'package';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Stine Olsen',    'stine.olsen@gmail.com',     '99776644', 'confirmed', 'paid', 2200, '2026-04-30', 'demo-tx-130', 'demo-sess-130', 'demo-ref-130', NOW() - INTERVAL '63 days', NOW() - INTERVAL '63 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Maria Pedersen', 'maria.pedersen@gmail.com',  '47551144', 'confirmed', 'paid', 2200, '2026-04-30', 'demo-tx-131', 'demo-sess-131', 'demo-ref-131', NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Hege Olsen',     'hege.olsen@gmail.com',      '99117755', 'confirmed', 'paid', 2200, '2026-04-30', 'demo-tx-132', 'demo-sess-132', 'demo-ref-132', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Marte Strand',   'marte.strand@gmail.com',    '92885511', 'confirmed', 'paid', 2200, '2026-04-30', 'demo-tx-133', 'demo-sess-133', 'demo-ref-133', NOW() - INTERVAL '58 days', NOW() - INTERVAL '58 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Linda Pedersen', 'linda.pedersen@gmail.com',  '40443377', 'confirmed', 'paid', 2200, '2026-04-30', 'demo-tx-134', 'demo-sess-134', 'demo-ref-134', NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Karin Berg',     'karin.berg@gmail.com',      '47339922', 'confirmed', 'paid', 2200, '2026-04-30', 'demo-tx-135', 'demo-sess-135', 'demo-ref-135', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Anne Olsen',     'anne.olsen@gmail.com',      '92774488', 'confirmed', 'paid', 2200, '2026-04-30', 'demo-tx-136', 'demo-sess-136', 'demo-ref-136', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
  (v_org, v_course, v_tier, 'Hele kurset', 'standard', 'package', 'Tone Vik',       'tone.vik.gravid@gmail.com', '99553311', 'confirmed', 'paid', 2200, '2026-04-30', 'demo-tx-137', 'demo-sess-137', 'demo-ref-137', NOW() - INTERVAL '9 days',  NOW() - INTERVAL '9 days');


  -- ════════════════════════════════════════════════════════════════════════
  -- YIN YOGA WORKSHOP MED RUTH ESTHER (event 2026-05-10; 5 signups)
  -- 4 happy + 1 pending payment (FAULT 5)
  -- ════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_course FROM courses WHERE organization_id = v_org AND title = 'Yin Yoga Workshop med Ruth Esther';
  SELECT id INTO v_tier   FROM course_signup_packages WHERE course_id = v_course AND label = 'Standard' AND ticket_kind = 'package';

  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at) VALUES
  (v_org, v_course, v_tier, 'Standard', 'standard', 'package', 'Sara Andersen', 'sara.andersen@gmail.com', '92883344', 'confirmed', 'paid', 400, '2026-05-10', 'demo-tx-140', 'demo-sess-140', 'demo-ref-140', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  (v_org, v_course, v_tier, 'Standard', 'standard', 'package', 'Ida Vik',       'ida.vik@gmail.com',       '40221177', 'confirmed', 'paid', 400, '2026-05-10', 'demo-tx-141', 'demo-sess-141', 'demo-ref-141', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  (v_org, v_course, v_tier, 'Standard', 'standard', 'package', 'Anna Pedersen', 'anna.pedersen@gmail.com', '99113366', 'confirmed', 'paid', 400, '2026-05-10', 'demo-tx-142', 'demo-sess-142', 'demo-ref-142', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  (v_org, v_course, v_tier, 'Standard', 'standard', 'package', 'Mette Olsen',   'mette.olsen@gmail.com',   '47882244', 'confirmed', 'paid', 400, '2026-05-10', 'demo-tx-143', 'demo-sess-143', 'demo-ref-143', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days');

  -- FAULT 5: pending payment on the workshop
  INSERT INTO signups (organization_id, course_id, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, package_end_date, dintero_transaction_id, dintero_session_id, dintero_merchant_reference, created_at, updated_at)
  VALUES (v_org, v_course, v_tier, 'Standard', 'standard', 'package', 'Tone Larsen', 'tone.larsen@gmail.com', '92556633', 'confirmed', 'pending', NULL, '2026-05-10',
    NULL, 'demo-sess-144', 'demo-ref-144', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');


  -- ─── Done ────────────────────────────────────────────────────────────────
  RAISE NOTICE 'Inserted % signups for org %',
    (SELECT COUNT(*) FROM signups WHERE organization_id = v_org), v_org;
END $$;
