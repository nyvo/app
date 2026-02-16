-- ============================================
-- EASE TEST DATA SEED SCRIPT
-- ============================================
-- Run this against your Supabase database to create
-- realistic test data for all course/signup scenarios.
--
-- BEFORE RUNNING: Replace YOUR_ORG_ID and YOUR_USER_ID
-- with your actual values from the database.
--
-- To find your IDs, run:
--   SELECT id FROM organizations LIMIT 1;
--   SELECT id FROM profiles WHERE email = 'your@email.com';
-- ============================================

-- Set your IDs here (replace these!)
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  -- Course IDs
  c_active_full UUID := uuid_generate_v4();
  c_active_available UUID := uuid_generate_v4();
  c_active_full2 UUID := uuid_generate_v4();
  c_upcoming UUID := uuid_generate_v4();
  c_draft UUID := uuid_generate_v4();
  c_completed UUID := uuid_generate_v4();
  c_cancelled UUID := uuid_generate_v4();
  c_event UUID := uuid_generate_v4();
  c_free UUID := uuid_generate_v4();
  c_dropin UUID := uuid_generate_v4();
  c_payment_issues UUID := uuid_generate_v4();
  -- Package IDs
  pkg_full UUID := uuid_generate_v4();
  pkg_half UUID := uuid_generate_v4();
BEGIN
  -- ============================================
  -- LOOK UP YOUR ORG AND USER
  -- ============================================
  v_user_id := 'd11c3037-8d43-4b63-82f4-a0a7f07f1f39'; -- nyvo77@gmail.com

  SELECT om.organization_id INTO v_org_id
  FROM org_members om
  WHERE om.user_id = v_user_id AND om.role = 'owner'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Could not find organization for user_id %. Make sure you have created an organization.', v_user_id;
  END IF;

  RAISE NOTICE 'Using org_id: %, user_id: %', v_org_id, v_user_id;

  -- ============================================
  -- 1. COURSES - ALL SCENARIOS
  -- ============================================

  -- SCENARIO 1: Active course, FULL (no spots left) - MONDAYS 18:00
  -- practical_info: all fields populated (full test coverage)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, total_weeks, current_week, start_date, end_date, instructor_id, practical_info)
  VALUES (c_active_full, v_org_id, 'Vinyasa Flow - Mandager', 'Dynamisk vinyasa-klasse med fokus på pust og flyt. Passer for deg som liker bevegelse og ønsker å bygge styrke og fleksibilitet.', 'course-series', 'active', 'alle', 'Studio 1, Parkveien 5, Oslo', 'Mandager 18:00-19:15', 75, 3, 2400.00, true, 350.00, 8, 4, (date_trunc('week', CURRENT_DATE - INTERVAL '28 days'))::DATE, (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '49 days')::DATE, v_user_id, '{"audience_level": "ALL_LEVELS", "equipment": "EQUIPMENT_INCLUDED", "arrival_minutes_before": 10, "custom_bullets": ["Gi beskjed om eventuelle skader"]}');

  -- SCENARIO 2: Active course, has available spots - WEDNESDAYS 10:00
  -- practical_info: beginner level + bring own mat (partial info)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, total_weeks, current_week, start_date, end_date, instructor_id, practical_info)
  VALUES (c_active_available, v_org_id, 'Hatha Yoga - Onsdager', 'Rolig og grunnleggende hatha-klasse. Perfekt for nybegynnere som vil lære grunnstillingene.', 'course-series', 'active', 'nybegynner', 'Studio 2, Parkveien 5, Oslo', 'Onsdager 10:00-11:00', 60, 12, 1800.00, false, NULL, 8, 3, (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days')::DATE, (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '51 days')::DATE, v_user_id, '{"audience_level": "BEGINNER", "equipment": "BRING_OWN_MAT"}');

  -- SCENARIO 3: Active course, FULL (4/4 spots taken) - TUESDAYS 06:30
  -- practical_info: intermediate + limited equipment + arrival + custom bullets
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, total_weeks, current_week, start_date, end_date, instructor_id, practical_info)
  VALUES (c_active_full2, v_org_id, 'Ashtanga Mysore', 'Tradisjonell Ashtanga Mysore-praksis. Individuell veiledning i ditt eget tempo.', 'course-series', 'active', 'viderekommen', 'Studio 1, Parkveien 5, Oslo', 'Tirsdager 06:30-08:30', 120, 4, 3200.00, false, NULL, 10, 5, (date_trunc('week', CURRENT_DATE - INTERVAL '35 days') + INTERVAL '1 day')::DATE, (date_trunc('week', CURRENT_DATE - INTERVAL '35 days') + INTERVAL '64 days')::DATE, v_user_id, '{"audience_level": "INTERMEDIATE", "equipment": "LIMITED_EQUIPMENT", "arrival_minutes_before": 15, "custom_bullets": ["Ta med eget håndkle", "Unngå tung mat 2 timer før"]}');

  -- SCENARIO 4: Upcoming course (not started yet) - FRIDAYS 17:00
  -- practical_info: beginner + equipment included + arrival (no custom bullets)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_upcoming, v_org_id, 'Yin Yoga - Nybegynnerkurs', 'Et rolig og meditativt nybegynnerkurs i yin yoga. Lær å slappe av og strekke dypt.', 'course-series', 'upcoming', 'nybegynner', 'Studio 2, Parkveien 5, Oslo', 'Fredager 17:00-18:15', 75, 15, 1500.00, 6, (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '4 days')::DATE, (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '39 days')::DATE, v_user_id, '{"audience_level": "BEGINNER", "equipment": "EQUIPMENT_INCLUDED", "arrival_minutes_before": 5}');

  -- SCENARIO 5: Draft course (not published) - SATURDAYS 11:00
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id)
  VALUES (c_draft, v_org_id, 'Yoga for Gravide', 'Tilpasset yoga for gravide i alle trimestere.', 'course-series', 'draft', 'alle', 'Studio 2, Parkveien 5, Oslo', 'Lørdager 11:00-12:00', 60, 8, 2000.00, 8, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '86 days', v_user_id);

  -- SCENARIO 6: Completed course - WEDNESDAYS 18:00 (far in past)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, current_week, start_date, end_date, instructor_id)
  VALUES (c_completed, v_org_id, 'Vinyasa Grunnkurs - Forrige Sesong', 'Grunnkurs i vinyasa flow som ble avsluttet forrige sesong.', 'course-series', 'completed', 'nybegynner', 'Studio 1, Parkveien 5, Oslo', 'Onsdager 18:00-19:15', 75, 10, 2200.00, 8, 8, (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '2 days')::DATE, (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '51 days')::DATE, v_user_id);

  -- SCENARIO 7: Cancelled course
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id)
  VALUES (c_cancelled, v_org_id, 'Aerial Yoga Intro', 'Introduksjonskurs til aerial yoga. Avlyst grunnet for få påmeldinger.', 'course-series', 'cancelled', 'alle', 'Studio 3, Parkveien 5, Oslo', 'Søndager 14:00-15:30', 90, 8, 2800.00, 6, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '32 days', v_user_id);

  -- SCENARIO 8: Single event (not course-series) - SATURDAY 19:00
  -- practical_info: bring own mat + custom bullets only (no level/arrival)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, start_date, end_date, instructor_id, practical_info)
  VALUES (c_event, v_org_id, 'Full Moon Yoga Workshop', 'Spesiell fullmåne-workshop med meditasjon, pranayama og forsiktig flow. Ta med matte og teppe.', 'event', 'upcoming', 'alle', 'Friluftshuset, Frognerparken, Oslo', 'Lørdag 19:00-21:00', 120, 25, 450.00, (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '5 days')::DATE, (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '5 days')::DATE, v_user_id, '{"equipment": "BRING_OWN_MAT", "custom_bullets": ["Ta med teppe til avspenning", "Workshopen foregår utendoors"]}');

  -- SCENARIO 9: Free course (no price) - SUNDAY 10:00
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, start_date, end_date, instructor_id)
  VALUES (c_free, v_org_id, 'Gratis Prøvetime - Hatha', 'Gratis introduksjonstime for nye elever. Kom og prøv yoga hos oss!', 'event', 'upcoming', 'alle', 'Studio 1, Parkveien 5, Oslo', 'Søndag 10:00-11:00', 60, 20, NULL, (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '6 days')::DATE, (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '6 days')::DATE, v_user_id);

  -- SCENARIO 10: Drop-in only course - no sessions generated (drop-in based)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, start_date, end_date, instructor_id)
  VALUES (c_dropin, v_org_id, 'Open Flow - Drop-in', 'Åpen vinyasa-klasse for alle nivåer. Kom når det passer deg!', 'course-series', 'active', 'alle', 'Studio 1, Parkveien 5, Oslo', 'Mandager 12:00-13:00', 60, 18, NULL, true, 200.00, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '60 days', v_user_id);

  -- SCENARIO 11: Course with payment issues - THURSDAYS 19:30
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, current_week, start_date, end_date, instructor_id)
  VALUES (c_payment_issues, v_org_id, 'Yin & Meditasjon - Torsdager', 'Dyp yin yoga med guidet meditasjon. Rolig og restorative.', 'course-series', 'active', 'alle', 'Studio 2, Parkveien 5, Oslo', 'Torsdager 19:30-20:45', 75, 8, 2400.00, 8, 2, (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '3 days')::DATE, (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '52 days')::DATE, v_user_id);

  -- ============================================
  -- 3. COURSE SESSIONS
  -- ============================================
  -- Each course is pinned to a specific weekday to avoid conflicts.
  -- We use date_trunc('week', ...) which gives Monday, then add days:
  --   +0 = Monday, +1 = Tuesday, +2 = Wednesday, +3 = Thursday,
  --   +4 = Friday, +5 = Saturday, +6 = Sunday
  --
  -- Course weekday assignments:
  --   Vinyasa (active full)    → Monday    18:00-19:15
  --   Hatha (active available) → Wednesday 10:00-11:00
  --   Ashtanga (full)          → Tuesday   06:30-08:30
  --   Yin upcoming             → Friday    17:00-18:15
  --   Completed Vinyasa        → Wednesday 18:00-19:15 (in the past, no overlap)
  --   Payment issues (Yin)     → Thursday  19:30-20:45
  --   Event                    → Saturday  19:00-21:00
  --   Free class               → Sunday    10:00-11:00

  -- Helper: get the Monday of the current week
  -- In PostgreSQL, date_trunc('week', ...) returns Monday

  -- Sessions for active full course (8 weeks, on week 4) - MONDAYS 18:00
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_active_full,
      i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + (i-1) * INTERVAL '7 days')::DATE,
      '18:00',
      '19:15',
      CASE WHEN i <= 4 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Sessions for active available course - WEDNESDAYS 10:00
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_active_available,
      i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days' + (i-1) * INTERVAL '7 days')::DATE,
      '10:00',
      '11:00',
      CASE WHEN i <= 3 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Sessions for full course 2 (10 weeks, on week 5) - TUESDAYS 06:30
  FOR i IN 1..10 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_active_full2,
      i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '35 days') + INTERVAL '1 day' + (i-1) * INTERVAL '7 days')::DATE,
      '06:30',
      '08:30',
      CASE WHEN i <= 5 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Sessions for upcoming course - FRIDAYS 17:00
  FOR i IN 1..6 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_upcoming,
      i,
      (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '4 days' + (i-1) * INTERVAL '7 days')::DATE,
      '17:00',
      '18:15',
      'upcoming'
    );
  END LOOP;

  -- Sessions for completed course (all completed) - WEDNESDAYS 18:00 (far in past, no conflict)
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_completed,
      i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '2 days' + (i-1) * INTERVAL '7 days')::DATE,
      '18:00',
      '19:15',
      'completed'
    );
  END LOOP;

  -- Sessions for payment issues course - THURSDAYS 19:30
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_payment_issues,
      i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '3 days' + (i-1) * INTERVAL '7 days')::DATE,
      '19:30',
      '20:45',
      CASE WHEN i <= 2 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Single session for event - SATURDAY
  INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
  VALUES (c_event, 1, (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '5 days')::DATE, '19:00', '21:00', 'upcoming');

  -- Single session for free class - SUNDAY
  INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
  VALUES (c_free, 1, (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '6 days')::DATE, '10:00', '11:00', 'upcoming');

  -- ============================================
  -- 4. SIGNUP PACKAGES (for courses with packages)
  -- ============================================
  INSERT INTO course_signup_packages (id, course_id, weeks, label, price, is_full_course, sort_order)
  VALUES
    (pkg_full, c_active_full, 8, 'Hele kurset (8 uker)', 2400.00, true, 0),
    (pkg_half, c_active_full, 4, 'Halvt kurs (4 uker)', 1400.00, false, 1);

  -- ============================================
  -- 5. SIGNUPS - ALL SCENARIOS
  -- ============================================

  -- === FULL COURSE (3/3 spots taken) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, signup_package_id, package_weeks)
  VALUES
    (v_org_id, c_active_full, 'Emma Larsen', 'emma.larsen@example.com', '91234567', 'confirmed', 'paid', 2400.00, pkg_full, 8),
    (v_org_id, c_active_full, 'Sofia Nilsen', 'sofia.nilsen@example.com', '92345678', 'confirmed', 'paid', 2400.00, pkg_full, 8),
    (v_org_id, c_active_full, 'Henrik Olsen', 'henrik.olsen@example.com', '93456789', 'confirmed', 'paid', 1400.00, pkg_half, 4);

  -- === AVAILABLE COURSE (5/12 spots taken) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, participant_phone, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_active_available, 'Marte Hansen', 'marte.hansen@example.com', '94567890', 'confirmed', 'paid', 1800.00),
    (v_org_id, c_active_available, 'Jonas Berg', 'jonas.berg@example.com', '95678901', 'confirmed', 'paid', 1800.00),
    (v_org_id, c_active_available, 'Ida Johansen', 'ida.johansen@example.com', '96789012', 'confirmed', 'paid', 1800.00),
    (v_org_id, c_active_available, 'Lars Pettersen', 'lars.pettersen@example.com', '97890123', 'confirmed', 'paid', 1800.00),
    (v_org_id, c_active_available, 'Kari Haugen', 'kari.haugen@example.com', '98901234', 'confirmed', 'paid', 1800.00);

  -- === FULL COURSE 2 (4/4 spots taken) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_active_full2, 'Nora Kristiansen', 'nora.k@example.com', 'confirmed', 'paid', 3200.00),
    (v_org_id, c_active_full2, 'Anders Moe', 'anders.moe@example.com', 'confirmed', 'paid', 3200.00),
    (v_org_id, c_active_full2, 'Tuva Eriksen', 'tuva.eriksen@example.com', 'confirmed', 'paid', 3200.00),
    (v_org_id, c_active_full2, 'Oscar Bakke', 'oscar.bakke@example.com', 'confirmed', 'paid', 3200.00);

  -- === UPCOMING COURSE (3 pre-signups) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_upcoming, 'Live Strand', 'live.strand@example.com', 'confirmed', 'paid', 1500.00),
    (v_org_id, c_upcoming, 'Marius Aas', 'marius.aas@example.com', 'confirmed', 'paid', 1500.00),
    (v_org_id, c_upcoming, 'Silje Lund', 'silje.lund@example.com', 'confirmed', 'paid', 1500.00);

  -- === COMPLETED COURSE (historical data) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, registered_at)
  VALUES
    (v_org_id, c_completed, 'Thomas Vik', 'thomas.vik@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '95 days'),
    (v_org_id, c_completed, 'Anne Brun', 'anne.brun@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '93 days'),
    (v_org_id, c_completed, 'Petter Solberg', 'petter.solberg@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '90 days'),
    (v_org_id, c_completed, 'Maria Sveen', 'maria.sveen@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '90 days'),
    (v_org_id, c_completed, 'Erik Nygaard', 'erik.nygaard@example.com', 'cancelled', 'refunded', 2200.00, NOW() - INTERVAL '89 days');

  -- === CANCELLED COURSE (all signups become course_cancelled) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_cancelled, 'Hanna Lie', 'hanna.lie@example.com', 'cancelled', 'refunded', 2800.00),
    (v_org_id, c_cancelled, 'Ole Berge', 'ole.berge@example.com', 'cancelled', 'refunded', 2800.00);

  -- === EVENT (7 signups) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_event, 'Camilla Ruud', 'camilla.ruud@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Fredrik Hauge', 'fredrik.hauge@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Maja Tangen', 'maja.tangen@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Sander Bø', 'sander.bo@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Vilde Enger', 'vilde.enger@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Kristian Fossum', 'kristian.fossum@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Thea Dalen', 'thea.dalen@example.com', 'confirmed', 'paid', 450.00);

  -- === FREE COURSE (4 signups, no payment) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status)
  VALUES
    (v_org_id, c_free, 'Oliver Tveit', 'oliver.tveit@example.com', 'confirmed', 'pending'),
    (v_org_id, c_free, 'Selma Aasen', 'selma.aasen@example.com', 'confirmed', 'pending'),
    (v_org_id, c_free, 'Noah Rønning', 'noah.ronning@example.com', 'confirmed', 'pending'),
    (v_org_id, c_free, 'Alma Bakken', 'alma.bakken@example.com', 'confirmed', 'pending');

  -- === DROP-IN COURSE (mix of drop-ins) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, is_drop_in, class_date, class_time)
  VALUES
    (v_org_id, c_dropin, 'Julie Moen', 'julie.moen@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE, '12:00'),
    (v_org_id, c_dropin, 'Andreas Lien', 'andreas.lien@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE, '12:00'),
    (v_org_id, c_dropin, 'Emilie Haugen', 'emilie.haugen@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE - INTERVAL '7 days', '12:00'),
    (v_org_id, c_dropin, 'Markus Strand', 'markus.strand@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE + INTERVAL '2 days', '12:00');

  -- === PAYMENT ISSUES COURSE (mixed problems) ===
  -- Normal paid signup
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES (v_org_id, c_payment_issues, 'Hedda Finstad', 'hedda.finstad@example.com', 'confirmed', 'paid', 2400.00);

  -- Failed payment
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES (v_org_id, c_payment_issues, 'Tobias Vang', 'tobias.vang@example.com', 'confirmed', 'failed', NULL);

  -- Pending payment (never completed checkout)
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES (v_org_id, c_payment_issues, 'Sara Engen', 'sara.engen@example.com', 'confirmed', 'pending', NULL);

  -- Refunded signup
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES (v_org_id, c_payment_issues, 'Daniel Brekke', 'daniel.brekke@example.com', 'cancelled', 'refunded', 2400.00);

  -- Signup with note from teacher
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, note)
  VALUES (v_org_id, c_payment_issues, 'Emilia Haug', 'emilia.haug@example.com', 'confirmed', 'paid', 2400.00, 'Har skade i høyre skulder - trenger tilpasninger');

  -- ============================================
  -- 6. CONVERSATIONS & MESSAGES
  -- ============================================

  -- Conversation 1: Unread message from student
  INSERT INTO conversations (organization_id, guest_email, is_read, created_at, updated_at)
  VALUES (v_org_id, 'emma.larsen@example.com', false, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours');

  INSERT INTO messages (conversation_id, content, is_outgoing, is_read, created_at)
  VALUES
    ((SELECT id FROM conversations WHERE guest_email = 'emma.larsen@example.com' AND organization_id = v_org_id LIMIT 1), 'Hei! Jeg lurer på om det er mulig å bytte til onsdagsklassen neste uke?', false, false, NOW() - INTERVAL '2 hours');

  -- Conversation 2: Back-and-forth conversation
  INSERT INTO conversations (organization_id, guest_email, is_read, created_at, updated_at)
  VALUES (v_org_id, 'jonas.berg@example.com', true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day');

  INSERT INTO messages (conversation_id, content, is_outgoing, is_read, created_at)
  VALUES
    ((SELECT id FROM conversations WHERE guest_email = 'jonas.berg@example.com' AND organization_id = v_org_id LIMIT 1), 'Hei, er det nødvendig å ha med egen matte?', false, true, NOW() - INTERVAL '3 days'),
    ((SELECT id FROM conversations WHERE guest_email = 'jonas.berg@example.com' AND organization_id = v_org_id LIMIT 1), 'Hei Jonas! Vi har matter tilgjengelig i studioet, men du er velkommen til å ta med egen om du foretrekker det.', true, true, NOW() - INTERVAL '2 days'),
    ((SELECT id FROM conversations WHERE guest_email = 'jonas.berg@example.com' AND organization_id = v_org_id LIMIT 1), 'Flott, takk for svar!', false, true, NOW() - INTERVAL '1 day');

  -- Conversation 3: Archived conversation
  INSERT INTO conversations (organization_id, guest_email, is_read, archived, created_at, updated_at)
  VALUES (v_org_id, 'thomas.vik@example.com', true, true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days');

  INSERT INTO messages (conversation_id, content, is_outgoing, is_read, created_at)
  VALUES
    ((SELECT id FROM conversations WHERE guest_email = 'thomas.vik@example.com' AND organization_id = v_org_id LIMIT 1), 'Takk for et fantastisk kurs! Kommer det nye kurs til våren?', false, true, NOW() - INTERVAL '30 days'),
    ((SELECT id FROM conversations WHERE guest_email = 'thomas.vik@example.com' AND organization_id = v_org_id LIMIT 1), 'Tusen takk Thomas! Ja, nytt kurs starter i februar. Hold øye med nettsiden!', true, true, NOW() - INTERVAL '28 days');

  RAISE NOTICE '✓ Seed data created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test scenarios created:';
  RAISE NOTICE '  1. Active + FULL (3/3)          - Vinyasa Flow - Mandager';
  RAISE NOTICE '  2. Active + available (5/12)     - Hatha Yoga - Onsdager';
  RAISE NOTICE '  3. Active + FULL (4/4)           - Ashtanga Mysore';
  RAISE NOTICE '  4. Upcoming (3 pre-signups)      - Yin Yoga Nybegynnerkurs';
  RAISE NOTICE '  5. Draft (not published)         - Yoga for Gravide';
  RAISE NOTICE '  6. Completed (historical)        - Vinyasa Grunnkurs Forrige Sesong';
  RAISE NOTICE '  7. Cancelled (refunded)          - Aerial Yoga Intro';
  RAISE NOTICE '  8. Single event (7 signups)      - Full Moon Workshop';
  RAISE NOTICE '  9. Free course (no payment)      - Gratis Prøvetime';
  RAISE NOTICE ' 10. Drop-in only                  - Open Flow Drop-in';
  RAISE NOTICE ' 11. Payment issues (mixed)        - Yin & Meditasjon';
  RAISE NOTICE '';
  RAISE NOTICE 'Also created: 3 conversations with messages';

END $$;
