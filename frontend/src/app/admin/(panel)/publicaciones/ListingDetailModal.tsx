"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface ListingDetail {
  id: string
  price: number
  stock: number
  condition: string
  status: string
  featured_plan: string
  image_url: string | null
  created_at: string
  updated_at: string
  sellerEmail: string | null
  products: {
    name: string
    description: string | null
    brand: string | null
    images: string[] | null
    categories: { name: string } | null
  } | null
  sellers: { id: string; name: string } | null
  currencies: { symbol: string; code: string } | null
}

interface Stats {
  questionsReceived: number
  reportsReceived: number
  favoritesSaved: number
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  APPROVED: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  DELETED: "Eliminada",
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card-bg border border-card-border p-3 flex flex-col items-center text-center">
      <span className="text-xl font-extrabold text-foreground">{value}</span>
      <span className="text-[9px] text-text-muted uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  )
}

export default function ListingDetailModal({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/listings/${listingId}/detail`)
      .then((res) => res.json())
      .then((data) => {
        setListing(data.listing ?? null)
        setStats(data.stats ?? null)
      })
      .finally(() => setLoading(false))
  }, [listingId])

  const thumbnail = listing?.image_url ?? listing?.products?.images?.[0] ?? null
  const isActive = listing?.status === "ACTIVE" || listing?.status === "APPROVED"

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-card-bg border border-card-border p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-foreground text-lg cursor-pointer">
          ✕
        </button>

        {loading ? (
          <p className="text-sm text-text-muted py-10 text-center">Cargando detalle...</p>
        ) : !listing ? (
          <p className="text-sm text-red-500 py-10 text-center">No se pudo cargar la publicación.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4">
              <div className="h-20 w-20 rounded-xl overflow-hidden border border-card-border bg-card-bg-solid shrink-0">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnail} alt={listing.products?.name ?? "Producto"} className="h-full w-full object-contain" />
                ) : (
                  <span className="h-full w-full flex items-center justify-center text-text-muted text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/listings/${listing.id}`}
                  target="_blank"
                  className="font-heading text-lg font-bold text-foreground hover:text-accent-gold transition-colors"
                >
                  {listing.products?.name ?? "Sin nombre"}
                </Link>
                <p className="text-sm text-text-muted mt-0.5">
                  {listing.products?.brand ?? "Sin marca"} · {listing.products?.categories?.name ?? "Sin categoría"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-card-border/30 text-text-muted">
                    {listing.condition === "NEW" ? "Nuevo" : "Usado"}
                  </span>
                </div>
              </div>
            </div>

            {listing.products?.description && (
              <p className="text-sm text-foreground/90 leading-relaxed">{listing.products.description}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-text-muted">
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Creado por</span>
                {listing.sellers?.name ?? "—"}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Email del vendedor</span>
                {listing.sellerEmail ?? "—"}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Precio</span>
                {listing.currencies?.symbol ?? "$"}
                {Number(listing.price).toLocaleString("es-AR")}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Stock</span>
                {listing.stock}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Publicada desde</span>
                {new Date(listing.created_at).toLocaleDateString("es-AR")}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Última actualización</span>
                {new Date(listing.updated_at).toLocaleDateString("es-AR")}
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile label="Favoritos guardados" value={stats.favoritesSaved} />
                <StatTile label="Preguntas recibidas" value={stats.questionsReceived} />
                <StatTile label="Reclamos recibidos" value={stats.reportsReceived} />
              </div>
            )}

            <p className="text-[10px] text-text-muted/70 italic">
              La cantidad de visitas no se muestra porque el sitio todavía no registra vistas de publicaciones.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
