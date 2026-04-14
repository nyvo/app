-- Fix: recreate RPC with explicit SET search_path to bypass RLS properly
CREATE OR REPLACE FUNCTION get_active_notifications(p_org_id uuid, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  type text,
  reference_id text,
  title text,
  body text,
  link text,
  group_key text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  read_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id, n.organization_id, n.type, n.reference_id,
    n.title, n.body, n.link, n.group_key,
    n.status, n.created_at, n.updated_at, n.resolved_at,
    nr.read_at
  FROM notifications n
  LEFT JOIN notification_reads nr
    ON nr.notification_id = n.id AND nr.user_id = p_user_id
  WHERE n.organization_id = p_org_id
    AND n.status = 'active'
  ORDER BY n.created_at DESC;
END;
$$;
