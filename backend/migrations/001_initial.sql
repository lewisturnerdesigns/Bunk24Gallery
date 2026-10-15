CREATE TABLE IF NOT EXISTS artworks (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url VARCHAR(1000) NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_artworks_slug ON artworks(slug);
CREATE INDEX IF NOT EXISTS ix_artworks_published ON artworks(published);

CREATE TABLE IF NOT EXISTS print_variants (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  sku VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  inventory_quantity INTEGER NOT NULL DEFAULT 0 CHECK (inventory_quantity >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS ix_print_variants_artwork_id ON print_variants(artwork_id);
CREATE INDEX IF NOT EXISTS ix_print_variants_sku ON print_variants(sku);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  stripe_session_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES print_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
);
CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items(order_id);
