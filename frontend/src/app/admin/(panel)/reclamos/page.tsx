"use client"

import { useEffect, useState } from "react"

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  FRAUD: "Fraude",
  INAPPROPRIATE: "Contenido inapropiado",
  DUPLICATE: "Publicación duplicada",
  OTHER: "Otro",
}

interface Report {
  id: string
  reason: string
  details: string | null
  created_at: string
  listings: { id: string; products: { name: string } | null } | null
  reporter: { id: string; name: string } | null
}

export default function AdminReclamosPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((res) => res.json())
      .then((data) => setReports(data.reports ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-foreground">Reclamos</h1>

      <div className="rounded-2xl glass-panel p-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">No hay reclamos registrados.</p>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-card-border text-text-muted font-bold select-none">
                <th className="py-2">Publicación</th>
                <th className="py-2">Motivo</th>
                <th className="py-2">Detalle</th>
                <th className="py-2">Denunciado por</th>
                <th className="py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-card-border/30 hover:bg-card-bg/30 transition-colors align-top">
                  <td className="py-2.5 font-bold text-foreground">
                    {report.listings?.products?.name ?? "Publicación eliminada"}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-500/10 text-red-500">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                  </td>
                  <td className="py-2.5 text-text-muted max-w-xs">{report.details ?? "—"}</td>
                  <td className="py-2.5 text-text-muted">{report.reporter?.name ?? "Usuario eliminado"}</td>
                  <td className="py-2.5 text-text-muted whitespace-nowrap">
                    {new Date(report.created_at).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
