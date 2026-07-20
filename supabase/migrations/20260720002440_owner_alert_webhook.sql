-- Slack webhook destination for owner alerts. Preferred over email when set:
-- owner-event-alert and ops-health-alert post to this webhook and only fall
-- back to the owner_alert_email address when it's absent. Like the email, the
-- URL itself is environment data and lives in Vault (`owner_alert_webhook`),
-- inserted via SQL rather than in this file.
create or replace function public.get_owner_alert_webhook()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'owner_alert_webhook'
  limit 1;
$$;

revoke all on function public.get_owner_alert_webhook() from public, anon, authenticated;
grant execute on function public.get_owner_alert_webhook() to service_role;
