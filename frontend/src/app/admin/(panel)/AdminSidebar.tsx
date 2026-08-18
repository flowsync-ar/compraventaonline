"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import ThemedImage from "@/components/ThemedImage"

const LINKS = [
  { href: "/admin/slides", label: "Carousel", icon: "🖼️" },
  { href: "/admin/categorias", label: "Categorías", icon: "🏷️" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "👥" },
  { href: "/admin/publicaciones", label: "Publicaciones", icon: "📦" },
  { href: "/admin/reclamos", label: "Reclamos", icon: "🚩" },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <aside className="w-60 shrink-0 border-r border-card-border bg-card-bg-solid flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-card-border flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0">
          <ThemedImage
            lightSrc="/logo-icon.png"
            darkSrc="/logo-trans-dark.png"
            alt="CompraVentaOnline"
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <span className="font-heading text-sm font-extrabold text-foreground uppercase tracking-wider block">
            Admin
          </span>
          <p className="text-[10px] text-text-muted -mt-0.5">CompraVentaOnline</p>
        </div>
      </div>

      <div className="p-3 border-b border-card-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Cerrar sesión
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3">
        {LINKS.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? "bg-accent-gold text-background shadow-sm"
                  : "text-text-muted hover:text-foreground hover:bg-card-bg"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
