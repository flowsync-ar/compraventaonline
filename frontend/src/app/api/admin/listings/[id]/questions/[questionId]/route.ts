import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Two moderation levels, chosen by the admin per action:
//   mode "hide"   — soft-delete: text replaced with a moderation notice,
//                   question_deleted/answer_deleted flipped to true. Same
//                   pattern the auto-redaction trigger uses. Leaves a trace
//                   (useful if there's ever a dispute) and, for a hidden
//                   question, keeps the row so the buyer still sees their
//                   own question in their history.
//   mode "delete" — true removal, no trace left anywhere:
//     - target "answer": answer set back to NULL, status back to PENDING,
//       answer_deleted reset to false — exactly as if the seller never
//       answered (answer_deleted stays false because there's no moderation
//       notice being shown, there's nothing there at all).
//     - target "question": the row is physically DELETEd. `question` is
//       NOT NULL in the schema, so unlike the answer there's no "blank it
//       out" option — removing it can only mean removing the row, which
//       also removes the buyer's own copy of their question. That's an
//       intentional, disclosed trade-off of choosing hard-delete over hide.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; questionId: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id, questionId } = await context.params

  let body: { target?: "question" | "answer"; mode?: "hide" | "delete" }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (body.target !== "question" && body.target !== "answer") {
    return NextResponse.json({ error: "target debe ser 'question' o 'answer'" }, { status: 400 })
  }
  const mode = body.mode ?? "hide"
  if (mode !== "hide" && mode !== "delete") {
    return NextResponse.json({ error: "mode debe ser 'hide' o 'delete'" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Hard delete of the question = remove the whole row.
  if (mode === "delete" && body.target === "question") {
    const { error } = await admin.from("questions").delete().eq("id", questionId).eq("listing_id", id)

    if (error) {
      return NextResponse.json({ error: "No se pudo eliminar la pregunta" }, { status: 500 })
    }
    return NextResponse.json({ deleted: true, questionId })
  }

  const update =
    mode === "hide"
      ? body.target === "question"
        ? { question: "Esta pregunta fue eliminada por un administrador.", question_deleted: true }
        : { answer: "Esta respuesta fue eliminada por un administrador.", answer_deleted: true }
      : { answer: null, answer_deleted: false, status: "PENDING" as const } // mode "delete", target "answer"

  const { data, error } = await admin
    .from("questions")
    .update(update)
    .eq("id", questionId)
    .eq("listing_id", id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo eliminar el contenido de la consulta" }, { status: 500 })
  }

  return NextResponse.json({ question: data })
}
