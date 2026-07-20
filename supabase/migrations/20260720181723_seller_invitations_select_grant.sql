-- Follow-up to seller_email_invitations: the prelaunch table-privilege
-- narrowing means new tables get no default grants — RLS policies alone
-- can't authorize reads. SELECT only; all writes stay behind the
-- SECURITY DEFINER RPCs (and service role).
GRANT SELECT ON public.seller_invitations TO authenticated;
