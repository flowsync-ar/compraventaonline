-- ============================================================
-- Migration 004: Seller account status
-- Adds sellers.status so the admin panel can reflect suspensions
-- without calling the Supabase Auth Admin API on every listing.
-- Source of truth for the ban itself is auth.users (banned_until),
-- managed via supabase.auth.admin.updateUserById from the admin API.
-- ============================================================

CREATE TYPE seller_status AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE sellers
  ADD COLUMN status seller_status NOT NULL DEFAULT 'ACTIVE';
