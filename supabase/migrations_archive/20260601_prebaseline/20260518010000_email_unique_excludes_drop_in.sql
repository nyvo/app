-- The original partial unique index blocks any second confirmed signup for
-- (course_id, email), but the product model allows unlimited drop-in
-- re-purchases — a customer should be able to drop in to the same course
-- multiple times. Without scoping by ticket_kind_snapshot, the second drop-in
-- gets authorized on Dintero and then rejected by create_signup_if_available
-- with unique_violation. The auth is voided, but the buyer's purchase silently
-- fails.
--
-- Replace with an index that only enforces uniqueness for non-drop-in tickets
-- (packages and passes — those are still "one active per course").

drop index if exists public.unique_active_signup_per_course_email;

create unique index unique_active_non_drop_in_signup_per_course_email
  on public.signups (course_id, participant_email)
  where status = 'confirmed' and ticket_kind_snapshot <> 'drop_in';
