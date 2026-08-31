"use client"

import { useEffect, useState } from "react"

interface Metrics {
  highRiskListings: number
  warningListings: number
  confirmedAnyway: number
  misleadingPending: number
  misleadingConfirmed: number
  priceRespectRate: number | null
  ratedOperations: number
}

interface IncidentSeller {
  id: string
  name: string
  price_integrity_level: number
}

interface PendingReport {
  id: string
  details: string | null
  created_at: string
  listings: {
    id: string
    price: number
    products: { name: string } | null
    sellers: { id: string; name: string } | null
  } | null
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl glass-panel p-4 flex flex-col gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-text-muted">{label}</span>
      <span className="text-2xl font-extrabold text-foreground">{value}</span>
    </div>
  )
}

export default function AdminPriceIntegrityPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [incidentSellers, setIncidentSellers] = useState<IncidentSeller[]>([])
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch("/api/admin/price-integrity")
    const data = await res.json()
    if (res.ok) {
      setMetrics(data.metrics)
      setIncidentSellers(data.incidentSellers ?? [])
      setPendingReports(data.pendingReports ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const moderate = async (id: string, status: "CONFIRMED" | "REJECTED") => {
    setPendingId(id)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) await load()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Integridad de precios</h1>
        <p className="text-sm text-text-muted mt-1">
          Señales de precios inusuales, reportes y reputación de respeto al precio. Una denuncia sola no implica fraude.
        </p>
      </div>

      {loading || !metrics ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile label="Riesgo alto" value={String(metrics.highRiskListings)} />
          <Tile label="Advertencia" value={String(metrics.warningListings)} />
          <Tile label="Confirmadas igual" value={String(metrics.confirmedAnyway)} />
          <Tile label="Reportes pendientes" value={String(metrics.misleadingPending)} />
          <Tile label="Reportes confirmados" value={String(metrics.misleadingConfirmed)} />
          <Tile
            label="Precio respetado"
            value={
              metrics.priceRespectRate == null
                ? "Sin datos"
                : `${Math.round(metrics.priceRespectRate * 100)}%`
            }
          />
        </div>
      )}

      <div className="rounded-2xl glass-panel p-6 overflow-x-auto">
        <h2 className="font-heading text-sm font-extrabold uppercase tracking-wide text-foreground mb-4">
          Casos pendientes de revisión
        </h2>
        {pendingReports.length === 0 ? (
          <p className="text-sm text-text-muted">No hay reportes de precio engañoso pendientes.</p>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-card-border text-text-muted font-bold">
                <th className="py-2 pr-4">Publicación</th>
                <th className="py-2 px-4">Vendedor</th>
                <th className="py-2 px-4">Detalle</th>
                <th className="py-2 pl-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingReports.map((report) => (
                <tr key={report.id} className="border-b border-card-border/30">
                  <td className="py-2.5 pr-4 font-bold text-foreground">
                    {report.listings?.products?.name ?? "Publicación"}
                  </td>
                  <td className="py-2.5 px-4 text-text-muted">{report.listings?.sellers?.name ?? "—"}</td>
                  <td className="py-2.5 px-4 text-text-muted max-w-xs">{report.details ?? "—"}</td>
                  <td className="py-2.5 pl-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={pendingId === report.id}
                      onClick={() => moderate(report.id, "REJECTED")}
                      className="h-8 px-2.5 rounded-lg border border-card-border text-[10px] font-extrabold uppercase mr-2 cursor-pointer"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === report.id}
                      onClick={() => moderate(report.id, "CONFIRMED")}
                      className="h-8 px-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-500 text-[10px] font-extrabold uppercase cursor-pointer"
                    >
                      Confirmar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl glass-panel p-6 overflow-x-auto">
        <h2 className="font-heading text-sm font-extrabold uppercase tracking-wide text-foreground mb-4">
          Vendedores con incidentes (nivel 1–4)
        </h2>
        {incidentSellers.length === 0 ? (
          <p className="text-sm text-text-muted">Nadie tiene un nivel de integridad elevado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-card-border text-text-muted font-bold">
                <th className="py-2">Vendedor</th>
                <th className="py-2">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {incidentSellers.map((seller) => (
                <tr key={seller.id} className="border-b border-card-border/30">
                  <td className="py-2.5 font-bold">{seller.name}</td>
                  <td className="py-2.5">{seller.price_integrity_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
