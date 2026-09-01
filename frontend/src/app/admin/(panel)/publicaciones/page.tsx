"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ConfirmModal from "@/components/ConfirmModal"
import ListingDetailModal from "./ListingDetailModal"

interface AdminListing {
  id: string
  price: number
  status: string
  image_url: string | null
  created_at: string
  products: { name: string; images: string[] | null } | null
  sellers: { id: string; name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  APPROVED: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  DELETED: "Eliminada",
}

export default function AdminPublicacionesPage() {
  const [listings, setListings] = useState<AdminListing[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AdminListing | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detailListingId, setDetailListingId] = useState<string | null>(null)
  const [pauseTarget, setPauseTarget] = useState<AdminListing | null>(null)

  const loadListings = async () => {
    const res = await fetch("/api/admin/listings")
    const data = await res.json()
    if (res.ok) setListings(data.listings)
    setLoading(false)
  }

  useEffect(() => {
    loadListings() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const handleTogglePause = async () => {
    if (!pauseTarget) return
    const isActive = pauseTarget.status === "ACTIVE" || pauseTarget.status === "APPROVED"
    const action = isActive ? "pause" : "reactivate"

    setPendingId(pauseTarget.id)
    try {
      const res = await fetch(`/api/admin/listings/${pauseTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo actualizar la publicación.")
        return
      }
      setPauseTarget(null)
      loadListings()
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/listings/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo eliminar la publicación.")
        return
      }
      setDeleteTarget(null)
      loadListings()
    } finally {
      setDeleting(false)
    }
  }

  const filtered = listings.filter(
    (l) =>
      (l.products?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.sellers?.name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground">Publicaciones</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por artículo o vendedor..."
          className="w-full sm:w-64 bg-background border border-card-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
        />
      </div>

      <div className="rounded-2xl glass-panel p-3 sm:p-6">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">No se encontraron publicaciones.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:hidden">
              {filtered.map((listing) => {
                const isActive = listing.status === "ACTIVE" || listing.status === "APPROVED"
                const thumbnail = listing.image_url ?? listing.products?.images?.[0] ?? null
                return (
                  <div key={listing.id} className="rounded-xl border border-card-border bg-background/40 p-3 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/listings/${listing.id}`}
                        target="_blank"
                        className="block h-16 w-16 rounded-lg overflow-hidden border border-card-border bg-card-bg shrink-0"
                      >
                        {thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbnail} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="h-full w-full flex items-center justify-center text-text-muted text-lg">📦</span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/listings/${listing.id}`}
                          target="_blank"
                          className="text-sm font-extrabold text-foreground break-words leading-snug hover:text-accent-gold"
                        >
                          {listing.products?.name ?? "Sin nombre"}
                        </Link>
                        <p className="text-[11px] text-text-muted mt-0.5 break-words">{listing.sellers?.name ?? "Sin vendedor"}</p>
                        <p className="text-sm font-bold text-foreground mt-1">
                          ${Number(listing.price).toLocaleString("es-AR")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isActive
                            ? "bg-accent-green/10 text-accent-green"
                            : listing.status === "SOLD"
                              ? "bg-accent-gold/10 text-accent-gold"
                              : "bg-card-border/30 text-text-muted"
                        }`}
                      >
                        {STATUS_LABELS[listing.status] ?? listing.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailListingId(listing.id)}
                        className="h-9 px-3 rounded-lg border border-card-border bg-card-bg text-xs font-bold text-foreground cursor-pointer"
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => setPauseTarget(listing)}
                        disabled={pendingId === listing.id}
                        className="h-9 px-3 rounded-lg border border-card-border bg-card-bg text-xs font-bold text-foreground cursor-pointer disabled:opacity-50"
                      >
                        {isActive ? "Pausar" : "Reactivar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(listing)}
                        disabled={pendingId === listing.id}
                        className="h-9 px-3 rounded-lg border border-red-500/30 bg-card-bg text-xs font-bold text-red-500 cursor-pointer disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-card-border text-text-muted font-bold select-none">
                <th className="py-2 pr-4">Foto</th>
                <th className="py-2">Artículo</th>
                <th className="py-2">Vendedor</th>
                <th className="py-2">Precio</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Publicado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((listing) => {
                const isActive = listing.status === "ACTIVE" || listing.status === "APPROVED"
                const thumbnail = listing.image_url ?? listing.products?.images?.[0] ?? null
                return (
                  <tr key={listing.id} className="border-b border-card-border/30 hover:bg-card-bg/30 transition-colors">
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/listings/${listing.id}`}
                        target="_blank"
                        className="block h-12 w-12 rounded-lg overflow-hidden border border-card-border bg-card-bg shrink-0"
                      >
                        {thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbnail} alt={listing.products?.name ?? "Producto"} className="h-full w-full object-contain" />
                        ) : (
                          <span className="h-full w-full flex items-center justify-center text-text-muted text-lg">📦</span>
                        )}
                      </Link>
                    </td>
                    <td className="py-2.5 font-bold text-foreground">
                      <Link href={`/listings/${listing.id}`} target="_blank" className="hover:text-accent-gold transition-colors">
                        {listing.products?.name ?? "Sin nombre"}
                      </Link>
                    </td>
                    <td className="py-2.5 text-text-muted">{listing.sellers?.name ?? "—"}</td>
                    <td className="py-2.5 text-text-muted whitespace-nowrap">
                      ${Number(listing.price).toLocaleString("es-AR")}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isActive
                            ? "bg-accent-green/10 text-accent-green"
                            : listing.status === "SOLD"
                              ? "bg-accent-gold/10 text-accent-gold"
                              : "bg-card-border/30 text-text-muted"
                        }`}
                      >
                        {STATUS_LABELS[listing.status] ?? listing.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-text-muted whitespace-nowrap">
                      {new Date(listing.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <div className="relative group">
                          <button
                            onClick={() => setDetailListingId(listing.id)}
                            className="bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </button>
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                            Ver detalle
                          </span>
                        </div>

                        <div className="relative group">
                          <button
                            onClick={() => setPauseTarget(listing)}
                            disabled={pendingId === listing.id}
                            className={`bg-card-bg border border-card-border h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${
                              isActive
                                ? "text-orange-500 hover:border-orange-500/40"
                                : "text-accent-green hover:border-accent-green/40"
                            }`}
                          >
                            {isActive ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z" />
                              </svg>
                            )}
                          </button>
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                            {isActive ? "Pausar" : "Reactivar"}
                          </span>
                        </div>

                        <div className="relative group">
                          <button
                            onClick={() => setDeleteTarget(listing)}
                            disabled={pendingId === listing.id}
                            className="bg-card-bg border border-card-border text-red-500 hover:border-red-500/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m9.96-3.08c.18.04.36.08.54.13M15 3.57a48.008 48.008 0 0 0-6 0M4.5 6.08c.18-.05.36-.09.54-.13M18 6.08a48.108 48.108 0 0 0-12 0M6.25 6.08l.81 12.35c.04.83.69 1.5 1.52 1.5H15.4c.83 0 1.48-.67 1.52-1.5l.81-12.35m-9.96 0h12" />
                            </svg>
                          </button>
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                            Eliminar
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Eliminar publicación"
        description={`¿Eliminar definitivamente "${deleteTarget?.products?.name ?? "esta publicación"}"? No se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        isOpen={pauseTarget !== null}
        title={pauseTarget?.status === "ACTIVE" || pauseTarget?.status === "APPROVED" ? "Pausar publicación" : "Reactivar publicación"}
        description={`¿Seguro que querés ${pauseTarget?.status === "ACTIVE" || pauseTarget?.status === "APPROVED" ? "pausar" : "reactivar"} "${pauseTarget?.products?.name ?? "esta publicación"}"?`}
        confirmText={pauseTarget?.status === "ACTIVE" || pauseTarget?.status === "APPROVED" ? "Pausar" : "Reactivar"}
        type="warning"
        isLoading={pendingId === pauseTarget?.id}
        onConfirm={handleTogglePause}
        onCancel={() => setPauseTarget(null)}
      />

      {detailListingId && (
        <ListingDetailModal listingId={detailListingId} onClose={() => setDetailListingId(null)} />
      )}
    </div>
  )
}
