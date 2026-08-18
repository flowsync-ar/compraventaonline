import { NextRequest, NextResponse } from "next/server"
import { adminCookieOptions, ADMIN_COOKIE, signAdminToken, verifyCredentials } from "@/lib/admin/auth"

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = body.email?.trim()
  const password = body.password

  if (!email || !password) {
    return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 })
  }

  if (!verifyCredentials(email, password)) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
  }

  const token = await signAdminToken()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, token, adminCookieOptions)
  return response
}
