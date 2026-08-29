"use client"

import { useEffect, useMemo, useState } from "react"

interface SupportMessage {
  id: string
  name: string
  email: string
  message: string
  status: string
  created_at: string
}

type Status = "PENDING" | "DONE" | "ARCHIVED"
type View = "inbox" | "history"

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { hour12: false })
}

export default function AdminConsultasPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>("inbox")
  const [contactQuery, setContactQuery] = useState("")
  const [descriptionQuery, setDescriptionQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch("/api/admin/support-messages", { cache: "no-store" })
    const data = await res.json()
    if (res.ok) setMessages(data.messages ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const setStatus = async (id: string, status: Status) => {
    setUpdatingId(id)
    const res = await fetch("/api/admin/support-messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) await load()
    setUpdatingId(null)
  }

  const inbox = messages.filter((m) => m.status !== "ARCHIVED")
  const history = messages.filter((m) => m.status === "ARCHIVED")

  const filteredHistory = useMemo(() => {
    const contact = fold(contactQuery.trim())
    const description = fold(descriptionQuery.trim())
    return history.filter((m) => {
      const matchesContact =
        !contact || fold(m.name).includes(contact) || fold(m.email).includes(contact)
      const matchesDescription = !description || fold(m.message).includes(description)
      return matchesContact && matchesDescription
    })
  }, [history, contactQuery, descriptionQuery])

  const list = view === "inbox" ? inbox : filteredHistory

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Consultas</h1>
        <p className="text-sm text-text-muted mt-1">Mensajes de Ayuda, comercios y consultas de publicidad.</p>
      </div>

      <div className="flex flex-wrap w-full bg-card-bg border border-card-border p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setView("inbox")}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            view === "inbox" ? "bg-accent-blue text-white shadow-md" : "text-foreground/80 hover:text-accent-blue"
          }`}
        >
          Consultas ({inbox.length})
        </button>
        <button
          type="button"
          onClick={() => setView("history")}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            view === "history" ? "bg-accent-blue text-white shadow-md" : "text-foreground/80 hover:text-accent-blue"
          }`}
        >
          Consultas históricas ({history.length})
        </button>
      </div>

      <div className="rounded-2xl glass-panel p-6 overflow-x-auto flex flex-col gap-4">
        {view === "history" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-foreground">Buscar por nombre o email</label>
              <input
                type="search"
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
                placeholder="Ej. Ramiro o correo@..."
                className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-foreground">Buscar por descripción</label>
              <input
                type="search"
                value={descriptionQuery}
                onChange={(e) => setDescriptionQuery(e.target.value)}
                placeholder="Texto del mensaje..."
                className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
              />
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">
            {view === "inbox"
              ? "Todavía no hay consultas."
              : history.length === 0
                ? "Todavía no hay consultas históricas."
                : "Ninguna consulta coincide con la búsqueda."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((m) => (
              <div key={m.id} className="rounded-xl border border-card-border bg-card-bg p-4 flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{m.name}</p>
                    <a href={`mailto:${m.email}`} className="text-[11px] text-accent-blue hover:underline">
                      {m.email}
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-[10px] text-text-muted">{formatWhen(m.created_at)}</span>
                    {view === "inbox" ? (
                      <>
                        {m.status === "PENDING" ? (
                          <button
                            type="button"
                            disabled={updatingId === m.id}
                            onClick={() => setStatus(m.id, "DONE")}
                            className="h-7 px-2 rounded-lg border border-accent-green/40 text-accent-green text-[10px] font-extrabold uppercase cursor-pointer disabled:opacity-50"
                          >
                            Marcar vista
                          </button>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase text-accent-green">Vista</span>
                        )}
                        <button
                          type="button"
                          disabled={updatingId === m.id}
                          onClick={() => setStatus(m.id, "ARCHIVED")}
                          className="h-7 px-2 rounded-lg border border-card-border text-text-muted text-[10px] font-extrabold uppercase cursor-pointer disabled:opacity-50"
                        >
                          A históricas
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={updatingId === m.id}
                        onClick={() => setStatus(m.id, "DONE")}
                        className="h-7 px-2 rounded-lg border border-card-border text-text-muted text-[10px] font-extrabold uppercase cursor-pointer disabled:opacity-50"
                      >
                        Volver a consultas
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
