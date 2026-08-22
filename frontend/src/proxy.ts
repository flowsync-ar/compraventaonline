import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth"

// Routes that require an active session
const PROTECTED_ROUTES = ["/dashboard", "/favoritos"]

// Routes that ALSO require sellers.identity_verified = true — browsing
// stays open to anyone logged in, but transacting/managing an account
// doesn't, until Didit approves their DNI + selfie. /verificar-identidad
// itself is deliberately excluded (that's where this redirects TO).
const IDENTITY_GATED_ROUTES = ["/dashboard", "/favoritos", "/ventas", "/compras", "/carrito"]

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

  const { supabase, user } = await updateSession(request, response)

  // Site-wide maintenance mode (platform_settings, toggled from
  // /admin/configuracion). API routes are left alone — a redirect to an
  // HTML page would break any caller expecting JSON. /mantenimiento itself
  // is checked both ways: it only renders while maintenance is actually on
  // — otherwise it's not a real page, just bounce back home.
  if (!pathname.startsWith("/api")) {
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("maintenance_mode")
      .eq("id", true)
      .single()

    if (settings?.maintenance_mode && pathname !== "/mantenimiento") {
      return NextResponse.redirect(new URL("/mantenimiento", request.url))
    }
    if (!settings?.maintenance_mode && pathname === "/mantenimiento") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isIdentityGated = IDENTITY_GATED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (isIdentityGated && user) {
    const { data: seller } = await supabase
      .from("sellers")
      .select("identity_verified")
      .eq("user_id", user.id)
      .single()

    if (!seller?.identity_verified) {
      const verifyUrl = new URL("/verificar-identidad", request.url)
      verifyUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(verifyUrl)
    }
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
