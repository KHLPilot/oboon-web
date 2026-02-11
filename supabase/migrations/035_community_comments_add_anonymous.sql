ALTER TABLE community_comments
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE community_comments
ADD COLUMN IF NOT EXISTS anonymous_nickname VARCHAR(50);
