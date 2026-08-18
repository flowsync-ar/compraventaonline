import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

// Read-only lookup used by the listing page to poll an order's status
// after the buyer comes back from Mercado Pago's checkout.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // RLS already restricts this to the buyer or seller of the order.
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status, payment_method, paid_at")
    .eq("id", id)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ order })
}
