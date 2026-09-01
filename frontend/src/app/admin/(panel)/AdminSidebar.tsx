"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import ThemedImage from "@/components/ThemedImage"

const LINKS = [
  { href: "/admin", label: "Estadísticas", icon: "📊" },
  { href: "/admin/metricas", label: "Métricas", icon: "🩺" },
  { href: "/admin/slides", label: "Carousel", icon: "🖼️" },
  { href: "/admin/categorias", label: "Categorías", icon: "🏷️" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "👥" },
  { href: "/admin/publicaciones", label: "Publicaciones", icon: "📦" },
  { href: "/admin/reclamos", label: "Reclamos", icon: "🚩" },
  { href: "/admin/consultas", label: "Consultas", icon: "💬" },
  { href: "/admin/precios", label: "Lista de Precios", icon: "💲" },
  { href: "/admin/integridad-precios", label: "Integridad de precios", icon: "⚖️" },
  { href: "/admin/configuracion", label: "Configuración", icon: "⚙️" },
]

export default function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <aside
      className={`w-64 max-w-[85vw] shrink-0 border-r border-card-border bg-card-bg-solid flex flex-col z-50 transition-transform duration-200 ease-out max-lg:fixed max-lg:top-14 max-lg:bottom-0 max-lg:left-0 max-lg:h-auto lg:sticky lg:top-0 lg:h-screen ${
        open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full max-lg:pointer-events-none"
      } lg:translate-x-0`}
    >
      <div className="px-5 py-5 border-b border-card-border flex flex-col items-center gap-2">
        <ThemedImage
          lightSrc="/logo-cvo-new.png"
          darkSrc="/logo-cvo-new.png"
          alt="CompraVentaOnline"
          className="h-12 lg:h-16 w-auto object-contain"
        />
        <span className="font-heading text-xs font-extrabold text-foreground uppercase tracking-wider">
          Administrador
        </span>
      </div>

      <div className="p-3 border-b border-card-border">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Cerrar sesión
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        {LINKS.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all min-h-11 ${
                isActive
                  ? "bg-accent-gold text-white shadow-sm"
                  : "text-text-muted hover:text-accent-blue hover:bg-card-bg"
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
