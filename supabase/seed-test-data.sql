-- ============================================
-- EASE TEST DATA SEED SCRIPT
-- ============================================
-- Realistic test data covering every course scenario the teacher dashboard
-- needs to render: full / available / draft / completed / cancelled, single
-- vs series, in-person vs online, drop-in tiers, payment exceptions, etc.
--
-- BEFORE RUNNING:
--   1. Replace YOUR_USER_ID below with your auth user id (profiles.id).
--   2. You must already have a seller — sign in once so the welcome flow
--      runs `ensure_seller_for_user` and creates one for you.
--
-- The script is re-runnable: it deletes prior seed rows for your seller
-- (matched by the `seed-` slug prefix) before inserting fresh data.
-- ============================================

DO $$
DECLARE
  v_user_id  UUID;
  v_seller_id UUID;

  -- Course IDs (one per scenario)
  c_series_full        UUID := gen_random_uuid();
  c_series_available   UUID := gen_random_uuid();
  c_series_almost_full UUID := gen_random_uuid();
  c_series_upcoming    UUID := gen_random_uuid();
  c_series_draft       UUID := gen_random_uuid();
  c_series_completed   UUID := gen_random_uuid();
  c_series_cancelled   UUID := gen_random_uuid();
  c_series_dropin      UUID := gen_random_uuid();
  c_series_expensive   UUID := gen_random_uuid();
  c_series_payments    UUID := gen_random_uuid();
  c_series_online      UUID := gen_random_uuid();
  c_series_long_desc   UUID := gen_random_uuid();
  c_single_event       UUID := gen_random_uuid();
  c_single_online      UUID := gen_random_uuid();
  c_single_free        UUID := gen_random_uuid();

  -- Ticket-type IDs (course_signup_packages rows)
  t_full_pkg           UUID := gen_random_uuid();
  t_full_half          UUID := gen_random_uuid();
  t_avail_pkg          UUID := gen_random_uuid();
  t_almost_pkg         UUID := gen_random_uuid();
  t_upcoming_pkg       UUID := gen_random_uuid();
  t_payments_pkg       UUID := gen_random_uuid();
  t_dropin_pkg         UUID := gen_random_uuid();
  t_dropin_drop        UUID := gen_random_uuid();
  t_exp_full           UUID := gen_random_uuid();
  t_exp_half           UUID := gen_random_uuid();
  t_exp_single         UUID := gen_random_uuid();
  t_online_pkg         UUID := gen_random_uuid();
  t_long_pkg           UUID := gen_random_uuid();
  t_completed_pkg      UUID := gen_random_uuid();
  t_cancelled_pkg      UUID := gen_random_uuid();
  t_event_std          UUID := gen_random_uuid();
  t_event_online       UUID := gen_random_uuid();
  t_free_std           UUID := gen_random_uuid();
BEGIN
  -- ============================================
  -- LOOK UP SELLER FOR THE TEST USER
  -- ============================================
  v_user_id := '393f61e1-9e1b-4102-9597-a6dbc406c9b2'; -- nyvo77@gmail.com (post-2026-07 DB reset) — REPLACE

  SELECT sm.seller_id INTO v_seller_id
  FROM public.seller_members sm
  WHERE sm.user_id = v_user_id
  ORDER BY sm.role = 'owner' DESC
  LIMIT 1;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION
      'No seller found for user_id %. Sign in once so ensure_seller_for_user runs.',
      v_user_id;
  END IF;

  RAISE NOTICE 'Seeding for seller_id: %', v_seller_id;

  -- Seed-only: these triggers guard interactive flows, not bulk seeding.
  -- The Stripe publish/price gates block active paid courses for sellers
  -- without onboarding — we seed that state deliberately (checkout renders
  -- its "Påmelding åpner snart" banner). The default-ticket trigger would
  -- duplicate the explicit packages inserted below. All re-enabled at the
  -- end; the DO block is one transaction, so a failure rolls these back too.
  ALTER TABLE public.courses DISABLE TRIGGER enforce_course_publish_requires_payment;
  ALTER TABLE public.courses DISABLE TRIGGER courses_create_default_ticket;
  ALTER TABLE public.course_signup_packages DISABLE TRIGGER enforce_package_price_requires_payment;

  -- ============================================
  -- CLEAN PRIOR SEED ROWS (matched by slug prefix)
  -- ============================================
  -- Order matters: signups → packages → sessions → courses.
  DELETE FROM public.signups
  WHERE course_id IN (
    SELECT id FROM public.courses
    WHERE seller_id = v_seller_id AND slug LIKE 'seed-%'
  );
  DELETE FROM public.course_signup_packages
  WHERE course_id IN (
    SELECT id FROM public.courses
    WHERE seller_id = v_seller_id AND slug LIKE 'seed-%'
  );
  DELETE FROM public.course_sessions
  WHERE course_id IN (
    SELECT id FROM public.courses
    WHERE seller_id = v_seller_id AND slug LIKE 'seed-%'
  );
  DELETE FROM public.courses
  WHERE seller_id = v_seller_id AND slug LIKE 'seed-%';

  -- ============================================
  -- 1. COURSES — all scenarios
  -- ============================================

  -- SCENARIO 1: Active series, FULL (3/3). Mid-run, 8 weeks. Long desc.
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_full, v_seller_id, 'seed-vinyasa-mandager',
    'Vinyasa Flow — Mandager',
    'Dynamisk vinyasa der pust og bevegelse smelter sammen. Passer for deg som har litt erfaring og ønsker styrke, fleksibilitet og fokus.',
    'series', 'in_person', 'active',
    'Studio 1, Parkveien 5, Oslo', 'Mandager 18:00-19:15', 75, 3, 2400.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '28 days'))::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '49 days')::DATE,
    'Kristoffer');

  -- SCENARIO 2: Active series, available (5/12).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_available, v_seller_id, 'seed-hatha-onsdager',
    'Hatha Yoga — Onsdager',
    'Klassisk hatha med fokus på riktig teknikk og kroppskjennskap. Perfekt for nybegynnere.',
    'series', 'in_person', 'active',
    'Studio 2, Parkveien 5, Oslo', 'Onsdager 10:00-11:00', 60, 12, 1800.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '51 days')::DATE,
    'Kristoffer');

  -- SCENARIO 3: Almost full (5/6 — 1 left). Tests low-spots badge.
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_almost_full, v_seller_id, 'seed-yoga-nidra',
    'Yoga Nidra & Avspenning',
    'Dyp avspenning og guidet meditasjon. Liggende praksis — kommer du sliten, går du uthvilt.',
    'series', 'in_person', 'active',
    'Studio 2, Parkveien 5, Oslo', 'Tirsdager 17:30-18:30', 60, 6, 1600.00, 6,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '1 day')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '36 days')::DATE,
    'Kristoffer');

  -- SCENARIO 4: Upcoming series (starts in 2 weeks, 3 pre-signups).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_upcoming, v_seller_id, 'seed-yin-fredager',
    'Yin Yoga — Nybegynnerkurs',
    'Stille, langsom praksis der hver stilling holdes 3–5 minutter. Slipper spenninger i bindevev og fascia.',
    'series', 'in_person', 'upcoming',
    'Studio 2, Parkveien 5, Oslo', 'Fredager 17:00-18:15', 75, 15, 1500.00, 6,
    (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '4 days')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '39 days')::DATE,
    'Kristoffer');

  -- SCENARIO 5: Draft (not published).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_draft, v_seller_id, 'seed-yoga-gravide',
    'Yoga for Gravide',
    'Trygg yoga gjennom svangerskapet. Tilpasset hver trimester.',
    'series', 'in_person', 'draft',
    'Studio 2, Parkveien 5, Oslo', 'Lørdager 11:00-12:00', 60, 8, 2000.00, 8,
    (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '5 days')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '54 days')::DATE,
    'Kristoffer');

  -- SCENARIO 6: Completed (3 months ago).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_completed, v_seller_id, 'seed-vinyasa-vinter',
    'Vinyasa Grunnkurs — Forrige sesong',
    'Dynamisk vinyasa for nybegynnere. Ferdig sesong.',
    'series', 'in_person', 'completed',
    'Studio 1, Parkveien 5, Oslo', 'Onsdager 18:00-19:15', 75, 10, 2200.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '2 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '51 days')::DATE,
    'Kristoffer');

  -- SCENARIO 7: Cancelled (signups become course_cancelled).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_cancelled, v_seller_id, 'seed-aerial-intro',
    'Aerial Yoga Intro',
    'Akrobatisk yoga med silketøy. Avlyst pga. utstyrslevering.',
    'series', 'in_person', 'cancelled',
    'Studio 3, Parkveien 5, Oslo', 'Søndager 14:00-15:30', 90, 8, 2800.00, 6,
    (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '6 days')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '41 days')::DATE,
    'Kristoffer');

  -- SCENARIO 8: Series with drop-in tier available.
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_dropin, v_seller_id, 'seed-lunsj-yoga',
    'Lunsj-yoga — Open Flow',
    'Energigivende lunsjpause. Kan kjøpes som kurs eller drop-in per gang.',
    'series', 'in_person', 'active',
    'Studio 1, Parkveien 5, Oslo', 'Mandager 12:00-13:00', 60, 18, 1400.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days'))::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '49 days')::DATE,
    'Kristoffer');

  -- SCENARIO 9: Expensive series with multiple ticket tiers.
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_expensive, v_seller_id, 'seed-yogalarer-200',
    'Yogalærerutdanning 200t',
    'Yoga Alliance-sertifisert lærerutdanning. 10 helgesamlinger over 5 måneder.',
    'series', 'in_person', 'upcoming',
    'Storsalen, Kulturhuset, Youngs gate 6, Oslo', 'Lørdager 09:00-16:00', 420, 16, 18500.00, 10,
    (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '5 days')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '68 days')::DATE,
    'Kristoffer');

  -- SCENARIO 10: Payment exceptions (failed / pending / refunded mix).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_payments, v_seller_id, 'seed-yin-meditasjon',
    'Yin & Meditasjon',
    'Stille praksis kombinert med guidet meditasjon.',
    'series', 'in_person', 'active',
    'Studio 1, Parkveien 5, Oslo', 'Torsdager 19:30-20:45', 75, 8, 2400.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '3 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '52 days')::DATE,
    'Kristoffer');

  -- SCENARIO 11: Online series — Zoom (no physical location).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_online, v_seller_id, 'seed-kveldsmeditasjon',
    'Kveldsmeditasjon Online',
    'Guidet meditasjon hjemmefra. Zoom-lenke sendes på e-post etter påmelding.',
    'series', 'online', 'active',
    NULL, 'Onsdager 20:00-20:30', 30, 50, 600.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '51 days')::DATE,
    'Kristoffer');

  -- SCENARIO 12: Long-description course (tests collapse/expand).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, total_weeks, start_date, end_date, instructor_name)
  VALUES (c_series_long_desc, v_seller_id, 'seed-helhetlig-yoga',
    'Helhetlig Yoga — Kropp, Pust & Sinn',
    'Et kurs som utforsker yoga som helhetlig praksis. Vi dykker inn i et nytt tema hver uke: grounding og stabilitet, ryggradens bevegelighet, pust og pranayama, meditasjon, og hjemmepraksis.'
    || E'\n\n'
    || 'Kurset passer for alle nivåer. Har du aldri prøvd yoga før? Perfekt — vi starter fra begynnelsen. Har du praktisert i årevis? Du vil oppdage nye dimensjoner av praksisen din.',
    'series', 'in_person', 'active',
    'Studio 1, Parkveien 5, Oslo', 'Torsdager 10:00-11:30', 90, 10, 2200.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '3 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '52 days')::DATE,
    'Kristoffer');

  -- SCENARIO 13: Single in-person event (workshop).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, start_date, end_date, instructor_name)
  VALUES (c_single_event, v_seller_id, 'seed-fullmane-workshop',
    'Full Moon Workshop',
    'En kveld dedikert til fullmånen. Sirkel, intensjonssetting, lett yoga og meditasjon.',
    'single', 'in_person', 'upcoming',
    'Friluftshuset, Frognerparken, Oslo', 'Lørdag 19:00-21:00', 120, 25, 450.00,
    (date_trunc('week', CURRENT_DATE) + INTERVAL '5 days')::DATE,
    (date_trunc('week', CURRENT_DATE) + INTERVAL '5 days')::DATE,
    'Kristoffer');

  -- SCENARIO 14: Single online event (webinar).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, start_date, end_date, instructor_name)
  VALUES (c_single_online, v_seller_id, 'seed-webinar-pust',
    'Pustewebinar — Introduksjon',
    'En times innføring i diafragmatisk pust og nervesystemets respons. Zoom.',
    'single', 'online', 'upcoming',
    NULL, 'Tirsdag 19:00-20:00', 60, 100, 250.00,
    (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '1 day')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '1 day')::DATE,
    'Kristoffer');

  -- SCENARIO 15: Free single event (price 0).
  INSERT INTO public.courses (id, seller_id, slug, title, description,
    format, delivery_mode, status, location, time_schedule, duration,
    max_participants, price, start_date, end_date, instructor_name)
  VALUES (c_single_free, v_seller_id, 'seed-gratis-provetime',
    'Gratis Prøvetime',
    'Kom og prøv! Helt gratis åpen klasse for å bli kjent med studioet og lærerne.',
    'single', 'in_person', 'upcoming',
    'Studio 1, Parkveien 5, Oslo', 'Søndag 10:00-11:00', 60, 20, 0,
    (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE,
    (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE,
    'Kristoffer');

  -- ============================================
  -- 2. COURSE SESSIONS (one row per occurrence)
  -- ============================================

  -- Series helper: insert N weekly sessions starting on given anchor date.
  -- Inline-expanded below for clarity (no helper function inside DO block).

  -- c_series_full — 8 sessions on Mondays, started 4 weeks ago, on week 4
  FOR i IN 1..8 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_full, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + (i-1) * INTERVAL '7 days')::DATE,
      '18:00', '19:15',
      CASE WHEN i <= 4 THEN 'completed' ELSE 'upcoming' END);
  END LOOP;

  -- c_series_available — 8 Wednesdays, on week 3
  FOR i IN 1..8 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_available, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days' + (i-1) * INTERVAL '7 days')::DATE,
      '10:00', '11:00',
      CASE WHEN i <= 3 THEN 'completed' ELSE 'upcoming' END);
  END LOOP;

  -- c_series_almost_full — 6 Tuesdays
  FOR i IN 1..6 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_almost_full, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '1 day' + (i-1) * INTERVAL '7 days')::DATE,
      '17:30', '18:30',
      CASE WHEN i <= 2 THEN 'completed' ELSE 'upcoming' END);
  END LOOP;

  -- c_series_upcoming — 6 Fridays, starts in 2 weeks
  FOR i IN 1..6 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_upcoming, i,
      (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '4 days' + (i-1) * INTERVAL '7 days')::DATE,
      '17:00', '18:15',
      'upcoming');
  END LOOP;

  -- c_series_draft — 8 Saturdays, starts in 3 weeks (matches courses row's
  -- total_weeks/start_date — every other scenario has its session rows).
  FOR i IN 1..8 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_draft, i,
      (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '5 days' + (i-1) * INTERVAL '7 days')::DATE,
      '11:00', '12:00',
      'upcoming');
  END LOOP;

  -- c_series_completed — 8 Wednesdays, all complete
  FOR i IN 1..8 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_completed, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '2 days' + (i-1) * INTERVAL '7 days')::DATE,
      '18:00', '19:15',
      'completed');
  END LOOP;

  -- c_series_dropin — 8 Mondays, mid-run
  FOR i IN 1..8 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_dropin, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + (i-1) * INTERVAL '7 days')::DATE,
      '12:00', '13:00',
      CASE WHEN i <= 2 THEN 'completed' ELSE 'upcoming' END);
  END LOOP;

  -- c_series_expensive — 10 Saturdays, starts in 3 weeks
  FOR i IN 1..10 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_expensive, i,
      (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '5 days' + (i-1) * INTERVAL '7 days')::DATE,
      '09:00', '16:00',
      'upcoming');
  END LOOP;

  -- c_series_payments — 8 Thursdays, on week 2
  FOR i IN 1..8 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_payments, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '3 days' + (i-1) * INTERVAL '7 days')::DATE,
      '19:30', '20:45',
      CASE WHEN i <= 2 THEN 'completed' ELSE 'upcoming' END);
  END LOOP;

  -- c_series_online — 8 Wednesdays
  FOR i IN 1..8 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_online, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days' + (i-1) * INTERVAL '7 days')::DATE,
      '20:00', '20:30',
      CASE WHEN i <= 3 THEN 'completed' ELSE 'upcoming' END);
  END LOOP;

  -- c_series_long_desc — 8 Thursdays
  FOR i IN 1..8 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_long_desc, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '3 days' + (i-1) * INTERVAL '7 days')::DATE,
      '10:00', '11:30',
      CASE WHEN i <= 4 THEN 'completed' ELSE 'upcoming' END);
  END LOOP;

  -- Single events: one session each
  INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status) VALUES
    (c_single_event,  1, (date_trunc('week', CURRENT_DATE) + INTERVAL '5 days')::DATE, '19:00', '21:00', 'upcoming'),
    (c_single_online, 1, (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '1 day')::DATE, '19:00', '20:00', 'upcoming'),
    (c_single_free,   1, (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE, '10:00', '11:00', 'upcoming');

  -- Cancelled course gets sessions too (the row keeps its history)
  FOR i IN 1..6 LOOP
    INSERT INTO public.course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (c_series_cancelled, i,
      (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '6 days' + (i-1) * INTERVAL '7 days')::DATE,
      '14:00', '15:30',
      'cancelled');
  END LOOP;

  -- ============================================
  -- 3. TICKET TYPES (course_signup_packages)
  -- ============================================
  -- Every course needs at least one default ticket. Drop-in courses add a
  -- second `ticket_kind = 'drop_in'` tier. Expensive course shows 3 tiers.

  INSERT INTO public.course_signup_packages (id, course_id, ticket_kind, audience, label, description, price, weeks, is_default, is_active, display_order)
  VALUES
    -- One default "Hele kurset" tier per series course
    (t_full_pkg,     c_series_full,        'package',  'standard', 'Hele kurset (8 uker)',   NULL, 2400.00, 8, true,  true, 0),
    (t_full_half,    c_series_full,        'package',  'standard', 'Halvt kurs (4 uker)',    NULL, 1400.00, 4, false, true, 1),
    (t_avail_pkg,    c_series_available,   'package',  'standard', 'Hele kurset',            NULL, 1800.00, 8, true,  true, 0),
    (t_almost_pkg,   c_series_almost_full, 'package',  'standard', 'Hele kurset',            NULL, 1600.00, 6, true,  true, 0),
    (t_upcoming_pkg, c_series_upcoming,    'package',  'standard', 'Hele kurset',            NULL, 1500.00, 6, true,  true, 0),
    (t_payments_pkg, c_series_payments,    'package',  'standard', 'Hele kurset',            NULL, 2400.00, 8, true,  true, 0),
    (t_online_pkg,    c_series_online,      'package',  'standard', 'Hele kurset',            NULL,  600.00, 8, true,  true, 0),
    (t_long_pkg,      c_series_long_desc,   'package',  'standard', 'Hele kurset',            NULL, 2200.00, 8, true,  true, 0),
    (t_completed_pkg, c_series_completed,   'package',  'standard', 'Hele kurset',            NULL, 2200.00, 8, true,  true, 0),
    (t_cancelled_pkg, c_series_cancelled,   'package',  'standard', 'Hele kurset',            NULL, 2800.00, 6, true,  true, 0),

    -- Series with drop-in: standard package + drop-in tier
    (t_dropin_pkg,   c_series_dropin,      'package',  'standard', 'Hele kurset (8 uker)',   NULL, 1400.00, 8, true,  true, 0),
    (t_dropin_drop,  c_series_dropin,      'drop_in',  'standard', 'Drop-in',     'Betal én gang om gangen', 200.00, NULL, false, true, 1),

    -- Expensive course: 3 tiers
    (t_exp_full,     c_series_expensive,   'package',  'standard', 'Full modul (10 samlinger)', 'Yoga Alliance-sertifikat', 18500.00, 10, true,  true, 0),
    (t_exp_half,     c_series_expensive,   'package',  'standard', 'Første halvdel (5 samlinger)', NULL, 10500.00, 5, false, true, 1),
    (t_exp_single,   c_series_expensive,   'drop_in',  'standard', 'Enkeltsamling',            NULL,  2200.00, NULL, false, true, 2),

    -- Single events
    (t_event_std,    c_single_event,       'package',  'standard', 'Standard',                NULL,  450.00, 1, true, true, 0),
    (t_event_online, c_single_online,      'package',  'standard', 'Standard',                NULL,  250.00, 1, true, true, 0),
    (t_free_std,     c_single_free,        'package',  'standard', 'Gratis',                  NULL,    0,    1, true, true, 0);

  -- ============================================
  -- 4. SIGNUPS — across every status combination
  -- ============================================

  -- c_series_full: 3/3 confirmed paid
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_series_full, 'Emma Larsen',  'emma.larsen@example.com',  '91234567', 'confirmed', 'paid', 2400.00, t_full_pkg,  'Hele kurset (8 uker)', 'standard', 'package'),
    (v_seller_id, c_series_full, 'Sofia Nilsen', 'sofia.nilsen@example.com', '92345678', 'confirmed', 'paid', 2400.00, t_full_pkg,  'Hele kurset (8 uker)', 'standard', 'package'),
    (v_seller_id, c_series_full, 'Henrik Olsen', 'henrik.olsen@example.com', '93456789', 'confirmed', 'paid', 1400.00, t_full_half, 'Halvt kurs (4 uker)',  'standard', 'package');

  -- c_series_available: 5/12 confirmed paid
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_series_available, 'Marte Hansen',    'marte.hansen@example.com',    'confirmed', 'paid', 1800.00, t_avail_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_available, 'Jonas Berg',      'jonas.berg@example.com',      'confirmed', 'paid', 1800.00, t_avail_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_available, 'Ida Johansen',    'ida.johansen@example.com',    'confirmed', 'paid', 1800.00, t_avail_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_available, 'Lars Pettersen',  'lars.pettersen@example.com',  'confirmed', 'paid', 1800.00, t_avail_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_available, 'Kari Haugen',     'kari.haugen@example.com',     'confirmed', 'paid', 1800.00, t_avail_pkg, 'Hele kurset', 'standard', 'package');

  -- c_series_almost_full: 5/6 — one spot left
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_series_almost_full, 'Astrid Borg',    'astrid.borg@example.com',    'confirmed', 'paid', 1600.00, t_almost_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_almost_full, 'Vegard Kleven',  'vegard.kleven@example.com',  'confirmed', 'paid', 1600.00, t_almost_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_almost_full, 'Martine Dahl',   'martine.dahl@example.com',   'confirmed', 'paid', 1600.00, t_almost_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_almost_full, 'Eirik Sunde',    'eirik.sunde@example.com',    'confirmed', 'paid', 1600.00, t_almost_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_almost_full, 'Frida Ness',     'frida.ness@example.com',     'confirmed', 'paid', 1600.00, t_almost_pkg, 'Hele kurset', 'standard', 'package');

  -- c_series_upcoming: 3 pre-signups + 1 cancelled
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, refund_amount, refunded_at, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_series_upcoming, 'Live Strand',   'live.strand@example.com',   'confirmed', 'paid',     1500.00, NULL,    NULL,                  t_upcoming_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_upcoming, 'Marius Aas',    'marius.aas@example.com',    'confirmed', 'paid',     1500.00, NULL,    NULL,                  t_upcoming_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_upcoming, 'Silje Lund',    'silje.lund@example.com',    'confirmed', 'paid',     1500.00, NULL,    NULL,                  t_upcoming_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_upcoming, 'Ingrid Holm',   'ingrid.holm@example.com',   'cancelled', 'refunded', 1500.00, 1500.00, NOW() - INTERVAL '2 days', t_upcoming_pkg, 'Hele kurset', 'standard', 'package');

  -- c_series_completed: historical
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, created_at) VALUES
    (v_seller_id, c_series_completed, 'Thomas Vik',      'thomas.vik@example.com',      'confirmed', 'paid', 2200.00, t_completed_pkg, 'Hele kurset', 'standard', 'package', NOW() - INTERVAL '95 days'),
    (v_seller_id, c_series_completed, 'Anne Brun',       'anne.brun@example.com',       'confirmed', 'paid', 2200.00, t_completed_pkg, 'Hele kurset', 'standard', 'package', NOW() - INTERVAL '93 days'),
    (v_seller_id, c_series_completed, 'Petter Solberg',  'petter.solberg@example.com',  'confirmed', 'paid', 2200.00, t_completed_pkg, 'Hele kurset', 'standard', 'package', NOW() - INTERVAL '90 days'),
    (v_seller_id, c_series_completed, 'Maria Sveen',     'maria.sveen@example.com',     'confirmed', 'paid', 2200.00, t_completed_pkg, 'Hele kurset', 'standard', 'package', NOW() - INTERVAL '90 days'),
    (v_seller_id, c_series_completed, 'Lise Berntsen',   'lise.berntsen@example.com',   'confirmed', 'paid', 2200.00, t_completed_pkg, 'Hele kurset', 'standard', 'package', NOW() - INTERVAL '88 days');

  -- c_series_cancelled: signups become course_cancelled + refunded
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, refund_amount, refunded_at, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_series_cancelled, 'Hanna Lie',  'hanna.lie@example.com',  'course_cancelled', 'refunded', 2800.00, 2800.00, NOW() - INTERVAL '1 day', t_cancelled_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_cancelled, 'Ole Berge',  'ole.berge@example.com',  'course_cancelled', 'refunded', 2800.00, 2800.00, NOW() - INTERVAL '1 day', t_cancelled_pkg, 'Hele kurset', 'standard', 'package');

  -- c_series_dropin: 2 package buyers + 4 drop-ins across sessions
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, course_session_id)
  VALUES
    (v_seller_id, c_series_dropin, 'Selma Aasen',   'selma.aasen@example.com',   'confirmed', 'paid', 1400.00, t_dropin_pkg,  'Hele kurset (8 uker)', 'standard', 'package', NULL),
    (v_seller_id, c_series_dropin, 'Noah Rønning',  'noah.ronning@example.com',  'confirmed', 'paid', 1400.00, t_dropin_pkg,  'Hele kurset (8 uker)', 'standard', 'package', NULL);
  -- Drop-in signups need a course_session_id — pick the first upcoming.
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, course_session_id)
  SELECT
    v_seller_id, c_series_dropin,
    name_email.name, name_email.email,
    'confirmed', 'paid', 200.00, t_dropin_drop, 'Drop-in', 'standard', 'drop_in',
    (SELECT id FROM public.course_sessions WHERE course_id = c_series_dropin AND status = 'upcoming' ORDER BY session_date LIMIT 1)
  FROM (VALUES
    ('Julie Moen',      'julie.moen@example.com'),
    ('Andreas Lien',    'andreas.lien@example.com'),
    ('Markus Strand',   'markus.strand@example.com'),
    ('Linnea Fossum',   'linnea.fossum@example.com')
  ) AS name_email(name, email);

  -- c_series_expensive: 3 paid + 1 pending, across tiers
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, note) VALUES
    (v_seller_id, c_series_expensive, 'Kristine Solheim', 'kristine.solheim@example.com', 'confirmed', 'paid',    18500.00, t_exp_full,  'Full modul (10 samlinger)',     'standard', 'package', NULL),
    (v_seller_id, c_series_expensive, 'Magnus Iversen',   'magnus.iversen@example.com',   'confirmed', 'paid',    18500.00, t_exp_full,  'Full modul (10 samlinger)',     'standard', 'package', 'Erfaren yogalærer, ønsker sertifisering'),
    (v_seller_id, c_series_expensive, 'Hilde Torp',       'hilde.torp@example.com',       'confirmed', 'paid',    10500.00, t_exp_half,  'Første halvdel (5 samlinger)',  'standard', 'package', NULL),
    (v_seller_id, c_series_expensive, 'Rune Arnesen',     'rune.arnesen@example.com',     'confirmed', 'pending', NULL,     t_exp_full,  'Full modul (10 samlinger)',     'standard', 'package', 'Avventer faktura fra arbeidsgiver');

  -- c_series_payments: payment exception zoo
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, refund_amount, refunded_at, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot, note) VALUES
    (v_seller_id, c_series_payments, 'Hedda Finstad',   'hedda.finstad@example.com',   'confirmed', 'paid',     2400.00, NULL,    NULL,                  t_payments_pkg, 'Hele kurset', 'standard', 'package', NULL),
    (v_seller_id, c_series_payments, 'Tobias Vang',     'tobias.vang@example.com',     'confirmed', 'failed',   NULL,    NULL,    NULL,                  t_payments_pkg, 'Hele kurset', 'standard', 'package', NULL),
    (v_seller_id, c_series_payments, 'Sara Engen',      'sara.engen@example.com',      'confirmed', 'pending',  NULL,    NULL,    NULL,                  t_payments_pkg, 'Hele kurset', 'standard', 'package', NULL),
    (v_seller_id, c_series_payments, 'Daniel Brekke',   'daniel.brekke@example.com',   'cancelled', 'refunded', 2400.00, 2400.00, NOW() - INTERVAL '3 days', t_payments_pkg, 'Hele kurset', 'standard', 'package', NULL),
    (v_seller_id, c_series_payments, 'Emilia Haug',     'emilia.haug@example.com',     'confirmed', 'paid',     2400.00, NULL,    NULL,                  t_payments_pkg, 'Hele kurset', 'standard', 'package', 'Skade i høyre skulder — trenger tilpasninger'),
    (v_seller_id, c_series_payments, 'Nikolai Brenna',  'nikolai.brenna@example.com',  'confirmed', 'paid',     2400.00, NULL,    NULL,                  t_payments_pkg, 'Hele kurset', 'standard', 'package', 'Allergisk mot latex');

  -- c_series_online: 7 confirmed + 1 cancelled
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, refund_amount, refunded_at, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_series_online, 'Ingvild Tangen',  'ingvild.tangen@example.com',  'confirmed', 'paid',     600.00, NULL,   NULL,                  t_online_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_online, 'Håkon Berge',     'hakon.berge@example.com',     'confirmed', 'paid',     600.00, NULL,   NULL,                  t_online_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_online, 'Ragnhild Nes',    'ragnhild.nes@example.com',    'confirmed', 'paid',     600.00, NULL,   NULL,                  t_online_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_online, 'Sindre Vold',     'sindre.vold@example.com',     'confirmed', 'paid',     600.00, NULL,   NULL,                  t_online_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_online, 'Cecilie Strand',  'cecilie.strand@example.com',  'confirmed', 'paid',     600.00, NULL,   NULL,                  t_online_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_online, 'Birger Lunde',    'birger.lunde@example.com',    'confirmed', 'paid',     600.00, NULL,   NULL,                  t_online_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_online, 'Tone Haug',       'tone.haug@example.com',       'confirmed', 'paid',     600.00, NULL,   NULL,                  t_online_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_online, 'Jan Erik Moum',   'janerik.moum@example.com',    'cancelled', 'refunded', 600.00, 600.00, NOW() - INTERVAL '5 days', t_online_pkg, 'Hele kurset', 'standard', 'package');

  -- c_series_long_desc: mid-capacity
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, refund_amount, refunded_at, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_series_long_desc, 'Berit Sandvik',      'berit.sandvik@example.com',      'confirmed', 'paid',     2200.00, NULL,    NULL,                  t_long_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_long_desc, 'Torbjørn Knutsen',   'torbjorn.knutsen@example.com',   'confirmed', 'paid',     2200.00, NULL,    NULL,                  t_long_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_long_desc, 'Anette Rustad',      'anette.rustad@example.com',      'confirmed', 'paid',     2200.00, NULL,    NULL,                  t_long_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_long_desc, 'Stian Myhre',        'stian.myhre@example.com',        'confirmed', 'paid',     2200.00, NULL,    NULL,                  t_long_pkg, 'Hele kurset', 'standard', 'package'),
    (v_seller_id, c_series_long_desc, 'Karianne Fjeld',     'karianne.fjeld@example.com',     'cancelled', 'refunded', 2200.00, 2200.00, NOW() - INTERVAL '7 days', t_long_pkg, 'Hele kurset', 'standard', 'package');

  -- c_single_event: 7 confirmed + 1 cancelled
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, refund_amount, refunded_at, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_single_event, 'Camilla Ruud',      'camilla.ruud@example.com',      'confirmed', 'paid',     450.00, NULL,   NULL,                  t_event_std, 'Standard', 'standard', 'package'),
    (v_seller_id, c_single_event, 'Fredrik Hauge',     'fredrik.hauge@example.com',     'confirmed', 'paid',     450.00, NULL,   NULL,                  t_event_std, 'Standard', 'standard', 'package'),
    (v_seller_id, c_single_event, 'Maja Tangen',       'maja.tangen@example.com',       'confirmed', 'paid',     450.00, NULL,   NULL,                  t_event_std, 'Standard', 'standard', 'package'),
    (v_seller_id, c_single_event, 'Sander Bø',         'sander.bo@example.com',         'confirmed', 'paid',     450.00, NULL,   NULL,                  t_event_std, 'Standard', 'standard', 'package'),
    (v_seller_id, c_single_event, 'Vilde Enger',       'vilde.enger@example.com',       'confirmed', 'paid',     450.00, NULL,   NULL,                  t_event_std, 'Standard', 'standard', 'package'),
    (v_seller_id, c_single_event, 'Kristian Fossum',   'kristian.fossum@example.com',   'confirmed', 'paid',     450.00, NULL,   NULL,                  t_event_std, 'Standard', 'standard', 'package'),
    (v_seller_id, c_single_event, 'Thea Dalen',        'thea.dalen@example.com',        'confirmed', 'paid',     450.00, NULL,   NULL,                  t_event_std, 'Standard', 'standard', 'package'),
    (v_seller_id, c_single_event, 'Mathias Kvarme',    'mathias.kvarme@example.com',    'cancelled', 'refunded', 450.00, 450.00, NOW() - INTERVAL '1 day', t_event_std, 'Standard', 'standard', 'package');

  -- c_single_online: 12 signups (popular webinar)
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot)
  SELECT
    v_seller_id, c_single_online, name_email.name, name_email.email,
    'confirmed', 'paid', 250.00, t_event_online, 'Standard', 'standard', 'package'
  FROM (VALUES
    ('Ada Eriksen',    'ada.eriksen@example.com'),
    ('Bjørn Solli',    'bjorn.solli@example.com'),
    ('Cecilia Aas',    'cecilia.aas@example.com'),
    ('David Lie',      'david.lie@example.com'),
    ('Eli Tangen',     'eli.tangen@example.com'),
    ('Filip Berg',     'filip.berg@example.com'),
    ('Greta Holm',     'greta.holm@example.com'),
    ('Halvor Vik',     'halvor.vik@example.com'),
    ('Iben Strand',    'iben.strand@example.com'),
    ('Jens Lund',      'jens.lund@example.com'),
    ('Kira Brun',      'kira.brun@example.com'),
    ('Leo Moe',        'leo.moe@example.com')
  ) AS name_email(name, email);

  -- c_single_free: 4 confirmed (free → "paid" at 0)
  INSERT INTO public.signups (seller_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot) VALUES
    (v_seller_id, c_single_free, 'Oliver Tveit',  'oliver.tveit@example.com',  'confirmed', 'paid', 0, t_free_std, 'Gratis', 'standard', 'package'),
    (v_seller_id, c_single_free, 'Selma Bakken',  'selma.bakken@example.com',  'confirmed', 'paid', 0, t_free_std, 'Gratis', 'standard', 'package'),
    (v_seller_id, c_single_free, 'Noah Holmen',   'noah.holmen@example.com',   'confirmed', 'paid', 0, t_free_std, 'Gratis', 'standard', 'package'),
    (v_seller_id, c_single_free, 'Alma Solheim',  'alma.solheim@example.com',  'confirmed', 'paid', 0, t_free_std, 'Gratis', 'standard', 'package');

  -- Instructor variety — the storefront's instructor filter only renders
  -- when the studio has 2+ distinct instructor names.
  UPDATE public.courses SET instructor_name = 'Maren Berg'
  WHERE seller_id = v_seller_id
    AND slug IN ('seed-hatha-onsdager', 'seed-yin-fredager', 'seed-kveldsmeditasjon');
  UPDATE public.courses SET instructor_name = 'Silje Rud'
  WHERE seller_id = v_seller_id
    AND slug IN ('seed-yoga-nidra', 'seed-webinar-pust');

  ALTER TABLE public.courses ENABLE TRIGGER enforce_course_publish_requires_payment;
  ALTER TABLE public.courses ENABLE TRIGGER courses_create_default_ticket;
  ALTER TABLE public.course_signup_packages ENABLE TRIGGER enforce_package_price_requires_payment;

  -- ============================================
  -- DONE
  -- ============================================
  RAISE NOTICE '✓ Seed data created successfully';
  RAISE NOTICE 'Courses: 15 (12 series + 3 single)';
  RAISE NOTICE 'Delivery mix: 13 in_person + 2 online';
  RAISE NOTICE 'Status mix: active / upcoming / draft / completed / cancelled';
END $$;
