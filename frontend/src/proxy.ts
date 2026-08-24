import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/auth"

// maintenance_mode barely ever changes (it's a manual admin toggle), but
// without caching it was queried on every single navigation site-wide —
// a full extra Supabase round trip stacked on top of the mandatory
// getUser() call in updateSession(), adding ~1s to every page load.
// A short TTL keeps the toggle responsive (goes live within 15s) while
// cutting that round trip out of the vast majority of requests.
let maintenanceCache: { value: boolean; expiresAt: number } | null = null
const MAINTENANCE_CACHE_TTL_MS = 15_000

async function getMaintenanceMode(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"]
): Promise<boolean> {
  const now = Date.now()
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return maintenanceCache.value
  }
  const { data } = await supabase
    .from("platform_settings")
    .select("maintenance_mode")
    .eq("id", true)
    .single()
  const value = !!data?.maintenance_mode
  maintenanceCache = { value, expiresAt: now + MAINTENANCE_CACHE_TTL_MS }
  return value
}

// Routes that require an active session
const PROTECTED_ROUTES = ["/dashboard", "/favoritos"]

// Routes that require sellers.username/phone to be set (Google OAuth users
// only get a bare-bones row — see the check below) — kept broad since these
// are basic account fields several features depend on, not tied to any one
// action. Identity verification (DNI + selfie via Didit) is intentionally
// NOT gated here anymore — it's enforced at the moment of buying (Comprar
// Ahora / carrito checkout) and publishing (dashboard's Publicar tab)
// instead, so browsing the dashboard/favorites/order history doesn't force
// KYC on someone who isn't transacting yet.
const PROFILE_COMPLETE_GATED_ROUTES = ["/dashboard", "/favoritos", "/ventas", "/compras", "/carrito"]

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
    const maintenanceMode = await getMaintenanceMode(supabase)

    if (maintenanceMode && pathname !== "/mantenimiento") {
      return NextResponse.redirect(new URL("/mantenimiento", request.url))
    }
    if (!maintenanceMode && pathname === "/mantenimiento") {
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

  const isProfileGated = PROFILE_COMPLETE_GATED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (isProfileGated && user) {
    const { data: seller } = await supabase
      .from("sellers")
      .select("username, phone")
      .eq("user_id", user.id)
      .single()

    // Google OAuth users get a bare-bones `sellers` row (name + type only —
    // see handle_new_user() in 001_initial.sql) with no username, phone, or
    // terms acceptance on record. /completar-perfil collects those before
    // anything else.
    //
    // Gated on BOTH username and phone missing, not just username: some
    // pre-014_username_and_avatar accounts never got backfilled a username
    // (017_backfill_usernames.sql) and can't self-edit it from "Mis Datos"
    // (read-only there) — those real, already-onboarded accounts still have
    // their phone on file, so this doesn't catch them.
    if (!seller?.username && !seller?.phone) {
      const completeUrl = new URL("/completar-perfil", request.url)
      completeUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(completeUrl)
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
