"use client"

import { useEffect, useState } from "react"

interface BucketStat {
  bucket_id: string
  file_count: number
  total_bytes: number
  avg_bytes: number
  max_bytes: number
}

interface BucketHistogram {
  bucket_id: string
  under_500kb: number
  kb500_1mb: number
  mb1_2: number
  mb2_5: number
  over_5mb: number
}

interface LargestFile {
  bucket_id: string
  name: string
  size_bytes: number
  created_at: string
  seller_name: string | null
  seller_username: string | null
}

interface StorageHealth {
  by_bucket: BucketStat[]
  histogram: BucketHistogram[]
  largest: LargestFile[]
  orphaned_count: number
  orphaned_bytes: number
}

interface UmamiMetric {
  x: string
  y: number
}

interface UmamiData {
  stats: { pageviews: number; visitors: number; visits: number; bounces: number; totaltime: number }
  topPages: UmamiMetric[]
  topReferrers: UmamiMetric[]
  rangeLabel: string
}

const BUCKET_LABELS: Record<string, string> = {
  listings: "Publicaciones",
  avatars: "Avatares",
  "hero-slides": "Carousel",
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function sizeBadge(bytes: number): { icon: string; label: string } | null {
  if (bytes >= 5 * 1024 * 1024) return { icon: "🔴", label: ">5 MB" }
  if (bytes >= 2 * 1024 * 1024) return { icon: "🟠", label: ">2 MB" }
  if (bytes >= 1 * 1024 * 1024) return { icon: "🟡", label: ">1 MB" }
  return null
}

function MetricCard({ label, value, sublabel, icon }: { label: string; value: string; sublabel?: string; icon: string }) {
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

// Plain CSS bars — a real chart library would be overkill for one small
// histogram, and this admin panel doesn't have one installed yet.
function Histogram({ data }: { data: BucketHistogram }) {
  const buckets: { label: string; count: number }[] = [
    { label: "<500KB", count: data.under_500kb },
    { label: "500KB-1MB", count: data.kb500_1mb },
    { label: "1-2MB", count: data.mb1_2 },
    { label: "2-5MB", count: data.mb2_5 },
    { label: ">5MB", count: data.over_5mb },
  ]
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <div className="flex items-end gap-3 h-32">
      {buckets.map((b) => (
        <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-foreground">{b.count}</span>
          <div
            className={`w-full rounded-t-md ${b.label === ">5MB" ? "bg-red-500/60" : b.label === "2-5MB" ? "bg-orange-500/50" : "bg-accent-blue/40"}`}
            style={{ height: `${Math.max(4, (b.count / max) * 100)}%` }}
          />
          <span className="text-[10px] text-text-muted">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminMetricasPage() {
  const [data, setData] = useState<StorageHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [umami, setUmami] = useState<UmamiData | null>(null)
  const [umamiLoading, setUmamiLoading] = useState(true)
  const [umamiError, setUmamiError] = useState("")

  const load = () => {
    setLoading(true)
    setError("")
    fetch("/api/admin/metrics/storage")
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "No se pudo cargar la salud de Storage.")
        setData(json)
        setLastUpdated(new Date())
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la salud de Storage."))
      .finally(() => setLoading(false))

    setUmamiLoading(true)
    setUmamiError("")
    fetch("/api/admin/metrics/umami")
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "No se pudo cargar Umami.")
        setUmami(json)
      })
      .catch((err) => setUmamiError(err instanceof Error ? err.message : "No se pudo cargar Umami."))
      .finally(() => setUmamiLoading(false))
  }

  useEffect(() => {
    load() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const totalBytes = data?.by_bucket.reduce((sum, b) => sum + b.total_bytes, 0) ?? 0
  const totalFiles = data?.by_bucket.reduce((sum, b) => sum + b.file_count, 0) ?? 0
  const listingsBucket = data?.by_bucket.find((b) => b.bucket_id === "listings")
  const listingsHistogram = data?.histogram.find((h) => h.bucket_id === "listings")

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">📊 Métricas</h1>
          <p className="text-sm text-text-muted mt-1">
            Qué está pasando en tu catálogo real, cruzado con Storage — esto no lo ves en el dashboard de Supabase.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-text-muted">
              Actualizado {lastUpdated.toLocaleTimeString("es-AR")}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-xs font-bold text-foreground hover:border-accent-gold/40 hover:text-accent-gold transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Actualizando..." : "🔄 Refrescar"}
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide">
          Visitas (Umami — {umami?.rangeLabel ?? "últimos 7 días"})
        </h2>
        {umamiLoading && !umami ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : umamiError ? (
          <p className="text-sm text-red-500">{umamiError}</p>
        ) : umami ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <MetricCard icon="👁️" label="Pageviews" value={umami.stats.pageviews.toLocaleString("es-AR")} />
              <MetricCard icon="🧑‍🤝‍🧑" label="Visitantes únicos" value={umami.stats.visitors.toLocaleString("es-AR")} />
              <MetricCard icon="🚪" label="Visitas" value={umami.stats.visits.toLocaleString("es-AR")} />
              <MetricCard
                icon="↩️"
                label="Tasa de rebote"
                value={umami.stats.visits > 0 ? `${Math.round((umami.stats.bounces / umami.stats.visits) * 100)}%` : "—"}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-card-bg-solid border border-card-border overflow-hidden">
                <h3 className="px-5 pt-4 pb-2 text-xs font-extrabold text-text-muted uppercase tracking-wide">Páginas más vistas</h3>
                <table className="w-full text-left text-sm border-collapse">
                  <tbody>
                    {umami.topPages.length === 0 ? (
                      <tr><td className="py-4 px-5 text-text-muted">Sin datos todavía.</td></tr>
                    ) : (
                      umami.topPages.map((p) => (
                        <tr key={p.x} className="border-t border-card-border/30">
                          <td className="py-2.5 px-5 text-foreground truncate max-w-55" title={p.x}>{p.x}</td>
                          <td className="py-2.5 px-5 text-right font-bold text-foreground">{p.y.toLocaleString("es-AR")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="rounded-2xl bg-card-bg-solid border border-card-border overflow-hidden">
                <h3 className="px-5 pt-4 pb-2 text-xs font-extrabold text-text-muted uppercase tracking-wide">Referrers</h3>
                <table className="w-full text-left text-sm border-collapse">
                  <tbody>
                    {umami.topReferrers.length === 0 ? (
                      <tr><td className="py-4 px-5 text-text-muted">Sin datos todavía (tráfico directo).</td></tr>
                    ) : (
                      umami.topReferrers.map((r) => (
                        <tr key={r.x} className="border-t border-card-border/30">
                          <td className="py-2.5 px-5 text-foreground truncate max-w-55" title={r.x}>{r.x || "(directo)"}</td>
                          <td className="py-2.5 px-5 text-right font-bold text-foreground">{r.y.toLocaleString("es-AR")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {loading && !data ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard icon="💾" label="Storage total" value={formatBytes(totalBytes)} sublabel={`${totalFiles.toLocaleString("es-AR")} archivos`} />
            <MetricCard
              icon="🧹"
              label="Recuperable (huérfanos)"
              value={formatBytes(data.orphaned_bytes)}
              sublabel={`${data.orphaned_count.toLocaleString("es-AR")} archivos sin producto asociado`}
            />
            <MetricCard
              icon="📦"
              label="Bucket publicaciones"
              value={listingsBucket ? formatBytes(listingsBucket.total_bytes) : "—"}
              sublabel={listingsBucket ? `${listingsBucket.file_count.toLocaleString("es-AR")} imágenes` : undefined}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide">Por Bucket</h2>
            <div className="rounded-2xl bg-card-bg-solid border border-card-border overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-card-border text-text-muted font-bold">
                    <th className="py-3 px-5">Bucket</th>
                    <th className="py-3 px-5">Archivos</th>
                    <th className="py-3 px-5">Total</th>
                    <th className="py-3 px-5">Promedio</th>
                    <th className="py-3 px-5">Máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_bucket.map((b) => (
                    <tr key={b.bucket_id} className="border-b border-card-border/30">
                      <td className="py-3 px-5 font-bold text-foreground">{BUCKET_LABELS[b.bucket_id] ?? b.bucket_id}</td>
                      <td className="py-3 px-5 text-text-muted">{b.file_count.toLocaleString("es-AR")}</td>
                      <td className="py-3 px-5 text-foreground font-bold">{formatBytes(b.total_bytes)}</td>
                      <td className="py-3 px-5 text-text-muted">{formatBytes(b.avg_bytes)}</td>
                      <td className="py-3 px-5 text-text-muted">{formatBytes(b.max_bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {listingsHistogram && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide">
                Distribución de tamaños — Publicaciones
              </h2>
              <div className="rounded-2xl bg-card-bg-solid border border-card-border p-6">
                <Histogram data={listingsHistogram} />
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wide">Archivos Más Pesados</h2>
            <div className="rounded-2xl bg-card-bg-solid border border-card-border overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-card-border text-text-muted font-bold">
                    <th className="py-3 px-5">Archivo</th>
                    <th className="py-3 px-5">Bucket</th>
                    <th className="py-3 px-5">Vendedor</th>
                    <th className="py-3 px-5">Tamaño</th>
                  </tr>
                </thead>
                <tbody>
                  {data.largest.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-5 text-center text-text-muted">
                        No hay archivos en Storage todavía.
                      </td>
                    </tr>
                  ) : (
                    data.largest.map((f) => {
                      const badge = sizeBadge(f.size_bytes)
                      return (
                        <tr key={`${f.bucket_id}/${f.name}`} className="border-b border-card-border/30">
                          <td className="py-3 px-5 text-foreground truncate max-w-70" title={f.name}>
                            {f.name.split("/").pop()}
                          </td>
                          <td className="py-3 px-5 text-text-muted">{BUCKET_LABELS[f.bucket_id] ?? f.bucket_id}</td>
                          <td className="py-3 px-5 text-text-muted">
                            {f.seller_name ? `${f.seller_name}${f.seller_username ? ` (@${f.seller_username})` : ""}` : "—"}
                          </td>
                          <td className="py-3 px-5 font-bold text-foreground">
                            {badge && <span className="mr-1">{badge.icon}</span>}
                            {formatBytes(f.size_bytes)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
