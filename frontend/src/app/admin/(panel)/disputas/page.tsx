"use client"

import { useEffect, useState } from "react"

interface Dispute {
  id: string
  amount: number
  dispute_opened_at: string
  dispute_reason: string | null
  admin_notes: string | null
  currencies: { symbol: string } | null
  buyer: { id: string; name: string; phone: string | null } | null
  seller: { id: string; name: string; phone: string | null; bank_cbu: string | null; bank_alias: string | null } | null
  listings: { id: string; image_url: string | null; products: { name: string } | null } | null
}

// The admin's "centro de resolución": every order a buyer flagged with
// "Tengo un problema" lands here (see 022_escrow_payments.sql). There's
// no algorithmic way to decide who's right — this is where a human
// reviews dispute_reason (plus whatever else came in via direct contact
// with both sides) and picks Liberar or Reembolsar, final.
export default function AdminDisputasPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [releasingExpired, setReleasingExpired] = useState(false)
  const [releaseResultMsg, setReleaseResultMsg] = useState("")

  const loadDisputes = () => {
    setLoading(true)
    fetch("/api/admin/disputes")
      .then((res) => res.json())
      .then((data) => setDisputes(data.disputes ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDisputes()
  }, [])

  const handleResolve = async (disputeId: string, decision: "RELEASE" | "REFUND") => {
    const label = decision === "RELEASE" ? "liberar el pago al vendedor" : "reembolsar al comprador"
    if (!confirm(`¿Confirmás ${label}? Esta acción es final.`)) return

    setResolvingId(disputeId)
    setErrorMsg("")
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: notesDraft[disputeId] ?? "" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo resolver la disputa.")
      setDisputes((prev) => prev.filter((d) => d.id !== disputeId))
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo resolver la disputa.")
    } finally {
      setResolvingId(null)
    }
  }

  const handleReleaseExpired = async () => {
    setReleasingExpired(true)
    setReleaseResultMsg("")
    setErrorMsg("")
    try {
      const res = await fetch("/api/admin/orders/release-expired", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo liberar las órdenes vencidas.")
      setReleaseResultMsg(
        data.released === 0
          ? "No había órdenes con el plazo vencido."
          : `Se liberaron ${data.released} orden${data.released === 1 ? "" : "es"} con el plazo vencido.`
      )
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo liberar las órdenes vencidas.")
    } finally {
      setReleasingExpired(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Disputas de Pago</h1>
          <p className="text-sm text-text-muted mt-1">
            Órdenes donde el comprador reportó un problema. La plata queda retenida hasta que decidas.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleReleaseExpired}
            disabled={releasingExpired}
            className="rounded-xl border border-card-border px-4 py-2.5 text-xs font-bold text-foreground hover:border-accent-gold hover:text-accent-gold transition-all cursor-pointer disabled:opacity-50"
          >
            {releasingExpired ? "Liberando..." : "⏱ Liberar órdenes con plazo vencido"}
          </button>
          {releaseResultMsg && <span className="text-[11px] text-accent-green">{releaseResultMsg}</span>}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-red-500/10 text-red-500 p-4 text-xs font-semibold">{errorMsg}</div>
      )}

      <div className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : disputes.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">No hay disputas abiertas. 🎉</p>
        ) : (
          disputes.map((dispute) => {
            const isExpanded = expandedId === dispute.id
            const symbol = dispute.currencies?.symbol ?? "$"
            return (
              <div key={dispute.id} className="rounded-xl border border-card-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-card-bg/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-background border border-card-border shrink-0 flex items-center justify-center">
                      {dispute.listings?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dispute.listings.image_url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-lg">📦</span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground block">
                        {dispute.listings?.products?.name ?? "Publicación"}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {symbol} {Number(dispute.amount).toLocaleString("es-AR")} · reclamado el{" "}
                        {new Date(dispute.dispute_opened_at).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  </div>
                  <span className="text-text-muted">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-card-border p-4 flex flex-col gap-4 bg-background">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-lg border border-card-border p-3">
                        <span className="font-bold text-foreground block mb-1">Comprador</span>
                        <span className="text-text-muted block">{dispute.buyer?.name ?? "—"}</span>
                        {dispute.buyer?.phone && <span className="text-text-muted block">{dispute.buyer.phone}</span>}
                      </div>
                      <div className="rounded-lg border border-card-border p-3">
                        <span className="font-bold text-foreground block mb-1">Vendedor</span>
                        <span className="text-text-muted block">{dispute.seller?.name ?? "—"}</span>
                        {dispute.seller?.phone && <span className="text-text-muted block">{dispute.seller.phone}</span>}
                        {(dispute.seller?.bank_cbu || dispute.seller?.bank_alias) && (
                          <span className="text-text-muted block mt-1">
                            CBU/Alias: {dispute.seller.bank_cbu || dispute.seller.bank_alias}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs">
                      <span className="font-bold text-red-500 block mb-1">Reclamo del comprador</span>
                      <span className="text-foreground">{dispute.dispute_reason || "Sin detalle"}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-foreground">Notas internas (opcional)</label>
                      <textarea
                        value={notesDraft[dispute.id] ?? ""}
                        onChange={(e) => setNotesDraft((prev) => ({ ...prev, [dispute.id]: e.target.value }))}
                        rows={2}
                        placeholder="Ej: hablé con el vendedor, tiene guía de envío escaneada..."
                        className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent-gold resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleResolve(dispute.id, "RELEASE")}
                        disabled={resolvingId === dispute.id}
                        className="flex-1 rounded-lg bg-accent-green text-background py-2.5 text-xs font-extrabold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ✓ Liberar al vendedor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(dispute.id, "REFUND")}
                        disabled={resolvingId === dispute.id}
                        className="flex-1 rounded-lg bg-red-500 text-white py-2.5 text-xs font-extrabold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                      >
                        ↩ Reembolsar al comprador
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
