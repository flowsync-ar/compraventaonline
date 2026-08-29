"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import ThemeToggle from "./ThemeToggle"
import HeaderSessionBar from "./HeaderSessionBar"
import HomeSearchBar from "./HomeSearchBar"
import ThemedImage from "./ThemedImage"
import { createClient } from "@/lib/supabase/client"
import Brand from "./Brand"

// The /admin panel is a separate dashboard experience — it never shows the
// public marketplace header/footer (nav, search, cart, etc).
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = pathname?.startsWith("/admin")
  const isMaintenance = pathname === "/mantenimiento"
  const isDashboard = !!pathname?.startsWith("/dashboard")
  const isHomePage = pathname === "/"
  // "/" only matches the home page itself — every other route starts with
  // "/" too, so a plain startsWith would light up "Inicio" everywhere.
  const isNavActive = (href: string) =>
    href === "/" ? pathname === "/" : !!pathname?.startsWith(href)

  // Mobile nav dropdown (<md only — from md up the horizontal nav has
  // enough room to wrap onto 1-2 lines on its own, no need to hide it).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Lightweight visit counter for the admin stats dashboard — public site
  // only (never /admin, guarded inside the effect body since hooks can't
  // be called conditionally). Fire-and-forget: a visitor's page must never
  // wait on or break over this. The backend dedupes by (hashed IP, day) —
  // see 026_unique_page_views.sql and track-visit/route.ts — so the same
  // visitor reloading, browsing multiple pages, or opening a fresh
  // incognito window only ever counts once per day, not once per load.
  useEffect(() => {
    if (isAdmin || !pathname) return
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {
      // best-effort — a dropped beacon shouldn't surface anywhere
    })
  }, [pathname, isAdmin])

  // Sends the visitor back to the homepage the instant their session ends —
  // no matter which page they were on, and no matter WHY it ended. The
  // "Cerrar sesión" buttons (HeaderSessionBar, dashboard) already do their
  // own router.push("/"), but that only covers an explicit click. A session
  // can also end on its own (expired/rejected refresh token) or from
  // another tab (Supabase's client syncs sign-out across tabs) — those
  // paths never went through this component before, so a signed-out user
  // could keep sitting on e.g. /dashboard with a dead session. This is the
  // single place that reacts to every case, not just the button.
  useEffect(() => {
    if (isAdmin) return
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/")
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, [isAdmin, router])

  if (isAdmin || isMaintenance) {
    return <>{children}</>
  }

  return (
    <div className={isDashboard ? "flex h-dvh flex-col overflow-hidden" : ""}>
      {/* Navigation Header */}
      {/* One grid, two arrangements — no duplicated logo/session/search:
          - <lg (celulares y tablets chicas): 1 columna, todo apilado. El
            grupo logo+sesión "se disuelve" (display:contents) SOLO desde lg,
            así que acá se ve tal cual está escrito: logo+sesión en su fila,
            nav debajo con su propio ancho completo para wrappear cómodo,
            buscador debajo. El corte es lg (1024px), no md (768px): a 768 el
            nav + los botones Vender/Ingresar quedan muy apretados si
            comparten fila con logo/sesión.
          - lg+ (desktop): grid de 3 columnas × 2 filas (auto | 1fr | auto).
            El grupo logo+sesión se disuelve y sus dos hijos pasan a ocupar
            las columnas 1 y 3 de la fila 1; el nav toma la columna central
            de la fila 1; el buscador toma la MISMA columna central pero en
            la fila 2, debajo del nav — por eso comparten ancho exacto sin
            cálculos manuales, es la misma celda de grid. */}
      <header className={`${isDashboard ? "shrink-0" : "sticky top-0"} z-50 w-full border-b border-card-border bg-background/85 backdrop-blur-md`}>
        <div className="grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-5 sm:gap-y-6 xl:gap-y-4 w-full px-4 sm:px-6 lg:px-8 pt-4 xl:pt-5 pb-4 xl:pb-2">

          {/* Grupo Logo + Sesión/Tema (se disuelve desde xl) */}
          <div className="flex xl:contents items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 xl:self-start">
              {/* Botón hamburguesa: solo <md. Ahí el nav ni siquiera con
                  wrap tiene aire para 6 links, así que se oculta detrás de
                  este botón en vez de amontonarse en 3 líneas apretadas. */}
              <div ref={mobileMenuRef} className="relative shrink-0 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  aria-label="Abrir menú de navegación"
                  aria-expanded={mobileMenuOpen}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-bg border border-card-border/80 hover:border-card-border text-foreground transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {mobileMenuOpen ? (
                      <>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </>
                    ) : (
                      <>
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </>
                    )}
                  </svg>
                </button>

                {mobileMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-60 rounded-2xl bg-card-bg-solid border border-card-border p-2 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link href="/" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all">
                      Inicio
                    </Link>
                    <Link href="/categorias" className={`px-3 py-2.5 rounded-xl text-sm font-semibold hover:text-accent-gold hover:bg-card-border/30 transition-all ${isNavActive("/categorias") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80"}`}>
                      Categorías
                    </Link>
                    <Link href="/destacados" className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold hover:text-accent-gold hover:bg-card-border/30 transition-all ${isNavActive("/destacados") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-accent-gold stroke-foreground stroke-[1.5] drop-shadow-sm shrink-0">
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.321 21.38c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                      </svg>
                      Destacados
                    </Link>
                    <Link href="/search" className={`px-3 py-2.5 rounded-xl text-sm font-semibold hover:text-accent-gold hover:bg-card-border/30 transition-all ${isNavActive("/search") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80"}`}>
                      Buscar
                    </Link>
                    <Link href="/envios" className={`px-3 py-2.5 rounded-xl text-sm font-semibold hover:text-accent-gold hover:bg-card-border/30 transition-all ${isNavActive("/envios") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80"}`}>
                      Envíos & Logística
                    </Link>
                    <Link href="/support" className={`px-3 py-2.5 rounded-xl text-sm font-semibold hover:text-accent-gold hover:bg-card-border/30 transition-all ${isNavActive("/support") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80"}`}>
                      Ayuda
                    </Link>
                  </div>
                )}
              </div>

              <Link href="/" className="relative flex flex-col items-center shrink-0 group min-w-0">
                <ThemedImage
                  lightSrc="/logo-cvo-new.png"
                  darkSrc="/logo-cvo-new.png"
                  alt="CompraVentaOnline La Pampa"
                  className="h-16 sm:h-24 w-auto max-w-none object-contain transition-transform group-hover:scale-105"
                />
                <span className="-mt-1.5 sm:-mt-2.5 font-script text-sm sm:text-lg font-bold whitespace-nowrap transition-transform group-hover:scale-110">
                <span className="text-accent-gold">100%</span> <span className="text-[#2A6BC5]">Pampeano</span>
                </span>
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2.5 xl:col-start-3 xl:row-start-1 xl:self-start">
              <HeaderSessionBar />
              <div className="pl-1 sm:pl-2.5 border-l border-card-border/40">
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Grupo Nav + Buscador: columna central del grid exterior (ambas
              filas). <xl: flex-col apilado normal, cada uno w-full — el
              corte se subió de lg (1024px) a xl (1280px) porque en el
              rango intermedio no entraba todo en una fila (buscador +
              nav + sesión con nombre de comercio largo se superponían).
              xl+: se vuelve un grid INTERNO de 1 columna
              `minmax(0,max-content)` — el ancho de esa columna lo
              determina el nav (su max-content, el ancho real que ocupan
              los links de "Inicio" a "Ayuda" en una sola línea), y el
              buscador (w-full) se estira a ESE mismo ancho exacto — por
              eso sus bordes coinciden con los del nav, no con el de toda
              la celda exterior. `justify-self-center` centra el bloque
              dentro de la celda exterior más ancha. `minmax(0, ...)` (no
              solo max-content) es lo que evita overflow si en algún ancho
              no entra: ahí la columna se comprime, el nav pasa a 2 líneas
              dentro de ese espacio menor, y el buscador se comprime junto
              con él — siguen coincidiendo en ancho. */}
          <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,max-content)] gap-2 xl:gap-6 xl:col-start-2 xl:row-start-1 xl:self-start xl:justify-self-center min-w-0">
            {/* Debajo de xl (mobile/tablet) el buscador es un bloque grande
                apilado (input + 2 selects + botón) — mostrarlo en TODAS
                las páginas ahí abajo empuja mucho contenido y es
                redundante en pantallas como el detalle de una publicación
                o el dashboard. Se reserva para la home. Desde xl+ (una
                sola fila, compacto) se muestra siempre, como en desktop. */}
            <div className={isHomePage ? "w-full" : "hidden xl:block w-full"}>
              <HomeSearchBar />
            </div>

            <nav className="hidden md:flex flex-wrap items-center justify-center gap-x-1 gap-y-1 min-w-0">
              <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all text-foreground/80 hover:text-accent-gold hover:bg-card-border/30">
                Inicio
              </Link>
              <Link href="/categorias" className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isNavActive("/categorias") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80 hover:text-accent-gold hover:bg-card-border/30"}`}>
                Categorías
              </Link>
              <Link href="/destacados" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isNavActive("/destacados") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80 hover:text-accent-gold hover:bg-card-border/30"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-accent-gold stroke-foreground stroke-[1.5] drop-shadow-sm animate-pulse">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.321 21.38c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
                Destacados
              </Link>
              <Link href="/search" className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isNavActive("/search") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80 hover:text-accent-gold hover:bg-card-border/30"}`}>
                Buscar
              </Link>
              <Link href="/envios" className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isNavActive("/envios") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80 hover:text-accent-gold hover:bg-card-border/30"}`}>
                Envíos & Logística
              </Link>
              <Link href="/support" className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isNavActive("/support") ? "text-accent-gold bg-accent-gold/10" : "text-foreground/80 hover:text-accent-gold hover:bg-card-border/30"}`}>
                Ayuda
              </Link>
            </nav>
          </div>

        </div>
      </header>

      {/* Main Workspace */}
      <main className={isDashboard ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex-1"}>
        {children}
      </main>

      {/* Premium Footer — hidden on the seller dashboard so the publish
          form can sit in a viewport-height frame instead of scrolling
          the whole marketplace chrome. */}
      {!isDashboard && (
      <footer className="border-t border-card-border bg-background py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">

            {/* Marca y Copyright */}
            <div className="flex flex-col items-center sm:items-start gap-1">
              <ThemedImage
                lightSrc="/logo-cvo-new.png"
                darkSrc="/logo-cvo-new.png"
                alt="CompraVentaOnline.com.ar"
                className="h-6 w-auto object-contain opacity-90"
              />
              <span className="text-xs text-text-muted mt-1 sm:mt-0.5">
                © 2026 - <Brand text="CompraVentaOnline" />
              </span>
            </div>

            {/* Enlaces del Footer */}
            <div className="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-2.5 text-xs text-text-muted">
              <Link href="/terms" className="hover:text-accent-gold transition-colors">
                Términos y Condiciones
              </Link>
              <Link href="/privacy" className="hover:text-accent-gold transition-colors">
                Privacidad
              </Link>
              <Link href="/support" className="hover:text-accent-gold transition-colors">
                Soporte
              </Link>
              <Link href="/envios" className="hover:text-accent-gold transition-colors">
                Envíos & Logística
              </Link>
            </div>

          </div>
        </div>
      </footer>
      )}
    </div>
  )
}
