BEGIN;

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

DROP POLICY IF EXISTS "properties_insert_owner" ON properties;

CREATE POLICY "properties_insert_owner" ON properties
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'agent', 'builder', 'developer')
    )
  );

COMMIT;
