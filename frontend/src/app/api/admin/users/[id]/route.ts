import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Deletes the underlying auth.users row. Every table that references this
// seller (listings, favorites, questions, seller_rewards, terms_acceptances,
// highlighted_products) has ON DELETE CASCADE back to `sellers`, and
// `sellers.user_id` cascades from auth.users — so this is a full,
// irreversible wipe of everything the user ever published or did.
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  const admin = createAdminClient()

  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .select("user_id")
    .eq("id", id)
    .single()

  if (sellerError || !seller) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { error } = await admin.auth.admin.deleteUser(seller.user_id)

  // Some seller rows are seed/demo data whose user_id was never a real
  // auth.users row to begin with (e.g. fake placeholder ids like
  // a0000000-0000-0000-0000-000000000001 from the initial migration's
  // sample data) — auth.admin.deleteUser correctly reports "User not
  // found" for those, since there's genuinely no auth account to delete.
  // That's not a failure from the admin's point of view: they asked to
  // wipe the seller and everything under it, so fall back to deleting the
  // `sellers` row directly — every table referencing it (listings,
  // favorites, questions, seller_rewards, ...) already cascades from
  // `sellers.id`, same end result as the normal path.
  if (error) {
    const isMissingAuthUser = error.status === 404 || /user not found/i.test(error.message)
    if (!isMissingAuthUser) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { error: sellerDeleteError } = await admin.from("sellers").delete().eq("id", id)
    if (sellerDeleteError) {
      return NextResponse.json({ error: sellerDeleteError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
