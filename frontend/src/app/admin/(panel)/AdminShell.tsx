"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import AdminSidebar from "./AdminSidebar"
import AdminInboxBell from "./AdminInboxBell"

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  return (
    <div className="min-h-dvh bg-background flex overflow-x-hidden">
      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed top-14 inset-x-0 bottom-0 z-40 bg-black/50 lg:hidden cursor-pointer"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-50 flex items-center gap-2 px-3 py-2.5 border-b border-card-border bg-background/95 backdrop-blur-sm lg:border-0 lg:bg-transparent lg:px-10 lg:pt-8 lg:pb-0 lg:justify-end">
          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden h-10 w-10 shrink-0 rounded-xl border border-card-border bg-card-bg flex items-center justify-center text-foreground cursor-pointer"
          >
            {menuOpen ? (
              <span className="text-lg leading-none">✕</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <span className="lg:hidden font-heading text-sm font-extrabold text-foreground truncate">
            Administrador
          </span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <AdminInboxBell />
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-card-border bg-card-bg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-text-muted hover:text-foreground hover:border-accent-gold/40 transition-all"
            >
              Ver sitio
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
              </svg>
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 px-3 py-4 sm:px-6 lg:px-10 lg:py-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
