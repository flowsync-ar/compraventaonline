"use client"

import { useEffect, useState } from "react"
import ConfirmModal from "@/components/ConfirmModal"

interface Stats {
  sellers: { total: number; last7Days: number; last30Days: number }
  listings: { total: number; active: number }
  orders: { paidCount: number; revenueTotal: number }
  pageViews: { total: number; last7Days: number; last30Days: number }
}

function StatCard({
  label,
  value,
  sublabel,
  icon,
}: {
  label: string
  value: string
  sublabel?: string
  icon: string
}) {
  return (
    <div className="rounded-2xl bg-card-bg-solid border border-card-border p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <span className="font-heading text-3xl font-extrabold text-foreground mt-1">{value}</span>
      {sublabel && <span className="text-[11px] text-text-muted">{sublabel}</span>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  const loadStats = () => {
    setLoading(true)
    fetch("/api/admin/stats")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar las estadísticas.")
        setStats(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las estadísticas."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleResetVisits = async () => {
    setResetting(true)
    try {
      const res = await fetch("/api/admin/stats/reset-visits", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo reiniciar el contador.")
      setShowResetConfirm(false)
      loadStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reiniciar el contador.")
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Estadísticas</h1>
        <p className="text-sm text-text-muted mt-1">Panorama general del marketplace.</p>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Cargando estadísticas...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : stats ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide">Nuevos Registros</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon="👥"
                label="Total de usuarios"
                value={stats.sellers.total.toLocaleString("es-AR")}
              />
              <StatCard
                icon="🆕"
                label="Últimos 7 días"
                value={stats.sellers.last7Days.toLocaleString("es-AR")}
                sublabel="Nuevos registros"
              />
              <StatCard
                icon="📈"
                label="Últimos 30 días"
                value={stats.sellers.last30Days.toLocaleString("es-AR")}
                sublabel="Nuevos registros"
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide">Publicaciones y Ventas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon="📦"
                label="Productos publicados"
                value={stats.listings.total.toLocaleString("es-AR")}
                sublabel={`${stats.listings.active.toLocaleString("es-AR")} activas`}
              />
              <StatCard
                icon="🛒"
                label="Compras realizadas"
                value={stats.orders.paidCount.toLocaleString("es-AR")}
                sublabel="Órdenes pagadas"
              />
              <StatCard
                icon="💰"
                label="Monto total vendido"
                value={`$${stats.orders.revenueTotal.toLocaleString("es-AR")}`}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide">Visitas al Sitio</h2>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-[11px] font-bold text-text-muted hover:text-red-500 transition-colors cursor-pointer"
              >
                ↺ Reiniciar contador
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon="👁️"
                label="Visitas totales"
                value={stats.pageViews.total.toLocaleString("es-AR")}
              />
              <StatCard
                icon="📅"
                label="Últimos 7 días"
                value={stats.pageViews.last7Days.toLocaleString("es-AR")}
              />
              <StatCard
                icon="🗓️"
                label="Últimos 30 días"
                value={stats.pageViews.last30Days.toLocaleString("es-AR")}
              />
            </div>
            <p className="text-[10px] text-text-muted/70 italic">
              Cuenta visitantes únicos por día — si la misma persona entra varias veces el mismo día, o recarga
              la página, solo suma una vez.
            </p>
          </section>
        </>
      ) : null}

      <ConfirmModal
        isOpen={showResetConfirm}
        title="¿Reiniciar el contador de visitas?"
        description="Se van a borrar todas las visitas registradas hasta ahora. Esta acción no se puede deshacer."
        confirmText="Reiniciar"
        cancelText="Cancelar"
        onConfirm={handleResetVisits}
        onCancel={() => setShowResetConfirm(false)}
        isLoading={resetting}
        type="danger"
      />
    </div>
  )
}
