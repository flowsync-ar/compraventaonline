"use client"

import { useEffect, useMemo, useState } from "react"
import ConfirmModal from "@/components/ConfirmModal"

interface BusinessSeller {
  id: string
  name: string
  location: string | null
}

interface SellerListing {
  id: string
  price: number
  status: string
  image_url: string | null
  products: { name: string; images: string[] | null } | null
  currencies: { symbol: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  APPROVED: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
}

function computeNewPrice(oldPrice: number, mode: "PERCENT" | "FIXED", value: number): number {
  const raw = mode === "PERCENT" ? oldPrice * (1 + value / 100) : oldPrice + value
  return Math.max(0, Math.round(raw))
}

export default function AdminPreciosPage() {
  const [sellers, setSellers] = useState<BusinessSeller[]>([])
  const [sellersLoading, setSellersLoading] = useState(true)
  const [selectedSellerId, setSelectedSellerId] = useState("")

  const [listings, setListings] = useState<SellerListing[]>([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [mode, setMode] = useState<"PERCENT" | "FIXED">("PERCENT")
  const [value, setValue] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("sellerId")
    if (fromUrl) setSelectedSellerId(fromUrl)
    const loadSellers = async () => {
      const res = await fetch("/api/admin/pricing/sellers")
      const data = await res.json()
      if (res.ok) setSellers(data.sellers)
      setSellersLoading(false)
    }
    loadSellers() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const loadListings = async (sellerId: string) => {
    setListingsLoading(true)
    setSelectedIds(new Set())
    setSuccessMsg(null)
    setError(null)
    const res = await fetch(`/api/admin/pricing/listings?sellerId=${sellerId}`)
    const data = await res.json()
    if (res.ok) setListings(data.listings)
    setListingsLoading(false)
  }

  useEffect(() => {
    if (selectedSellerId) loadListings(selectedSellerId) // eslint-disable-line react-hooks/set-state-in-effect
    else setListings([])
  }, [selectedSellerId])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === listings.length ? new Set() : new Set(listings.map((l) => l.id))
    )
  }

  const numericValue = Number(value)
  const canApply = selectedIds.size > 0 && Number.isFinite(numericValue) && numericValue !== 0

  const selectedListings = useMemo(
    () => listings.filter((l) => selectedIds.has(l.id)),
    [listings, selectedIds]
  )

  const handleApply = async () => {
    setApplying(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/pricing/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: selectedSellerId,
          listingIds: Array.from(selectedIds),
          mode,
          value: numericValue,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo aplicar el aumento")
      setSuccessMsg(`Se actualizaron ${data.updated} publicaciones.`)
      setConfirmOpen(false)
      loadListings(selectedSellerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar el aumento")
    } finally {
      setApplying(false)
    }
  }

  const selectedSellerName = sellers.find((s) => s.id === selectedSellerId)?.name ?? ""

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Lista de Precios</h1>
        <p className="text-sm text-text-muted mt-1">
          Elegí un comercio y aplicá un aumento masivo (%, o monto fijo) a los productos que corresponda.
        </p>
      </div>

      <div className="rounded-2xl glass-panel p-6 flex flex-col gap-2 max-w-md">
        <label className="text-sm font-bold text-foreground">Comercio</label>
        <select
          value={selectedSellerId}
          onChange={(e) => setSelectedSellerId(e.target.value)}
          disabled={sellersLoading}
          className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
        >
          <option value="">
            {sellersLoading ? "Cargando comercios..." : "— Elegir comercio —"}
          </option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.location ? ` (${s.location})` : ""}
            </option>
          ))}
        </select>
        {!sellersLoading && sellers.length === 0 && (
          <p className="text-xs text-text-muted">No hay comercios (vendedores tipo BUSINESS_SELLER) cargados todavía.</p>
        )}
      </div>

      {selectedSellerId && (
        <div className="rounded-2xl glass-panel p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground opacity-0 select-none hidden sm:block">Modo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("PERCENT")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                    mode === "PERCENT" ? "bg-accent-gold text-white" : "bg-card-bg border border-card-border text-foreground"
                  }`}
                >
                  Porcentaje
                </button>
                <button
                  type="button"
                  onClick={() => setMode("FIXED")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                    mode === "FIXED" ? "bg-accent-gold text-white" : "bg-card-bg border border-card-border text-foreground"
                  }`}
                >
                  Monto fijo
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">
                {mode === "PERCENT" ? "Aumento (%)" : "Aumento ($)"}
              </label>
              <input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === "PERCENT" ? "ej: 15" : "ej: 500"}
                className="w-40 bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
              />
              <p className="text-[10px] text-text-muted">Usá un valor negativo para bajar precios.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground opacity-0 select-none hidden sm:block">Aplicar</label>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!canApply}
                className="rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Aplicar a {selectedIds.size} producto{selectedIds.size === 1 ? "" : "s"}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
          {successMsg && <p className="text-xs text-accent-green font-bold">✓ {successMsg}</p>}

          {listingsLoading ? (
            <p className="text-sm text-text-muted">Cargando catálogo...</p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">Este comercio no tiene publicaciones.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-card-border text-text-muted font-bold select-none">
                    <th className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={listings.length > 0 && selectedIds.size === listings.length}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="py-2 pr-3">Foto</th>
                    <th className="py-2 pr-3">Artículo</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3 text-right">Precio actual</th>
                    <th className="py-2 text-right">Precio nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => {
                    const thumbnail = listing.image_url ?? listing.products?.images?.[0] ?? null
                    const symbol = listing.currencies?.symbol ?? "$"
                    const isSelected = selectedIds.has(listing.id)
                    const preview = Number.isFinite(numericValue) && numericValue !== 0
                      ? computeNewPrice(Number(listing.price), mode, numericValue)
                      : null
                    return (
                      <tr key={listing.id} className="border-b border-card-border/30 hover:bg-card-bg/30 transition-colors">
                        <td className="py-2.5 pr-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(listing.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-card-border bg-card-bg shrink-0">
                            {thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbnail} alt={listing.products?.name ?? "Producto"} className="h-full w-full object-contain" />
                            ) : (
                              <span className="h-full w-full flex items-center justify-center text-text-muted text-base">📦</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 font-bold text-foreground">{listing.products?.name ?? "Sin nombre"}</td>
                        <td className="py-2.5 pr-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-card-border/30 text-text-muted">
                            {STATUS_LABELS[listing.status] ?? listing.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-text-muted whitespace-nowrap">
                          {symbol}{Number(listing.price).toLocaleString("es-AR")}
                        </td>
                        <td className={`py-2.5 text-right font-bold whitespace-nowrap ${isSelected && preview !== null ? "text-accent-green" : "text-text-muted"}`}>
                          {isSelected && preview !== null ? `${symbol}${preview.toLocaleString("es-AR")}` : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title="Aplicar aumento de precios"
        description={`¿Aplicar ${mode === "PERCENT" ? `${numericValue}%` : `$${numericValue.toLocaleString("es-AR")}`} a ${selectedListings.length} producto${selectedListings.length === 1 ? "" : "s"} de "${selectedSellerName}"? Los precios se actualizan al instante.`}
        confirmText="Aplicar"
        type="warning"
        isLoading={applying}
        onConfirm={handleApply}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
