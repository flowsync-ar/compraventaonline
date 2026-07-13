-- ============================================================
-- Migration 002: Add missing columns
-- Columns referenced in frontend queries but absent from 001.
-- ============================================================

-- Add APPROVED to listing_status enum
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'APPROVED';

-- listings: condition + featured_plan
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS condition  text NOT NULL DEFAULT 'NEW'
                                      CHECK (condition IN ('NEW', 'USED')),
  ADD COLUMN IF NOT EXISTS featured_plan text NOT NULL DEFAULT 'FREE'
                                      CHECK (featured_plan IN ('FREE', 'FEATURED', 'PREMIUM'));

-- products: brand + images
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand  text,
  ADD COLUMN IF NOT EXISTS images text[];

-- sellers: score (0–100) + tier
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 80
                                  CHECK (score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS tier  text NOT NULL DEFAULT 'BRONCE'
                                  CHECK (tier IN ('BRONCE', 'PLATA', 'GOLD', 'PREMIUM'));
