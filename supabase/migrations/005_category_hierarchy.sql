-- ============================================================
-- Migration 005: Category hierarchy (2 levels)
-- Adds parent_id to categories for subcategories. Deliberately
-- no ON DELETE CASCADE/SET NULL — deleting a category that still
-- has subcategories must fail (FK violation 23503), surfaced by
-- the admin API as a clear error instead of silently cascading.
-- ============================================================

ALTER TABLE categories
  ADD COLUMN parent_id uuid REFERENCES categories(id);
