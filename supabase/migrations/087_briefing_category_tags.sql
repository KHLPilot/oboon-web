CREATE TABLE briefing_category_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES briefing_categories(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES briefing_tags(id) ON DELETE CASCADE,
  UNIQUE (category_id, tag_id)
);

ALTER TABLE briefing_category_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefing_category_tags_read_all"
  ON briefing_category_tags FOR SELECT
  USING (true);

CREATE POLICY "briefing_category_tags_admin_write"
  ON briefing_category_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND deleted_at IS NULL
    )
  );
