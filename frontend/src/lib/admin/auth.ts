import { SignJWT, jwtVerify } from "jose"

// Session for the single site administrator. Deliberately separate from
// Supabase Auth: the admin is not a seller/buyer and has no row in `sellers`.
// Runtime-agnostic (no next/headers) so it can run both in proxy.ts (Edge)
// and in Route Handlers.

export const ADMIN_COOKIE = "admin_session"
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8 // 8h

function getSecretKey() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET env var")
  }
  return new TextEncoder().encode(secret)
}

export function verifyCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error("Missing ADMIN_EMAIL/ADMIN_PASSWORD env vars")
  }
  return (
    email.trim().toLowerCase() === adminEmail.trim().toLowerCase() &&
    password === adminPassword
  )
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecretKey())
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecretKey())
    return true
  } catch {
    return false
  }
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
}
