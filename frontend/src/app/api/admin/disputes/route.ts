import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Lists every order currently DISPUTADO — the admin's "centro de
// resolución" queue. See 022_escrow_payments.sql and
// /api/orders/[id]/dispute for how an order lands here.
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("orders")
    .select(`
      id, amount, dispute_opened_at, dispute_reason, admin_notes,
      currencies ( symbol ),
      buyer:sellers!orders_buyer_id_fkey ( id, name, phone ),
      seller:sellers!orders_seller_id_fkey ( id, name, phone, bank_cbu, bank_alias ),
      listings ( id, image_url, products ( name ) )
    `)
    .eq("status", "DISPUTADO")
    .order("dispute_opened_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ disputes: data })
}
