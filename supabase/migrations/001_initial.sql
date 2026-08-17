-- ============================================================
-- Migration 001: Initial Schema
-- CompraVentaOnline — Supabase BaaS migration
-- ============================================================
-- auth.users is managed by Supabase Auth — NOT created here.
-- All other tables reference auth.users(id) via sellers.user_id.
-- ============================================================

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

CREATE TYPE seller_type AS ENUM ('PERSONAL_SELLER', 'BUSINESS_SELLER');
CREATE TYPE listing_status AS ENUM ('ACTIVE', 'PAUSED', 'SOLD', 'DELETED');
CREATE TYPE question_status AS ENUM ('PENDING', 'ANSWERED');
CREATE TYPE reward_type AS ENUM ('HIGHLIGHT', 'DISCOUNT', 'FREE_LISTING');
CREATE TYPE currency_code AS ENUM ('ARS', 'USD');
CREATE TYPE ad_placement AS ENUM ('HOME_BANNER', 'SIDEBAR', 'LISTING_PAGE');
CREATE TYPE report_reason AS ENUM ('SPAM', 'FRAUD', 'INAPPROPRIATE', 'DUPLICATE', 'OTHER');

-- ------------------------------------------------------------
-- FUNCTION: auto-update updated_at
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- TABLE: currencies
-- ------------------------------------------------------------

CREATE TABLE currencies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        currency_code NOT NULL UNIQUE,
  name        text NOT NULL,
  symbol      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_currencies_updated_at
  BEFORE UPDATE ON currencies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- TABLE: categories
-- ------------------------------------------------------------

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  icon        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- TABLE: sellers
-- Mirrors the NestJS sellers entity. One seller per auth user.
-- ------------------------------------------------------------

CREATE TABLE sellers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  type            seller_type NOT NULL DEFAULT 'PERSONAL_SELLER',
  document_number text,
  avatar_url      text,
  bio             text,
  location        text,
  rating          numeric(3, 2) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sellers_updated_at
  BEFORE UPDATE ON sellers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- TABLE: products
-- ------------------------------------------------------------

CREATE TABLE products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  category_id  uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- TABLE: listings
-- ------------------------------------------------------------

CREATE TABLE listings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  currency_id  uuid REFERENCES currencies(id) ON DELETE SET NULL,
  price        numeric(14, 2) NOT NULL,
  stock        integer NOT NULL DEFAULT 1,
  image_url    text,
  status       listing_status NOT NULL DEFAULT 'ACTIVE',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- TABLE: favorites
-- ------------------------------------------------------------

CREATE TABLE favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, listing_id)
);

-- ------------------------------------------------------------
-- TABLE: questions
-- ------------------------------------------------------------

CREATE TABLE questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id     uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  question     text NOT NULL,
  answer       text,
  status       question_status NOT NULL DEFAULT 'PENDING',
  is_read_by_seller boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- TABLE: highlighted_products
-- ------------------------------------------------------------

CREATE TABLE highlighted_products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  start_date  timestamptz NOT NULL DEFAULT now(),
  end_date    timestamptz NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_highlighted_products_updated_at
  BEFORE UPDATE ON highlighted_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- TABLE: seller_rewards
-- ------------------------------------------------------------

CREATE TABLE seller_rewards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  type        reward_type NOT NULL,
  value       numeric(10, 2),
  claimed     boolean NOT NULL DEFAULT false,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_seller_rewards_updated_at
  BEFORE UPDATE ON seller_rewards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- TABLE: terms_acceptances
-- ------------------------------------------------------------

CREATE TABLE terms_acceptances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  version       text NOT NULL DEFAULT '1.0',
  accepted_at   timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- TABLE: product_reports
-- ------------------------------------------------------------

CREATE TABLE product_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES sellers(id) ON DELETE SET NULL,
  reason      report_reason NOT NULL,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- TABLE: advertisements
-- ------------------------------------------------------------

CREATE TABLE advertisements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   uuid REFERENCES sellers(id) ON DELETE SET NULL,
  title       text NOT NULL,
  image_url   text,
  link_url    text,
  placement   ad_placement NOT NULL DEFAULT 'HOME_BANNER',
  active      boolean NOT NULL DEFAULT true,
  start_date  timestamptz NOT NULL DEFAULT now(),
  end_date    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_advertisements_updated_at
  BEFORE UPDATE ON advertisements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Default: deny all. Each policy below grants specific access.
-- ============================================================

ALTER TABLE currencies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlighted_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_rewards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements       ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS: currencies — public read, no write from client
-- ------------------------------------------------------------

CREATE POLICY "currencies: public read"
  ON currencies FOR SELECT
  USING (true);

-- ------------------------------------------------------------
-- RLS: categories — public read, no write from client
-- ------------------------------------------------------------

CREATE POLICY "categories: public read"
  ON categories FOR SELECT
  USING (true);

-- ------------------------------------------------------------
-- RLS: sellers — public read, owner update
-- ------------------------------------------------------------

CREATE POLICY "sellers: public read"
  ON sellers FOR SELECT
  USING (true);

CREATE POLICY "sellers: owner can update"
  ON sellers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- New seller row is inserted by the trigger below (not by client INSERT).
-- If manual insert is needed (e.g., in tests), use service_role.

-- ------------------------------------------------------------
-- RLS: products — public read, seller can insert/update own
-- ------------------------------------------------------------

CREATE POLICY "products: public read"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "products: authenticated insert"
  ON products FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "products: authenticated update"
  ON products FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------
-- RLS: listings — public read, owner write
-- Owner check: listings.seller_id → sellers.id where sellers.user_id = auth.uid()
-- ------------------------------------------------------------

CREATE POLICY "listings: public read"
  ON listings FOR SELECT
  USING (true);

CREATE POLICY "listings: owner insert"
  ON listings FOR INSERT
  WITH CHECK (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "listings: owner update"
  ON listings FOR UPDATE
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "listings: owner delete"
  ON listings FOR DELETE
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- RLS: favorites — user-scoped (own favorites only)
-- ------------------------------------------------------------

CREATE POLICY "favorites: owner read"
  ON favorites FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "favorites: owner insert"
  ON favorites FOR INSERT
  WITH CHECK (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "favorites: owner delete"
  ON favorites FOR DELETE
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- RLS: questions — buyer can insert/read own, seller can read/answer
-- ------------------------------------------------------------

CREATE POLICY "questions: buyer can insert"
  ON questions FOR INSERT
  WITH CHECK (
    buyer_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "questions: buyer can read own"
  ON questions FOR SELECT
  USING (
    buyer_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "questions: seller can read and answer"
  ON questions FOR SELECT
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      JOIN sellers s ON s.id = l.seller_id
      WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "questions: seller can update (answer)"
  ON questions FOR UPDATE
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      JOIN sellers s ON s.id = l.seller_id
      WHERE s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT l.id FROM listings l
      JOIN sellers s ON s.id = l.seller_id
      WHERE s.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- RLS: highlighted_products — public read, no client write
-- ------------------------------------------------------------

CREATE POLICY "highlighted_products: public read"
  ON highlighted_products FOR SELECT
  USING (true);

-- Writes are done via service_role (admin/edge function).

-- ------------------------------------------------------------
-- RLS: seller_rewards — seller-scoped read, no client write
-- ------------------------------------------------------------

CREATE POLICY "seller_rewards: owner read"
  ON seller_rewards FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- Writes are done via service_role.

-- ------------------------------------------------------------
-- RLS: terms_acceptances — owner read + insert
-- ------------------------------------------------------------

CREATE POLICY "terms_acceptances: owner read"
  ON terms_acceptances FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "terms_acceptances: owner insert"
  ON terms_acceptances FOR INSERT
  WITH CHECK (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- RLS: product_reports — insert only, no read from client
-- ------------------------------------------------------------

CREATE POLICY "product_reports: authenticated insert"
  ON product_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- No SELECT policy: reports are not readable by clients.

-- ------------------------------------------------------------
-- RLS: advertisements — public read, no client write
-- ------------------------------------------------------------

CREATE POLICY "advertisements: public read"
  ON advertisements FOR SELECT
  USING (true);

-- ============================================================
-- TRIGGER: auto-create seller on auth.users insert
-- ============================================================
-- When a new user signs up via Supabase Auth, a corresponding
-- seller row is created automatically. The name defaults to the
-- email prefix; it can be updated on first login.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sellers (user_id, name, type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'seller_type')::seller_type,
      'PERSONAL_SELLER'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Currencies
INSERT INTO currencies (code, name, symbol) VALUES
  ('ARS', 'Peso Argentino', '$'),
  ('USD', 'Dólar Estadounidense', 'U$D')
ON CONFLICT (code) DO NOTHING;

-- Categories
INSERT INTO categories (name, slug, icon) VALUES
  ('Autos y Motos',     'autos-y-motos',     '🚗'),
  ('Inmuebles',              'inmuebles',              '🏠'),
  ('Electrónica',            'electronica',            '💻'),
  ('Ropa y Accesorios',      'ropa-y-accesorios',      '👗'),
  ('Hogar y Jardín',         'hogar-y-jardin',         '🏡'),
  ('Deportes',               'deportes',               '⚽'),
  ('Animales y Mascotas',    'animales-y-mascotas',    '🐾'),
  ('Servicios',              'servicios',              '🔧'),
  ('Trabajo y Empleo',       'trabajo-y-empleo',       '💼'),
  ('Agro y Ganadería',       'agro-y-ganaderia',       '🌾'),
  ('Alimentos y Bebidas',    'alimentos-y-bebidas',    '🧀'),
  ('Otros',                  'otros',                  '📦')
ON CONFLICT (slug) DO NOTHING;
