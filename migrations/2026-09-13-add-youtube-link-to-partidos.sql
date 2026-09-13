ALTER TABLE IF EXISTS partidos
  ADD COLUMN IF NOT EXISTS youtube_link TEXT;

CREATE INDEX IF NOT EXISTS idx_partidos_youtube_link
  ON partidos (youtube_link);
