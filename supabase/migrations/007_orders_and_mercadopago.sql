-- ------------------------------------------------------------
-- Orders + Mercado Pago seller connection (OAuth)
-- Lets a buyer purchase a listing via Mercado Pago (paid directly
-- into the seller's own MP account, Connect/marketplace style) or
-- via manual bank transfer.
-- ------------------------------------------------------------

CREATE TYPE order_payment_method AS ENUM ('MERCADOPAGO', 'TRANSFER');
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- Public, non-sensitive flag — safe to read alongside the rest of
-- the seller's public profile (already publicly readable).
ALTER TABLE sellers ADD COLUMN mercadopago_connected boolean NOT NULL DEFAULT false;
ALTER TABLE sellers ADD COLUMN bank_cbu text;
ALTER TABLE sellers ADD COLUMN bank_alias text;

-- ------------------------------------------------------------
-- TABLE: seller_mercadopago_accounts
-- Holds OAuth tokens and pending-authorization state. Locked down —
-- RLS is enabled with NO policies, so only the service-role client
-- (used from server-only route handlers) can ever read or write it.
-- ------------------------------------------------------------
CREATE TABLE seller_mercadopago_accounts (
  seller_id                    uuid PRIMARY KEY REFERENCES sellers(id) ON DELETE CASCADE,
  access_token                 text,
  refresh_token                text,
  mp_user_id                   text,
  public_key                   text,
  token_expires_at             timestamptz,
  connected_at                 timestamptz,
  oauth_pending_state          text,
  oauth_pending_code_verifier  text,
  oauth_pending_created_at     timestamptz,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_seller_mercadopago_accounts_updated_at
  BEFORE UPDATE ON seller_mercadopago_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE seller_mercadopago_accounts ENABLE ROW LEVEL SECURITY;
-- No policies: default-deny. Access only via the service-role client.

-- ------------------------------------------------------------
-- TABLE: orders
-- One row per purchase attempt of a listing.
-- ------------------------------------------------------------
CREATE TABLE orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  buyer_id          uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  seller_id         uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount            numeric(14, 2) NOT NULL,
  currency_id       uuid REFERENCES currencies(id) ON DELETE SET NULL,
  payment_method    order_payment_method NOT NULL,
  status            order_status NOT NULL DEFAULT 'PENDING',
  mp_preference_id  text,
  mp_payment_id     text,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_mp_preference_id ON orders(mp_preference_id);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders: buyer can read own"
  ON orders FOR SELECT
  USING (
    buyer_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

CREATE POLICY "orders: seller can read own"
  ON orders FOR SELECT
  USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

CREATE POLICY "orders: buyer can insert own"
  ON orders FOR INSERT
  WITH CHECK (
    buyer_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

-- Lets a seller mark a bank-transfer order as paid once they've
-- verified the transfer manually (there's no webhook for transfers).
-- Mercado Pago orders are never updated by a client — only the
-- webhook (service-role) moves those to PAID.
-- USING requires the order to still be PENDING and WITH CHECK only allows
-- landing on PAID/CANCELLED — this is a one-way confirm/cancel, not a
-- general-purpose "sellers can edit their orders" door.
CREATE POLICY "orders: seller can confirm transfer"
  ON orders FOR UPDATE
  USING (
    payment_method = 'TRANSFER'
    AND status = 'PENDING'
    AND seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    payment_method = 'TRANSFER'
    AND status IN ('PAID', 'CANCELLED')
    AND seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

-- Belt-and-suspenders on top of the policy above: RLS's WITH CHECK only
-- constrains the NEW row, it can't compare against the OLD one — so without
-- this trigger a seller could still rewrite amount/buyer_id/listing_id etc.
-- while satisfying the policy. Lock every column except status/paid_at.
-- Scoped to auth.role() = 'authenticated' only — the service-role client
-- (webhook, order creation) must stay free to set mp_preference_id,
-- mp_payment_id, status and paid_at itself.
CREATE OR REPLACE FUNCTION guard_orders_transfer_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_id       IS DISTINCT FROM OLD.listing_id
    OR NEW.buyer_id        IS DISTINCT FROM OLD.buyer_id
    OR NEW.seller_id       IS DISTINCT FROM OLD.seller_id
    OR NEW.amount          IS DISTINCT FROM OLD.amount
    OR NEW.currency_id     IS DISTINCT FROM OLD.currency_id
    OR NEW.payment_method  IS DISTINCT FROM OLD.payment_method
    OR NEW.mp_preference_id IS DISTINCT FROM OLD.mp_preference_id
    OR NEW.mp_payment_id   IS DISTINCT FROM OLD.mp_payment_id
  THEN
    RAISE EXCEPTION 'Only status and paid_at can be updated by a seller confirming a transfer';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_orders_transfer_confirmation
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (auth.role() = 'authenticated')
  EXECUTE FUNCTION guard_orders_transfer_confirmation();
