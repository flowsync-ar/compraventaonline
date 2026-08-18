import type { NextRequest } from "next/server"
import { ADMIN_COOKIE, verifyAdminToken } from "./auth"

// Route Handler guard for /api/admin/*. Returns true only if the request
// carries a valid, non-expired admin session cookie.
export async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return false
  return verifyAdminToken(token)
}
