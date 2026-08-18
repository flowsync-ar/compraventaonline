"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface UserDetail {
  id: string
  name: string
  email: string | null
  phone: string | null
  location: string | null
  type: string
  score: number
  tier: string
  status: "ACTIVE" | "SUSPENDED"
  created_at: string
}

interface UserStats {
  totalListings: number
  activeListings: number
  soldListings: number
  pausedListings: number
  deletedListings: number
  reportsReceived: number
  favoritesSaved: number
  questionsAsked: number
  questionsReceived: number
}

interface ListingRow {
  id: string
  price: number
  status: string
  created_at: string
  products: { name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  APPROVED: "Activa",
  SOLD: "Vendida",
  PAUSED: "Pausada",
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

export default function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [listings, setListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/detail`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user ?? null)
        setStats(data.stats ?? null)
        setListings(data.listings ?? [])
      })
      .finally(() => setLoading(false))
  }, [userId])

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
          <p className="text-sm text-text-muted py-10 text-center">Cargando historial...</p>
        ) : !user ? (
          <p className="text-sm text-red-500 py-10 text-center">No se pudo cargar el usuario.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">{user.name}</h3>
              <p className="text-sm text-text-muted mt-0.5">{user.email ?? "Sin email registrado"}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    user.status === "ACTIVE" ? "bg-accent-green/10 text-accent-green" : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {user.status === "ACTIVE" ? "Activo" : "Suspendido"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-accent-gold/10 text-accent-gold">
                  {user.tier}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-card-border/30 text-text-muted">
                  {user.type === "BUSINESS_SELLER" ? "Empresa" : "Personal"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-text-muted">
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Teléfono</span>
                {user.phone ?? "—"}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Ubicación</span>
                {user.location ?? "—"}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Registrado</span>
                {new Date(user.created_at).toLocaleDateString("es-AR")}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Score</span>
                {user.score} / 100
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-4 gap-2.5">
                <StatTile label="Activas" value={stats.activeListings} />
                <StatTile label="Vendidas" value={stats.soldListings} />
                <StatTile label="Pausadas" value={stats.pausedListings} />
                <StatTile label="Eliminadas" value={stats.deletedListings} />
                <StatTile label="Reclamos recibidos" value={stats.reportsReceived} />
                <StatTile label="Favoritos guardados" value={stats.favoritesSaved} />
                <StatTile label="Preguntas hechas" value={stats.questionsAsked} />
                <StatTile label="Preguntas recibidas" value={stats.questionsReceived} />
              </div>
            )}

            <div>
              <h4 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-3">
                Publicaciones ({listings.length})
              </h4>
              {listings.length === 0 ? (
                <p className="text-sm text-text-muted">Todavía no publicó ningún artículo.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {listings.map((l) => (
                    <Link
                      key={l.id}
                      href={`/listings/${l.id}`}
                      target="_blank"
                      className="flex items-center justify-between gap-3 text-sm bg-card-bg-solid border border-card-border/50 rounded-lg px-3 py-2 hover:border-accent-gold/40 transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-foreground truncate flex-1 hover:text-accent-gold transition-colors">
                        {l.products?.name ?? "Sin nombre"}
                      </span>
                      <span className="text-text-muted whitespace-nowrap">${Number(l.price).toLocaleString("es-AR")}</span>
                      <span
                        className={`text-[9px] font-extrabold uppercase rounded-full px-2 py-0.5 whitespace-nowrap ${
                          l.status === "ACTIVE" || l.status === "APPROVED"
                            ? "bg-accent-green/10 text-accent-green"
                            : "bg-card-border/30 text-text-muted"
                        }`}
                      >
                        {STATUS_LABELS[l.status] ?? l.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
