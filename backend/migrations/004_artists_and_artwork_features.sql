-- Artist assignments, featured ordering, and database-backed image uploads.
CREATE TABLE IF NOT EXISTS artists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS ix_artists_slug ON artists(slug);
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS artist_id INTEGER REFERENCES artists(id) ON DELETE SET NULL;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS artist_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS artist_featured_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS site_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS site_featured_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS image_data BYTEA;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS image_content_type VARCHAR(100);
CREATE INDEX IF NOT EXISTS ix_artworks_artist_id ON artworks(artist_id);
CREATE INDEX IF NOT EXISTS ix_artworks_artist_featured ON artworks(artist_featured);
CREATE INDEX IF NOT EXISTS ix_artworks_site_featured ON artworks(site_featured);
