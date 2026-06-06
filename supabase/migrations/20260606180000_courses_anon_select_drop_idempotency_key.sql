-- F3.2 — stop anon from reading courses.idempotency_key (an internal course-
-- creation dedupe token with no storefront purpose).
--
-- anon held a TABLE-level SELECT grant on public.courses. Postgres privileges are
-- additive, so a column-level REVOKE would NOT deny the column. Replace the table
-- grant with explicit column grants covering every storefront column EXCEPT
-- idempotency_key. The public storefront/course-detail reads (publicCourses.ts)
-- use explicit column lists and never select idempotency_key, so this is
-- transparent to them. RLS (courses_select_public: status <> 'draft') still
-- applies on top.
--
-- authenticated is intentionally left untouched: the seller course-creation path
-- filters on idempotency_key (services/courses.ts) and the dashboard uses broad
-- selects. Narrowing authenticated is a separate, larger change.
REVOKE SELECT ON public.courses FROM anon;
GRANT SELECT (
  id, seller_id, title, description, status, location, time_schedule, duration,
  max_participants, price, total_weeks, start_date, end_date, instructor_id,
  image_url, created_at, updated_at, slug, format, delivery_mode, instructor_name,
  accepts_late_signups
) ON public.courses TO anon;
