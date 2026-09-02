-- Allow the same display name in different branches (Autos y Motos → Otros
-- and Hogar → Otros). Uniqueness stays per sibling group. Slug remains
-- globally unique (used in /categorias/[slug] and search URLs).

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS categories_root_name_unique
  ON public.categories (lower(name))
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS categories_sibling_name_unique
  ON public.categories (parent_id, lower(name))
  WHERE parent_id IS NOT NULL;
