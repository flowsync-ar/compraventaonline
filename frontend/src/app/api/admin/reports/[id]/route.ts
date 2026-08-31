import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { REPORT_MODERATION_STATUS, type ReportModerationStatus } from "@/lib/priceIntegrity/types"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await context.params
  let body: { status?: ReportModerationStatus }
  try {
    body = (await request.json()) as { status?: ReportModerationStatus }
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const status = body.status
  if (
    status !== REPORT_MODERATION_STATUS.PENDING &&
    status !== REPORT_MODERATION_STATUS.CONFIRMED &&
    status !== REPORT_MODERATION_STATUS.REJECTED
  ) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("product_reports").update({ status }).eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
