"use client"

import type { ReactNode } from "react"
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

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-card-border bg-background/85 backdrop-blur-md">

        {/* --- VISTA DESKTOP (md o más grande) --- */}
        <div className="hidden md:flex w-full items-center justify-between px-6 py-3 lg:pr-8 gap-8">

          {/* Logo y Nombre */}
          <Link href="/" className="ml-[5px] flex shrink-0 items-center gap-4 group">
            <div className="relative h-24 w-24 shrink-0 transition-transform group-hover:scale-105">
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
              className="h-14 w-auto object-contain shrink-0"
            />
          </Link>

          {/* Columna Central: Nav y Buscador */}
          <div className="flex flex-1 flex-col gap-3 items-center justify-center min-w-0">
            {/* Nav Menu */}
            <nav className="flex items-center justify-center gap-6">
              <Link href="/" className="text-sm font-semibold text-foreground/80 hover:text-accent-gold transition-colors">
                Inicio
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

            {/* Buscador */}
            <div className="w-full flex justify-center">
              <HeaderSearch />
            </div>
          </div>

          {/* Columna Derecha: Sesión y Tema */}
          <div className="flex shrink-0 items-center gap-4">
            <HeaderSessionBar />
            <div className="ml-1 pl-4 border-l border-card-border/40">
              <ThemeToggle />
            </div>
          </div>

        </div>

        {/* --- VISTA MOBILE (Menor a md) --- */}
        <div className="flex md:hidden flex-col w-full px-4 py-3 gap-3">

          {/* Fila 1: Logo a la izquierda, barra de sesión/tema a la derecha */}
          <div className="flex w-full items-center justify-between gap-3">
            {/* Logo y Nombre */}
            <Link href="/" className="flex items-center gap-2 group min-w-0">
              <div className="relative h-12 w-12 shrink-0 transition-transform group-hover:scale-105">
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
                className="h-8 w-auto object-contain min-w-0"
              />
            </Link>

            {/* Barra de Sesión + Tema */}
            <div className="flex shrink-0 items-center gap-2">
              <HeaderSessionBar />
              <div className="ml-0.5 pl-2 border-l border-card-border/40">
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Fila 2: Buscador a ancho completo */}
          <div className="w-full">
            <HeaderSearch />
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
