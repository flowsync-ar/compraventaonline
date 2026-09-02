import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export function slugifyCategoryName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
  return slug || "categoria"
}

export async function allocateUniqueSlug(
  admin: SupabaseClient<Database>,
  name: string,
  parentId: string | null,
  excludeId?: string,
): Promise<string> {
  const base = slugifyCategoryName(name)
  let candidate = base
  if (parentId) {
    const { data: parent } = await admin.from("categories").select("slug").eq("id", parentId).single()
    if (parent?.slug) candidate = `${parent.slug}-${base}`.slice(0, 80)
  }

  const { data: rows } = await admin.from("categories").select("id, slug")
  const taken = new Set(
    (rows ?? []).filter((row) => row.id !== excludeId).map((row) => row.slug),
  )

  if (!taken.has(candidate)) return candidate
  let n = 2
  while (taken.has(`${candidate}-${n}`)) n += 1
  return `${candidate}-${n}`
}

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
