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
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
