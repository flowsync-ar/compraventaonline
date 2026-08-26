import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

// Categories can nest to any depth (Computación -> Periféricos -> Teclados
// y Mouse -> Mouse, etc) — the only real constraint is that the tree can't
// have cycles. This walks UP from the proposed parent through its own
// ancestors; if currentId shows up along that chain, assigning parentId
// would make currentId an ancestor of itself.
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

  if (currentId) {
    let cursor: string | null = parent.parent_id
    const seen = new Set<string>([parentId])
    while (cursor) {
      if (cursor === currentId) {
        return { ok: false, error: "No se puede mover una categoría dentro de una de sus propias subcategorías." }
      }
      if (seen.has(cursor)) break // malformed cycle already in the data — bail instead of looping forever
      seen.add(cursor)
      const { data: node } = await admin.from("categories").select("parent_id").eq("id", cursor).single()
      cursor = node?.parent_id ?? null
    }
  }

  return { ok: true }
}
