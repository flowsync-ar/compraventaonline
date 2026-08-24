"use client"

import { useEffect, useState } from "react"

export default function AdminConfiguracionPage() {
  const [highlightPrice, setHighlightPrice] = useState("")
  const [highlightDurationDays, setHighlightDurationDays] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      if (res.ok) {
        setHighlightPrice(String(data.settings.highlight_price))
        setHighlightDurationDays(String(data.settings.highlight_duration_days))
        setMaintenanceMode(Boolean(data.settings.maintenance_mode))
      } else {
        setError(data.error ?? "No se pudo cargar la configuración")
      }
      setLoading(false)
    }
    loadSettings() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const handleToggleMaintenance = async () => {
    const next = !maintenanceMode
    setMaintenanceSaving(true)
    setMaintenanceError(null)
    try {
      const res = await fetch("/api/admin/settings/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMode: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar")
      setMaintenanceMode(next)
    } catch (err) {
      setMaintenanceError(err instanceof Error ? err.message : "No se pudo actualizar")
    } finally {
      setMaintenanceSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          highlightPrice: Number(highlightPrice),
          highlightDurationDays: Number(highlightDurationDays),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar")
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Cargando...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-foreground">Configuración</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl glass-panel p-6 flex flex-col gap-5 max-w-lg"
      >
        <div>
          <h2 className="text-sm font-extrabold text-foreground mb-1">Publicaciones destacadas</h2>
          <p className="text-xs text-text-muted">
            Precio y duración del destacado pago que los vendedores compran desde su panel.
          </p>
        </div>

        <div>
          <label className="text-sm font-bold text-foreground block mb-1.5">Precio (ARS)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={highlightPrice}
            onChange={(e) => setHighlightPrice(e.target.value)}
            required
            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-foreground block mb-1.5">Duración (días)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={highlightDurationDays}
            onChange={(e) => setHighlightDurationDays(e.target.value)}
            required
            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
          />
        </div>

        {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
        {success && <p className="text-xs text-accent-green font-bold">✓ Configuración guardada</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>

      <div className="rounded-2xl glass-panel p-6 flex flex-col gap-4 max-w-lg">
        <div>
          <h2 className="text-sm font-extrabold text-foreground mb-1">Sitio en mantenimiento</h2>
          <p className="text-xs text-text-muted">
            Con esto activado, cualquier visitante (comprador o vendedor) que entre al sitio ve una página de "en mantenimiento" en vez del contenido normal. Vos seguís pudiendo entrar acá al panel de admin para desactivarlo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={maintenanceMode}
            onClick={handleToggleMaintenance}
            disabled={maintenanceSaving}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              maintenanceMode ? "bg-red-500" : "bg-card-border"
            }`}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                maintenanceMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm font-bold ${maintenanceMode ? "text-red-500" : "text-text-muted"}`}>
            {maintenanceMode ? "Activado — el sitio está caído para el público" : "Desactivado — el sitio funciona normalmente"}
          </span>
        </div>

        {maintenanceError && <p className="text-xs text-red-500 font-bold">{maintenanceError}</p>}
      </div>
    </div>
  )
}
