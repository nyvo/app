-- Owner event alerts: instant email to the platform owner on new bookings,
-- new sellers, and new user accounts.
--
-- Flow: AFTER INSERT triggers below -> owner_alert_post() -> net.http_post to
-- the owner-event-alert edge function (authed with the shared cron_secret,
-- same as the cron jobs) -> plain-text email via Resend.
--
-- The destination address lives in Vault as `owner_alert_email` (inserted via
-- SQL, not in this file — it's environment data, like cron_secret). The edge
-- function reads it through get_owner_alert_email(); an OPS_ALERT_EMAIL
-- function secret, if ever set, takes precedence.
--
-- Every function here is SECURITY DEFINER (Vault + pg_net access regardless
-- of the inserting role) and the trigger bodies swallow all errors: a broken
-- alert must never block a signup, seller creation, or auth registration.
-- pg_net is async (queue table), so the insert path never waits on the HTTP
-- call; a rolled-back transaction also rolls back its queued alert.

-- Owner alert destination, read by the edge functions via service-role RPC.
create or replace function public.get_owner_alert_email()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'owner_alert_email'
  limit 1;
$$;

revoke all on function public.get_owner_alert_email() from public, anon, authenticated;
grant execute on function public.get_owner_alert_email() to service_role;

-- Fire-and-forget POST to the owner-event-alert function. Called only from
-- the trigger functions below; no grants to request-facing roles.
create or replace function public.owner_alert_post(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;
  if secret is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/owner-event-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body := payload,
    timeout_milliseconds := 10000
  );
exception when others then
  null; -- best-effort: never propagate into the caller's transaction
end;
$$;

revoke all on function public.owner_alert_post(jsonb) from public, anon, authenticated;

-- New confirmed booking (covers paid, free, and manual/external signups —
-- signups are only ever inserted as confirmed).
create or replace function public.owner_alert_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  course_title text;
  seller_name text;
begin
  if new.status::text <> 'confirmed' then
    return new;
  end if;
  select title into course_title from public.courses where id = new.course_id;
  select name into seller_name from public.sellers where id = new.seller_id;
  perform public.owner_alert_post(jsonb_build_object(
    'type', 'booking',
    'course_title', course_title,
    'seller_name', seller_name,
    'participant_name', new.participant_name,
    'ticket_label', new.ticket_label_snapshot,
    'amount_paid', new.amount_paid,
    'payment_status', new.payment_status
  ));
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function public.owner_alert_on_signup() from public, anon, authenticated;

drop trigger if exists owner_alert_after_signup_insert on public.signups;
create trigger owner_alert_after_signup_insert
  after insert on public.signups
  for each row execute function public.owner_alert_on_signup();

-- New seller (arrangør) registration.
create or replace function public.owner_alert_on_seller()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owner_alert_post(jsonb_build_object(
    'type', 'new_seller',
    'name', new.name,
    'email', new.email,
    'operating_model', new.operating_model
  ));
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function public.owner_alert_on_seller() from public, anon, authenticated;

drop trigger if exists owner_alert_after_seller_insert on public.sellers;
create trigger owner_alert_after_seller_insert
  after insert on public.sellers
  for each row execute function public.owner_alert_on_seller();

-- New auth account (buyers and sellers alike).
--
-- ACCEPTED RISK: this is a custom trigger on auth.users, which Supabase
-- discourages — a GoTrue schema upgrade could conflict with or drop it.
-- The exception guard means the trigger can never block a registration;
-- the failure mode is silently losing this one alert type, which the
-- new-seller and booking triggers (on public tables) don't share. If it
-- disappears after a platform upgrade, re-create it or move to an Auth Hook.
create or replace function public.owner_alert_on_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.owner_alert_post(jsonb_build_object(
    'type', 'new_user',
    'email', new.email
  ));
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function public.owner_alert_on_auth_user() from public, anon, authenticated;

drop trigger if exists owner_alert_after_user_insert on auth.users;
create trigger owner_alert_after_user_insert
  after insert on auth.users
  for each row execute function public.owner_alert_on_auth_user();
