import type { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared helpers for arbitrary-depth category trees (category -> subcategory
// -> sub-subcategory -> ...). `categories.parent_id` already supports any
// depth at the DB level — these just do the in-memory tree-walking that
// `/categorias`, `/categorias/[slug]` and `/search`'s filtering all need.

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

export async function fetchAllCategories(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CategoryNode[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("[categories] Error fetching categories:", error?.message);
    return [];
  }
  return data as CategoryNode[];
}

// Categories barely ever change (an occasional admin edit) but every public
// page that needs the tree — /search, /categorias, /categorias/[slug] — was
// re-fetching the whole table on every single request, a full extra
// Supabase round trip each time. RLS on this table is `USING (true)` (no
// per-user variation), so the result is safe to share across requests.
// unstable_cache (not a hand-rolled in-memory Map) is what actually
// survives across serverless invocations in production, not just a
// long-lived local dev process.
export const getCachedCategories = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("categories")
      .select("id, name, slug, parent_id")
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("[categories] Error fetching categories:", error?.message);
      return [];
    }
    return data as CategoryNode[];
  },
  ["all-categories"],
  { revalidate: 60 }
);

export function buildChildrenMap(
  categories: CategoryNode[]
): Map<string, CategoryNode[]> {
  const map = new Map<string, CategoryNode[]>();
  for (const cat of categories) {
    if (!cat.parent_id) continue;
    const siblings = map.get(cat.parent_id) ?? [];
    siblings.push(cat);
    map.set(cat.parent_id, siblings);
  }
  return map;
}

// Root-first path of ancestors, NOT including the category itself
// (e.g. for "Bebidas" under "Alimentos y Bebidas" this returns just
// [AlimentosYBebidas]) — used to render breadcrumbs.
export function getAncestors(
  categories: CategoryNode[],
  categoryId: string
): CategoryNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path: CategoryNode[] = [];
  let current = byId.get(categoryId);
  while (current?.parent_id) {
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    path.unshift(parent);
    current = parent;
  }
  return path;
}
