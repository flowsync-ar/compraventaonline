import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

// Enforces a 2-level category hierarchy: a category can only become a
// subcategory of a root category (parent_id IS NULL), never of another
// subcategory, and a category that already has children can't itself
// become a subcategory (would create a 3rd level).
export async function validateParentId(
  admin: SupabaseClient<Database>,
  parentId: string | null | undefined,
  currentId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!parentId) return { ok: true }

  if (parentId === currentId) {
    return { ok: false, error: "Una categoría no puede ser su propia categoría padre." }
  }

  const { data: parent, error: parentError } = await admin
    .from("categories")
    .select("id, parent_id")
    .eq("id", parentId)
    .single()

  if (parentError || !parent) {
    return { ok: false, error: "La categoría padre seleccionada no existe." }
  }
  if (parent.parent_id) {
    return { ok: false, error: "No se puede colgar de una subcategoría (máximo 2 niveles)." }
  }

  if (currentId) {
    const { count } = await admin
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", currentId)
    if (count && count > 0) {
      return { ok: false, error: "Esta categoría ya tiene subcategorías propias, no puede pasar a ser una subcategoría." }
    }
  }

  return { ok: true }
}
