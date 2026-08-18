import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth"

// Routes that require an active session
const PROTECTED_ROUTES = ["/dashboard", "/favoritos"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin has its own session (not Supabase Auth) — handled separately so
  // it never runs updateSession, and the admin never touches `sellers`.
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next()
    }
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    const isValidAdmin = token ? await verifyAdminToken(token) : false
    if (!isValidAdmin) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { user } = await updateSession(request, response)

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from /login
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (Next.js image optimization)
     * - favicon.ico, public assets
     * - API routes (handled by Route Handlers individually)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
