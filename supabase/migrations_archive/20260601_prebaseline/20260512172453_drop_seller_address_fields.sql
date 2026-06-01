-- Drop sellers.address, sellers.postal_code, sellers.city. Booking-platform
-- focus: no UI surface displays these meaningfully. Dintero collects its own
-- billing address via the hosted KYC page. Course-level location stays on
-- courses.location (the actual venue address for that class).
ALTER TABLE public.sellers DROP COLUMN IF EXISTS address;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS postal_code;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS city;
