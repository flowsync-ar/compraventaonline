"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import ThemeToggle from "./ThemeToggle"
import HeaderSessionBar from "./HeaderSessionBar"
import HeaderSearch from "./HeaderSearch"
import ThemedImage from "./ThemedImage"

// The /admin panel is a separate dashboard experience — it never shows the
// public marketplace header/footer (nav, search, cart, etc).
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin")

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
  // wait on or break over this.
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

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
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
      <header className="sticky top-0 z-50 w-full border-b border-card-border bg-background/85 backdrop-blur-md">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:gap-y-3 lg:gap-y-4 w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-5">

          {/* Grupo Logo + Sesión/Tema (se disuelve desde lg) */}
          <div className="flex lg:contents items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
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
                    <Link href="/categorias" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all">
                      Categorías
                    </Link>
                    <Link href="/destacados" className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-accent-gold stroke-foreground stroke-[1.5] drop-shadow-sm shrink-0">
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.321 21.38c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                      </svg>
                      Destacados
                    </Link>
                    <Link href="/search" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all">
                      Buscar
                    </Link>
                    <Link href="/envios" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all">
                      Envíos & Logística
                    </Link>
                    <Link href="/support" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground/80 hover:text-accent-gold hover:bg-card-border/30 transition-all">
                      Ayuda
                    </Link>
                  </div>
                )}
              </div>

              <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-3 lg:col-start-1 lg:row-start-1 group min-w-0">
                <div className="relative h-9 w-9 sm:h-14 sm:w-14 shrink-0 transition-transform group-hover:scale-105">
                  <ThemedImage
                    lightSrc="/logo-icon.png"
                    darkSrc="/logo-trans-dark.png"
                    alt="CompraVentaOnline La Pampa"
                    className="h-full w-full object-contain"
                  />
                </div>
                <ThemedImage
                  lightSrc="/solotexto.png"
                  darkSrc="/solotexto-dark.png"
                  alt="CompraVentaOnline"
                  className="h-5 sm:h-9 w-auto object-contain min-w-0"
                />
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:col-start-3 lg:row-start-1">
              <HeaderSessionBar />
              <div className="pl-1.5 sm:pl-2.5 border-l border-card-border/40">
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Grupo Nav + Buscador: columna central del grid exterior (ambas
              filas). <lg: flex-col apilado normal, cada uno w-full. lg+: se
              vuelve un grid INTERNO de 1 columna `minmax(0,max-content)` —
              el ancho de esa columna lo determina el nav (su max-content,
              el ancho real que ocupan los links de "Inicio" a "Ayuda" en
              una sola línea), y el buscador (w-full) se estira a ESE mismo
              ancho exacto — por eso sus bordes coinciden con los del nav,
              no con el de toda la celda exterior. `justify-self-center`
              centra el bloque dentro de la celda exterior más ancha.
              `minmax(0, ...)` (no solo max-content) es lo que evita overflow
              si en algún ancho no entra: ahí la columna se comprime, el nav
              pasa a 2 líneas dentro de ese espacio menor, y el buscador se
              comprime junto con él — siguen coincidiendo en ancho. */}
          <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,max-content)] gap-2 lg:gap-3.5 lg:col-start-2 lg:row-start-1 lg:justify-self-center min-w-0">
            <nav className="hidden md:flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-1.5 sm:gap-x-6 min-w-0">
              <Link href="/" className="text-sm font-semibold text-foreground/80 hover:text-accent-gold transition-colors">
                Inicio
              </Link>
              <Link href="/categorias" className="text-sm font-semibold text-foreground/80 hover:text-accent-gold transition-colors">
                Categorías
              </Link>
              <Link href="/destacados" className="text-sm font-semibold text-foreground/80 hover:text-accent-gold transition-colors flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-accent-gold stroke-foreground stroke-[1.5] drop-shadow-sm animate-pulse">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.321 21.38c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
                Destacados
              </Link>
              <Link href="/search" className="text-sm font-semibold text-foreground/80 hover:text-accent-gold transition-colors">
                Buscar
              </Link>
              <Link href="/envios" className="text-sm font-semibold text-foreground/80 hover:text-accent-gold transition-colors">
                Envíos & Logística
              </Link>
              <Link href="/support" className="text-sm font-semibold text-foreground/80 hover:text-accent-gold transition-colors">
                Ayuda
              </Link>
            </nav>

            <div className="w-full">
              <HeaderSearch />
            </div>
          </div>

        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1">
        {children}
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-card-border bg-background py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">

            {/* Marca y Copyright */}
            <div className="flex flex-col items-center sm:items-start gap-1">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 shrink-0">
                  <ThemedImage
                    lightSrc="/logo-icon.png"
                    darkSrc="/logo-trans-dark.png"
                    alt=""
                    className="h-full w-full object-contain opacity-80"
                  />
                </div>
                <span className="font-heading text-sm font-bold tracking-tight bg-gradient-to-r from-[#005c30] via-[#5f741b] to-[#b87c04] bg-clip-text text-transparent">
                  CompraVentaOnline.com.ar
                </span>
              </div>
              <span className="text-xs text-text-muted mt-1 sm:mt-0.5">
                © 2026 - Conectando La Pampa.
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
    </>
  )
}
