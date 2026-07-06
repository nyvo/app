-- Length caps on user-supplied text ingress columns (audit P2-27).
--
-- None of the buyer/course text columns had length limits, so a member INSERT
-- or a guest checkout could store multi-MB payloads (a storage/DoS vector and
-- an email-rendering hazard). Caps are generous — well above any legitimate
-- value (verified: current maxima are name 35, email 363, note 44, title 35,
-- description 363) — so they only bite abusive payloads. Email cap follows the
-- RFC 5321 practical maximum (320).
ALTER TABLE public.signups
  ADD CONSTRAINT signups_participant_name_len   CHECK (char_length(participant_name)  <= 200),
  ADD CONSTRAINT signups_participant_email_len  CHECK (char_length(participant_email) <= 320),
  ADD CONSTRAINT signups_participant_phone_len  CHECK (participant_phone IS NULL OR char_length(participant_phone) <= 50),
  ADD CONSTRAINT signups_note_len               CHECK (note IS NULL OR char_length(note) <= 2000);

ALTER TABLE public.courses
  ADD CONSTRAINT courses_title_len       CHECK (char_length(title) <= 300),
  ADD CONSTRAINT courses_description_len CHECK (description IS NULL OR char_length(description) <= 20000),
  ADD CONSTRAINT courses_location_len    CHECK (location IS NULL OR char_length(location) <= 500);
