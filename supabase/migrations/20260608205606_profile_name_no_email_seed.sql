-- Stop seeding profiles.name with the email local-part on signup.
-- An absent provider name now stays NULL, which honestly means "no personal
-- name set" — the account card falls back to the seller/studio name instead of
-- showing a fabricated email prefix like "nyvo77".
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Backfill: null out names that are just the email local-part, so existing
-- accounts stop displaying the fabricated placeholder.
UPDATE public.profiles
SET name = NULL
WHERE name IS NOT NULL
  AND lower(trim(name)) = lower(split_part(email, '@', 1));
