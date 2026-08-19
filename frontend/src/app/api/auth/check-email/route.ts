import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Deliberately undoes Supabase's anti-enumeration behavior: signInWithPassword
// returns the same generic "Invalid login credentials" whether the email
// doesn't exist or the password is just wrong, on purpose (see login/page.tsx
// for the tradeoff). This endpoint is only ever called AFTER a failed login
// attempt, to tell the user which of the two actually happened — an explicit,
// user-requested UX choice that accepts the account-enumeration risk in
// exchange for a clearer error message.
export async function POST(request: NextRequest) {
  let email = ""
  try {
    const body = await request.json()
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  } catch {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  const admin = createAdminClient()
  // Same exact-match pattern as the register route's duplicate-email check:
  // sellers.email is stored lowercase verbatim from auth.users, so a plain
  // eq() is a safe, case-correct match (ilike would treat %/_ as wildcards).
  const { data, error } = await admin
    .from("sellers")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    console.error("[check-email] lookup failed:", error.message)
    return NextResponse.json({ error: "No se pudo verificar el email" }, { status: 500 })
  }

  return NextResponse.json({ exists: !!data })
}
