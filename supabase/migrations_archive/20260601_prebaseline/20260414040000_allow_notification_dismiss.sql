-- Allow org members to dismiss (resolve) their notifications
CREATE POLICY "Org members can dismiss notifications"
  ON notifications FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );
