-- ============================================
-- EASE TEST DATA SEED SCRIPT
-- ============================================
-- Run this against your Supabase database to create
-- realistic test data for all course/signup scenarios.
--
-- BEFORE RUNNING: Replace YOUR_USER_ID with your actual
-- value from the database (profiles.id).
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
  c_almost_full UUID := uuid_generate_v4();
  c_expensive UUID := uuid_generate_v4();
  c_no_location UUID := uuid_generate_v4();
  c_long_desc UUID := uuid_generate_v4();
  -- Package IDs
  pkg_full UUID := uuid_generate_v4();
  pkg_half UUID := uuid_generate_v4();
  pkg_exp_full UUID := uuid_generate_v4();
  pkg_exp_half UUID := uuid_generate_v4();
  pkg_exp_single UUID := uuid_generate_v4();
BEGIN
  -- ============================================
  -- LOOK UP YOUR ORG AND USER
  -- ============================================
  v_user_id := '5b9e6705-a7fd-4785-8476-c0eb4ea88ce9'; -- nyvo77@gmail.com

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
  -- Long, detailed description to test expandable text
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_active_full, v_org_id, 'Vinyasa Flow - Mandager',
    'Dynamisk vinyasa-klasse med fokus på pust og flyt. Hver time bygger vi opp sekvenser som kobler bevegelse og åndedrett, og vi jobber med balanse, styrke og fleksibilitet gjennom kreative overganger mellom stillinger.'
    || E'\n\n'
    || 'Timen starter med en kort meditasjon og oppvarming, før vi bygger intensiteten gradvis opp mot en peak-stilling. Deretter runder vi av med nedtrapping, dype strekk og en lang savasana.'
    || E'\n\n'
    || 'Passer for deg som liker bevegelse og ønsker en fysisk utfordrende, men tilgjengelig, yogapraksis. Noen erfaring med yoga er en fordel, men ikke et krav — vi tilbyr modifikasjoner for alle nivåer.',
    'course-series', 'active', 'alle', 'Studio 1, Parkveien 5, Oslo', 'Mandager 18:00-19:15', 75, 3, 2400.00, true, 350.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '28 days'))::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '49 days')::DATE,
    v_user_id,
    '{"audience_level": "ALL_LEVELS", "equipment": "EQUIPMENT_INCLUDED", "arrival_minutes_before": 10, "custom_bullets": ["Gi beskjed om eventuelle skader", "Klær som er behagelige å bevege seg i"]}');

  -- SCENARIO 2: Active course, has available spots - WEDNESDAYS 10:00
  -- Medium description
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_active_available, v_org_id, 'Hatha Yoga - Onsdager',
    'Rolig og grunnleggende hatha-klasse. Perfekt for nybegynnere som vil lære grunnstillingene. Vi går gjennom hver posisjon med tid til å kjenne etter, og fokuserer på korrekt teknikk og pusteøvelser.'
    || E'\n\n'
    || 'Timen avsluttes alltid med dyp avspenning og en kort guidet meditasjon.',
    'course-series', 'active', 'nybegynner', 'Studio 2, Parkveien 5, Oslo', 'Onsdager 10:00-11:00', 60, 12, 1800.00, false, NULL, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '51 days')::DATE,
    v_user_id,
    '{"audience_level": "BEGINNER", "equipment": "BRING_OWN_MAT", "arrival_minutes_before": 5}');

  -- SCENARIO 3: Active course, FULL (4/4 spots taken) - TUESDAYS 06:30
  -- Short, punchy description
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_active_full2, v_org_id, 'Ashtanga Mysore',
    'Tradisjonell Ashtanga Mysore-praksis. Individuell veiledning i ditt eget tempo. Du lærer primærserien steg for steg med personlig oppfølging.',
    'course-series', 'active', 'viderekommen', 'Studio 1, Parkveien 5, Oslo', 'Tirsdager 06:30-08:30', 120, 4, 3200.00, false, NULL, 10,
    (date_trunc('week', CURRENT_DATE - INTERVAL '35 days') + INTERVAL '1 day')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '35 days') + INTERVAL '64 days')::DATE,
    v_user_id,
    '{"audience_level": "INTERMEDIATE", "equipment": "LIMITED_EQUIPMENT", "arrival_minutes_before": 15, "custom_bullets": ["Ta med eget håndkle", "Unngå tung mat 2 timer før"]}');

  -- SCENARIO 4: Upcoming course (not started yet) - FRIDAYS 17:00
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_upcoming, v_org_id, 'Yin Yoga - Nybegynnerkurs',
    'Et rolig og meditativt nybegynnerkurs i yin yoga. Over seks uker lærer du å holde stillinger i lengre tid, slappe av i dype strekk, og bruke pust som verktøy for å roe ned nervesystemet.'
    || E'\n\n'
    || 'Yin yoga komplementerer mer aktive yogaformer ved å jobbe med bindevev, ledd og meridianene i kroppen. Kurset passer for absolutt alle — ingen forkunnskaper er nødvendig.',
    'course-series', 'upcoming', 'nybegynner', 'Studio 2, Parkveien 5, Oslo', 'Fredager 17:00-18:15', 75, 15, 1500.00, 6,
    (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '4 days')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '39 days')::DATE,
    v_user_id,
    '{"audience_level": "BEGINNER", "equipment": "EQUIPMENT_INCLUDED", "arrival_minutes_before": 5, "custom_bullets": ["Ta med varme klær til avspenning"]}');

  -- SCENARIO 5: Draft course (not published) - SATURDAYS 11:00
  -- No practical_info (tests empty state)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id)
  VALUES (c_draft, v_org_id, 'Yoga for Gravide',
    'Tilpasset yoga for gravide i alle trimestere. Fokus på bekkenbunn, pust og avspenning. Trygge modifikasjoner gjennom hele svangerskapet.',
    'course-series', 'draft', 'alle', 'Studio 2, Parkveien 5, Oslo', 'Lørdager 11:00-12:00', 60, 8, 2000.00, 8,
    CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '86 days', v_user_id);

  -- SCENARIO 6: Completed course - WEDNESDAYS 18:00 (far in past)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id)
  VALUES (c_completed, v_org_id, 'Vinyasa Grunnkurs - Forrige Sesong',
    'Grunnkurs i vinyasa flow som ble avsluttet forrige sesong. Kurset dekket solhilsen A og B, stående stillinger, balanse og grunnleggende inversions.',
    'course-series', 'completed', 'nybegynner', 'Studio 1, Parkveien 5, Oslo', 'Onsdager 18:00-19:15', 75, 10, 2200.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '2 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '51 days')::DATE,
    v_user_id);

  -- SCENARIO 7: Cancelled course
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id)
  VALUES (c_cancelled, v_org_id, 'Aerial Yoga Intro',
    'Introduksjonskurs til aerial yoga med silkehengekøyer. Avlyst grunnet for få påmeldinger.',
    'course-series', 'cancelled', 'alle', 'Studio 3, Parkveien 5, Oslo', 'Søndager 14:00-15:30', 90, 8, 2800.00, 6,
    CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '32 days', v_user_id);

  -- SCENARIO 8: Single event (workshop) - SATURDAY 19:00
  -- Long, atmospheric description
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, start_date, end_date, instructor_id, practical_info)
  VALUES (c_event, v_org_id, 'Full Moon Yoga Workshop',
    'Spesiell fullmåne-workshop med meditasjon, pranayama og forsiktig flow under åpen himmel. Vi samles ved solnedgang for å markere fullmånen med en rolig og tilstedeværende praksis.'
    || E'\n\n'
    || 'Kvelden starter med en pranayama-sekvens (pusteøvelser) for å roe ned nervesystemet. Deretter beveger vi oss gjennom en myk, måneinspirerert flow med fokus på hofteåpnere og sidestrekk.'
    || E'\n\n'
    || 'Vi avslutter med yoga nidra — en guidet dyp avspenning der du ligger i savasana i 20 minutter. Ta med matte, teppe og gjerne en pute. Varm te serveres etterpå.',
    'event', 'upcoming', 'alle', 'Friluftshuset, Frognerparken, Oslo', 'Lørdag 19:00-21:00', 120, 25, 450.00,
    (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '5 days')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '5 days')::DATE,
    v_user_id,
    '{"equipment": "BRING_OWN_MAT", "custom_bullets": ["Ta med teppe til avspenning", "Workshopen foregår utendørs — kle deg varmt", "Varm te serveres etter praksis"]}');

  -- SCENARIO 9: Free course (no price) - SUNDAY 10:00
  -- Minimal description (tests short text, no expandable needed)
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, start_date, end_date, instructor_id, practical_info)
  VALUES (c_free, v_org_id, 'Gratis Prøvetime - Hatha',
    'Gratis introduksjonstime for nye elever. Kom og prøv yoga hos oss!',
    'event', 'upcoming', 'alle', 'Studio 1, Parkveien 5, Oslo', 'Søndag 10:00-11:00', 60, 20, NULL,
    (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '6 days')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '6 days')::DATE,
    v_user_id,
    '{"audience_level": "ALL_LEVELS", "equipment": "EQUIPMENT_INCLUDED"}');

  -- SCENARIO 10: Drop-in only course
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, allows_drop_in, drop_in_price, start_date, end_date, instructor_id, practical_info)
  VALUES (c_dropin, v_org_id, 'Open Flow - Drop-in',
    'Åpen vinyasa-klasse for alle nivåer. Kom når det passer deg! Hver time er selvstendig, så du trenger ikke å følge en fast rekke. Innholdet varierer fra uke til uke — noen ganger fokuserer vi på hofteåpnere, andre ganger på ryggrad og skulderpartiet.',
    'course-series', 'active', 'alle', 'Studio 1, Parkveien 5, Oslo', 'Mandager 12:00-13:00', 60, 18, NULL, true, 200.00,
    CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '60 days', v_user_id,
    '{"audience_level": "ALL_LEVELS", "equipment": "BRING_OWN_MAT"}');

  -- SCENARIO 11: Course with payment issues - THURSDAYS 19:30
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_payment_issues, v_org_id, 'Yin & Meditasjon - Torsdager',
    'Dyp yin yoga med guidet meditasjon. Rolig og restorative praksis der vi holder stillinger i 3–5 minutter for å nå dypere lag av bindevev. Timen avsluttes med 15 minutter guidet meditasjon.'
    || E'\n\n'
    || 'Passer for alle, uansett erfaring. Spesielt godt egnet som supplement til mer aktive treningsformer.',
    'course-series', 'active', 'alle', 'Studio 2, Parkveien 5, Oslo', 'Torsdager 19:30-20:45', 75, 8, 2400.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '3 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '52 days')::DATE,
    v_user_id,
    '{"audience_level": "ALL_LEVELS", "equipment": "EQUIPMENT_INCLUDED", "arrival_minutes_before": 5, "custom_bullets": ["Timen foregår hovedsakelig i stillhet"]}');

  -- SCENARIO 12: Almost full course (1 spot left) - TUESDAYS 17:30
  -- Tests the "1 plass igjen" urgency indicator
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_almost_full, v_org_id, 'Yoga Nidra & Avspenning',
    'Yoga Nidra, også kalt «yogisk søvn», er en systematisk avspenningsmetode der du ligger helt stille mens du blir guidet gjennom kroppen, pusten og visualiseringer. Du trenger ikke gjøre noe — bare lytte og la deg synke dypere.'
    || E'\n\n'
    || 'Forskning viser at 30 minutter Yoga Nidra kan gi like dyp hvile som 2 timer søvn. Perfekt for deg som sliter med stress, søvnproblemer, eller bare trenger en pause fra hverdagen.',
    'course-series', 'active', 'alle', 'Studio 2, Parkveien 5, Oslo', 'Tirsdager 17:30-18:30', 60, 6, 1600.00, 6,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '1 day')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '35 days')::DATE,
    v_user_id,
    '{"audience_level": "ALL_LEVELS", "equipment": "EQUIPMENT_INCLUDED", "custom_bullets": ["Ta med teppe og varm genser", "Timen foregår liggende — ta med pute om du ønsker"]}');

  -- SCENARIO 13: Expensive premium course with multiple packages - SATURDAYS 09:00
  -- Tests high price display and package selection
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_expensive, v_org_id, 'Yogalærerutdanning 200t - Modul 1',
    'Første modul av vår 200-timers yogalærerutdanning, sertifisert av Yoga Alliance. Denne intensive modulen dekker grunnleggende anatomi, filosofi, undervisningsmetodikk og personlig praksis.'
    || E'\n\n'
    || 'Over 10 lørdager går vi i dybden på: asana-teknikk og justeringer, pranayama og meditasjon, yogafilosofi (Yoga Sutra, Bhagavad Gita), funksjonell anatomi for yogalærere, undervisningspraksis med tilbakemeldinger, og etikk og profesjonalitet.'
    || E'\n\n'
    || 'Mellom samlingene forventes det selvstudium (ca. 5 timer per uke) inkludert pensumlitteratur, praksislogg og refleksjonsoppgaver. Du får tilgang til et digitalt klasserom med videoer og ressurser.'
    || E'\n\n'
    || 'Kurset passer for deg som ønsker å undervise yoga, eller som vil fordype sin egen praksis. Minimum 1 års regelmessig yogapraksis anbefales.',
    'course-series', 'upcoming', 'viderekommen', 'Storsalen, Kulturhuset, Youngs gate 6, Oslo', 'Lørdager 09:00-16:00', 420, 16, 18500.00, 10,
    (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '5 days')::DATE,
    (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '68 days')::DATE,
    v_user_id,
    '{"audience_level": "INTERMEDIATE", "equipment": "BRING_OWN_MAT", "arrival_minutes_before": 15, "custom_bullets": ["Inkluderer pensum og digitalt klasserom", "Lunsj er ikke inkludert — ta med matpakke"]}');

  -- SCENARIO 14: Course with no location (online) - WEDNESDAYS 20:00
  -- Tests missing location display
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id, practical_info)
  VALUES (c_no_location, v_org_id, 'Kveldsmediasjon Online',
    'Guidet meditasjon hjemmefra. Perfekt måte å avslutte dagen på. Vi bruker teknikker fra mindfulness, yoga nidra og loving-kindness-meditasjon. Zoom-lenke sendes på e-post etter påmelding.',
    'course-series', 'active', 'alle', NULL, 'Onsdager 20:00-20:30', 30, 50, 600.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '51 days')::DATE,
    v_user_id,
    '{"audience_level": "ALL_LEVELS", "custom_bullets": ["Finn et rolig sted hjemme", "Ha gjerne et teppe eller pute tilgjengelig"]}');

  -- SCENARIO 15: Course with very long description (tests expandable/collapse)
  -- Also tests NULL practical_info
  INSERT INTO courses (id, organization_id, title, description, course_type, status, level, location, time_schedule, duration, max_participants, price, total_weeks, start_date, end_date, instructor_id)
  VALUES (c_long_desc, v_org_id, 'Helhetlig Yoga - Kropp, Pust & Sinn',
    'Velkommen til et kurs som utforsker yoga som en helhetlig praksis — ikke bare som fysisk trening, men som et system for å forstå og ta vare på hele deg selv.'
    || E'\n\n'
    || 'Hver uke dykker vi inn i et nytt tema: den første uken fokuserer på grounding og stabilitet gjennom stående stillinger og fotarbeid. Uke to handler om ryggradens bevegelighet — vi utforsker fleksjoner, ekstensjoner, rotasjoner og sidebøyninger. Tredje uke tar for seg pust: vi lærer diafragmatisk pusting, ujjayi, og hvordan pusten påvirker nervesystemet.'
    || E'\n\n'
    || 'I midten av kurset skifter vi fokus til mer subtile praksiser. Vi introduserer pranayama (pusteøvelser) som kapalabhati og nadi shodhana, og begynner å utforske meditasjon — fra enkle oppmerksomhetsøvelser til guidet visualisering.'
    || E'\n\n'
    || 'De siste ukene binder vi alt sammen. Du lærer å bygge din egen hjemmepraksis, tilpasse yoga til din hverdag, og forstå hvordan de ulike elementene — asana, pranayama, meditasjon — henger sammen i den klassiske yogatradisjonen.'
    || E'\n\n'
    || 'Kurset passer for alle nivåer. Har du aldri prøvd yoga før? Perfekt — vi starter fra begynnelsen. Har du praktisert i årevis? Du vil oppdage nye dimensjoner av praksisen din. Undervisningen er inkluderende, utforskende og uten prestasjonsjag.',
    'course-series', 'active', 'alle', 'Studio 1, Parkveien 5, Oslo', 'Torsdager 10:00-11:30', 90, 10, 2200.00, 8,
    (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '3 days')::DATE,
    (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '52 days')::DATE,
    v_user_id);

  -- ============================================
  -- 2. COURSE SESSIONS
  -- ============================================

  -- Sessions for active full course (8 weeks, on week 4) - MONDAYS 18:00
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_active_full, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + (i-1) * INTERVAL '7 days')::DATE,
      '18:00', '19:15',
      CASE WHEN i <= 4 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Sessions for active available course - WEDNESDAYS 10:00
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_active_available, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days' + (i-1) * INTERVAL '7 days')::DATE,
      '10:00', '11:00',
      CASE WHEN i <= 3 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Sessions for full course 2 (10 weeks, on week 5) - TUESDAYS 06:30
  FOR i IN 1..10 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_active_full2, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '35 days') + INTERVAL '1 day' + (i-1) * INTERVAL '7 days')::DATE,
      '06:30', '08:30',
      CASE WHEN i <= 5 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Sessions for upcoming course - FRIDAYS 17:00
  FOR i IN 1..6 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_upcoming, i,
      (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '4 days' + (i-1) * INTERVAL '7 days')::DATE,
      '17:00', '18:15',
      'upcoming'
    );
  END LOOP;

  -- Sessions for completed course (all completed) - WEDNESDAYS 18:00 (far in past)
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_completed, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '90 days') + INTERVAL '2 days' + (i-1) * INTERVAL '7 days')::DATE,
      '18:00', '19:15',
      'completed'
    );
  END LOOP;

  -- Sessions for payment issues course - THURSDAYS 19:30
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_payment_issues, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '3 days' + (i-1) * INTERVAL '7 days')::DATE,
      '19:30', '20:45',
      CASE WHEN i <= 2 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Single session for event - SATURDAY
  INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
  VALUES (c_event, 1, (date_trunc('week', CURRENT_DATE + INTERVAL '14 days') + INTERVAL '5 days')::DATE, '19:00', '21:00', 'upcoming');

  -- Single session for free class - SUNDAY
  INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
  VALUES (c_free, 1, (date_trunc('week', CURRENT_DATE + INTERVAL '7 days') + INTERVAL '6 days')::DATE, '10:00', '11:00', 'upcoming');

  -- Sessions for almost full course - TUESDAYS 17:30
  FOR i IN 1..6 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_almost_full, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '14 days') + INTERVAL '1 day' + (i-1) * INTERVAL '7 days')::DATE,
      '17:30', '18:30',
      CASE WHEN i <= 2 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Sessions for expensive course - SATURDAYS 09:00
  FOR i IN 1..10 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_expensive, i,
      (date_trunc('week', CURRENT_DATE + INTERVAL '21 days') + INTERVAL '5 days' + (i-1) * INTERVAL '7 days')::DATE,
      '09:00', '16:00',
      'upcoming'
    );
  END LOOP;

  -- Sessions for online course - WEDNESDAYS 20:00
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_no_location, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '21 days') + INTERVAL '2 days' + (i-1) * INTERVAL '7 days')::DATE,
      '20:00', '20:30',
      CASE WHEN i <= 3 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- Sessions for long description course - THURSDAYS 10:00
  FOR i IN 1..8 LOOP
    INSERT INTO course_sessions (course_id, session_number, session_date, start_time, end_time, status)
    VALUES (
      c_long_desc, i,
      (date_trunc('week', CURRENT_DATE - INTERVAL '28 days') + INTERVAL '3 days' + (i-1) * INTERVAL '7 days')::DATE,
      '10:00', '11:30',
      CASE WHEN i <= 4 THEN 'completed' ELSE 'upcoming' END
    );
  END LOOP;

  -- ============================================
  -- 3. SIGNUP PACKAGES
  -- ============================================

  -- Packages for Vinyasa (active full)
  INSERT INTO course_signup_packages (id, course_id, weeks, label, price, is_full_course, sort_order)
  VALUES
    (pkg_full, c_active_full, 8, 'Hele kurset (8 uker)', 2400.00, true, 0),
    (pkg_half, c_active_full, 4, 'Halvt kurs (4 uker)', 1400.00, false, 1);

  -- Packages for Yogalærerutdanning (expensive) — 3 tiers
  INSERT INTO course_signup_packages (id, course_id, weeks, label, price, is_full_course, sort_order)
  VALUES
    (pkg_exp_full, c_expensive, 10, 'Full modul (10 samlinger)', 18500.00, true, 0),
    (pkg_exp_half, c_expensive, 5, 'Første halvdel (5 samlinger)', 10500.00, false, 1),
    (pkg_exp_single, c_expensive, 1, 'Enkeltsamling', 2200.00, false, 2);

  -- ============================================
  -- 4. SIGNUPS - ALL SCENARIOS
  -- ============================================

  -- === FULL COURSE (3/3 spots taken) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, participant_phone, status, payment_status, amount_paid, signup_package_id, package_weeks)
  VALUES
    (v_org_id, c_active_full, 'Emma Larsen', 'emma.larsen@example.com', '91234567', 'confirmed', 'paid', 2400.00, pkg_full, 8),
    (v_org_id, c_active_full, 'Sofia Nilsen', 'sofia.nilsen@example.com', '92345678', 'confirmed', 'paid', 2400.00, pkg_full, 8),
    (v_org_id, c_active_full, 'Henrik Olsen', 'henrik.olsen@example.com', '93456789', 'confirmed', 'paid', 1400.00, pkg_half, 4);

  -- === AVAILABLE COURSE (5/12 spots taken, mix of statuses) ===
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

  -- === UPCOMING COURSE (3 pre-signups + 1 cancelled) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_upcoming, 'Live Strand', 'live.strand@example.com', 'confirmed', 'paid', 1500.00),
    (v_org_id, c_upcoming, 'Marius Aas', 'marius.aas@example.com', 'confirmed', 'paid', 1500.00),
    (v_org_id, c_upcoming, 'Silje Lund', 'silje.lund@example.com', 'confirmed', 'paid', 1500.00),
    (v_org_id, c_upcoming, 'Ingrid Holm', 'ingrid.holm@example.com', 'cancelled', 'refunded', 1500.00);

  -- === COMPLETED COURSE (historical data with mixed statuses) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, created_at)
  VALUES
    (v_org_id, c_completed, 'Thomas Vik', 'thomas.vik@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '95 days'),
    (v_org_id, c_completed, 'Anne Brun', 'anne.brun@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '93 days'),
    (v_org_id, c_completed, 'Petter Solberg', 'petter.solberg@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '90 days'),
    (v_org_id, c_completed, 'Maria Sveen', 'maria.sveen@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '90 days'),
    (v_org_id, c_completed, 'Erik Nygaard', 'erik.nygaard@example.com', 'cancelled', 'refunded', 2200.00, NOW() - INTERVAL '89 days'),
    (v_org_id, c_completed, 'Lise Berntsen', 'lise.berntsen@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '88 days'),
    (v_org_id, c_completed, 'Geir Dahl', 'geir.dahl@example.com', 'confirmed', 'paid', 2200.00, NOW() - INTERVAL '87 days');

  -- === CANCELLED COURSE (signups become course_cancelled) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_cancelled, 'Hanna Lie', 'hanna.lie@example.com', 'course_cancelled', 'refunded', 2800.00),
    (v_org_id, c_cancelled, 'Ole Berge', 'ole.berge@example.com', 'course_cancelled', 'refunded', 2800.00);

  -- === EVENT (7 signups + 1 cancelled) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_event, 'Camilla Ruud', 'camilla.ruud@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Fredrik Hauge', 'fredrik.hauge@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Maja Tangen', 'maja.tangen@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Sander Bø', 'sander.bo@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Vilde Enger', 'vilde.enger@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Kristian Fossum', 'kristian.fossum@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Thea Dalen', 'thea.dalen@example.com', 'confirmed', 'paid', 450.00),
    (v_org_id, c_event, 'Mathias Kvarme', 'mathias.kvarme@example.com', 'cancelled', 'refunded', 450.00);

  -- === FREE COURSE (4 signups, confirmed with paid status since free) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status)
  VALUES
    (v_org_id, c_free, 'Oliver Tveit', 'oliver.tveit@example.com', 'confirmed', 'paid'),
    (v_org_id, c_free, 'Selma Aasen', 'selma.aasen@example.com', 'confirmed', 'paid'),
    (v_org_id, c_free, 'Noah Rønning', 'noah.ronning@example.com', 'confirmed', 'paid'),
    (v_org_id, c_free, 'Alma Bakken', 'alma.bakken@example.com', 'confirmed', 'paid');

  -- === DROP-IN COURSE (mix of past and future drop-ins) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, is_drop_in, class_date, class_time)
  VALUES
    (v_org_id, c_dropin, 'Julie Moen', 'julie.moen@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE, '12:00'),
    (v_org_id, c_dropin, 'Andreas Lien', 'andreas.lien@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE, '12:00'),
    (v_org_id, c_dropin, 'Emilie Haugen', 'emilie.haugen@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE - INTERVAL '7 days', '12:00'),
    (v_org_id, c_dropin, 'Markus Strand', 'markus.strand@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE + INTERVAL '2 days', '12:00'),
    (v_org_id, c_dropin, 'Linnea Fossum', 'linnea.fossum@example.com', 'confirmed', 'paid', 200.00, true, CURRENT_DATE - INTERVAL '14 days', '12:00'),
    (v_org_id, c_dropin, 'Oskar Ellingsen', 'oskar.ellingsen@example.com', 'cancelled', 'refunded', 200.00, true, CURRENT_DATE - INTERVAL '7 days', '12:00');

  -- === PAYMENT ISSUES COURSE (mixed payment problems) ===
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

  -- Another paid signup with note
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, note)
  VALUES (v_org_id, c_payment_issues, 'Nikolai Brenna', 'nikolai.brenna@example.com', 'confirmed', 'paid', 2400.00, 'Allergisk mot latex — ikke bruk latexbånd');

  -- === ALMOST FULL COURSE (5/6 spots taken — 1 left) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_almost_full, 'Astrid Borg', 'astrid.borg@example.com', 'confirmed', 'paid', 1600.00),
    (v_org_id, c_almost_full, 'Vegard Kleven', 'vegard.kleven@example.com', 'confirmed', 'paid', 1600.00),
    (v_org_id, c_almost_full, 'Martine Dahl', 'martine.dahl@example.com', 'confirmed', 'paid', 1600.00),
    (v_org_id, c_almost_full, 'Eirik Sunde', 'eirik.sunde@example.com', 'confirmed', 'paid', 1600.00),
    (v_org_id, c_almost_full, 'Frida Ness', 'frida.ness@example.com', 'confirmed', 'paid', 1600.00);

  -- === EXPENSIVE COURSE (4 pre-signups with different packages) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid, signup_package_id, package_weeks, note)
  VALUES
    (v_org_id, c_expensive, 'Kristine Solheim', 'kristine.solheim@example.com', 'confirmed', 'paid', 18500.00, pkg_exp_full, 10, NULL),
    (v_org_id, c_expensive, 'Magnus Iversen', 'magnus.iversen@example.com', 'confirmed', 'paid', 18500.00, pkg_exp_full, 10, 'Erfaren yogalærer, ønsker sertifisering'),
    (v_org_id, c_expensive, 'Hilde Torp', 'hilde.torp@example.com', 'confirmed', 'paid', 10500.00, pkg_exp_half, 5, NULL),
    (v_org_id, c_expensive, 'Rune Arnesen', 'rune.arnesen@example.com', 'confirmed', 'pending', NULL, pkg_exp_full, 10, 'Avventer faktura fra arbeidsgiver');

  -- === ONLINE COURSE (8 signups — popular online) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_no_location, 'Ingvild Tangen', 'ingvild.tangen@example.com', 'confirmed', 'paid', 600.00),
    (v_org_id, c_no_location, 'Håkon Berge', 'hakon.berge@example.com', 'confirmed', 'paid', 600.00),
    (v_org_id, c_no_location, 'Ragnhild Nes', 'ragnhild.nes@example.com', 'confirmed', 'paid', 600.00),
    (v_org_id, c_no_location, 'Sindre Vold', 'sindre.vold@example.com', 'confirmed', 'paid', 600.00),
    (v_org_id, c_no_location, 'Cecilie Strand', 'cecilie.strand@example.com', 'confirmed', 'paid', 600.00),
    (v_org_id, c_no_location, 'Birger Lunde', 'birger.lunde@example.com', 'confirmed', 'paid', 600.00),
    (v_org_id, c_no_location, 'Tone Haug', 'tone.haug@example.com', 'confirmed', 'paid', 600.00),
    (v_org_id, c_no_location, 'Jan Erik Moum', 'janerik.moum@example.com', 'cancelled', 'refunded', 600.00);

  -- === LONG DESCRIPTION COURSE (6 signups — tests mid-capacity) ===
  INSERT INTO signups (organization_id, course_id, participant_name, participant_email, status, payment_status, amount_paid)
  VALUES
    (v_org_id, c_long_desc, 'Berit Sandvik', 'berit.sandvik@example.com', 'confirmed', 'paid', 2200.00),
    (v_org_id, c_long_desc, 'Torbjørn Knutsen', 'torbjorn.knutsen@example.com', 'confirmed', 'paid', 2200.00),
    (v_org_id, c_long_desc, 'Anette Rustad', 'anette.rustad@example.com', 'confirmed', 'paid', 2200.00),
    (v_org_id, c_long_desc, 'Stian Myhre', 'stian.myhre@example.com', 'confirmed', 'paid', 2200.00),
    (v_org_id, c_long_desc, 'Karianne Fjeld', 'karianne.fjeld@example.com', 'confirmed', 'pending', NULL),
    (v_org_id, c_long_desc, 'Per Arne Holmen', 'perarne.holmen@example.com', 'cancelled', 'refunded', 2200.00);

  -- ============================================
  -- 5. CONVERSATIONS & MESSAGES
  -- ============================================

  -- Conversation 1: Unread message from student (urgent feel)
  INSERT INTO conversations (organization_id, guest_email, is_read, created_at, updated_at)
  VALUES (v_org_id, 'emma.larsen@example.com', false, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours');

  INSERT INTO messages (conversation_id, content, is_outgoing, is_read, created_at)
  VALUES
    ((SELECT id FROM conversations WHERE guest_email = 'emma.larsen@example.com' AND organization_id = v_org_id LIMIT 1),
     'Hei! Jeg lurer på om det er mulig å bytte til onsdagsklassen neste uke? Har en jobb-ting som kolliderer med mandagen.',
     false, false, NOW() - INTERVAL '2 hours');

  -- Conversation 2: Back-and-forth (resolved)
  INSERT INTO conversations (organization_id, guest_email, is_read, created_at, updated_at)
  VALUES (v_org_id, 'jonas.berg@example.com', true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day');

  INSERT INTO messages (conversation_id, content, is_outgoing, is_read, created_at)
  VALUES
    ((SELECT id FROM conversations WHERE guest_email = 'jonas.berg@example.com' AND organization_id = v_org_id LIMIT 1),
     'Hei, er det nødvendig å ha med egen matte?', false, true, NOW() - INTERVAL '3 days'),
    ((SELECT id FROM conversations WHERE guest_email = 'jonas.berg@example.com' AND organization_id = v_org_id LIMIT 1),
     'Hei Jonas! Vi har matter tilgjengelig i studioet, men du er velkommen til å ta med egen om du foretrekker det. Vi har også blokker og belter du kan låne.',
     true, true, NOW() - INTERVAL '2 days'),
    ((SELECT id FROM conversations WHERE guest_email = 'jonas.berg@example.com' AND organization_id = v_org_id LIMIT 1),
     'Flott, takk for svar! Gleder meg til å starte.', false, true, NOW() - INTERVAL '1 day');

  -- Conversation 3: Archived conversation (old)
  INSERT INTO conversations (organization_id, guest_email, is_read, archived, created_at, updated_at)
  VALUES (v_org_id, 'thomas.vik@example.com', true, true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days');

  INSERT INTO messages (conversation_id, content, is_outgoing, is_read, created_at)
  VALUES
    ((SELECT id FROM conversations WHERE guest_email = 'thomas.vik@example.com' AND organization_id = v_org_id LIMIT 1),
     'Takk for et fantastisk kurs! Kommer det nye kurs til våren?', false, true, NOW() - INTERVAL '30 days'),
    ((SELECT id FROM conversations WHERE guest_email = 'thomas.vik@example.com' AND organization_id = v_org_id LIMIT 1),
     'Tusen takk Thomas! Ja, vi planlegger nye kurs fra mars. Hold øye med nettsiden — påmelding åpner snart!',
     true, true, NOW() - INTERVAL '28 days');

  -- Conversation 4: Unread — payment question
  INSERT INTO conversations (organization_id, guest_email, is_read, created_at, updated_at)
  VALUES (v_org_id, 'sara.engen@example.com', false, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours');

  INSERT INTO messages (conversation_id, content, is_outgoing, is_read, created_at)
  VALUES
    ((SELECT id FROM conversations WHERE guest_email = 'sara.engen@example.com' AND organization_id = v_org_id LIMIT 1),
     'Hei, jeg prøvde å betale for Yin & Meditasjon men betalingen gikk ikke gjennom. Kan jeg prøve på nytt eller betale via Vipps?',
     false, false, NOW() - INTERVAL '6 hours');

  -- Conversation 5: Multi-message thread (scheduling discussion)
  INSERT INTO conversations (organization_id, guest_email, is_read, created_at, updated_at)
  VALUES (v_org_id, 'astrid.borg@example.com', false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes');

  INSERT INTO messages (conversation_id, content, is_outgoing, is_read, created_at)
  VALUES
    ((SELECT id FROM conversations WHERE guest_email = 'astrid.borg@example.com' AND organization_id = v_org_id LIMIT 1),
     'Hei! Elsker Yoga Nidra-timen. Er det mulig å ha en ekstra time i uken?',
     false, true, NOW() - INTERVAL '1 day'),
    ((SELECT id FROM conversations WHERE guest_email = 'astrid.borg@example.com' AND organization_id = v_org_id LIMIT 1),
     'Hei Astrid! Så hyggelig å høre. Vi vurderer faktisk å legge til en time på torsdager. Ville det passet?',
     true, true, NOW() - INTERVAL '12 hours'),
    ((SELECT id FROM conversations WHERE guest_email = 'astrid.borg@example.com' AND organization_id = v_org_id LIMIT 1),
     'Ja, torsdag hadde vært perfekt! Kjenner minst tre andre som også hadde meldt seg på.',
     false, false, NOW() - INTERVAL '30 minutes');

  RAISE NOTICE '✓ Seed data created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test scenarios created:';
  RAISE NOTICE '  1.  Active + FULL (3/3)           - Vinyasa Flow Mandager (long desc, drop-in)';
  RAISE NOTICE '  2.  Active + available (5/12)      - Hatha Yoga Onsdager (medium desc)';
  RAISE NOTICE '  3.  Active + FULL (4/4)            - Ashtanga Mysore (short desc)';
  RAISE NOTICE '  4.  Upcoming (3+1 cancelled)       - Yin Yoga Nybegynnerkurs';
  RAISE NOTICE '  5.  Draft (not published)          - Yoga for Gravide (no practical info)';
  RAISE NOTICE '  6.  Completed (7 historical)       - Vinyasa Grunnkurs Forrige Sesong';
  RAISE NOTICE '  7.  Cancelled (course_cancelled)   - Aerial Yoga Intro';
  RAISE NOTICE '  8.  Single event (7+1 signups)     - Full Moon Workshop (long desc)';
  RAISE NOTICE '  9.  Free course (no payment)       - Gratis Prøvetime';
  RAISE NOTICE ' 10.  Drop-in only (6 drop-ins)      - Open Flow Drop-in';
  RAISE NOTICE ' 11.  Payment issues (mixed)         - Yin & Meditasjon (notes)';
  RAISE NOTICE ' 12.  Almost full (5/6, 1 left)      - Yoga Nidra & Avspenning';
  RAISE NOTICE ' 13.  Expensive + packages (18500kr)  - Yogalærerutdanning 200t';
  RAISE NOTICE ' 14.  No location (online)           - Kveldsmeditasjon Online';
  RAISE NOTICE ' 15.  Very long description          - Helhetlig Yoga (no practical info)';
  RAISE NOTICE '';
  RAISE NOTICE 'Also created: 5 conversations with messages (2 unread, 1 archived)';

END $$;
