"use client"

import { useEffect, useState } from "react"

interface SupportMessage {
  id: string
  name: string
  email: string
  message: string
  status: string
  created_at: string
}

export default function AdminConsultasPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await fetch("/api/admin/support-messages")
    const data = await res.json()
    if (res.ok) setMessages(data.messages ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const markDone = async (id: string) => {
    await fetch("/api/admin/support-messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "DONE" }),
    })
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Consultas</h1>
        <p className="text-sm text-text-muted mt-1">Mensajes del formulario de Ayuda / Soporte.</p>
      </div>

      <div className="rounded-2xl glass-panel p-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">Todavía no hay consultas.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border border-card-border bg-card-bg p-4 flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{m.name}</p>
                    <a href={`mailto:${m.email}`} className="text-[11px] text-accent-blue hover:underline">
                      {m.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted">
                      {new Date(m.created_at).toLocaleString("es-AR")}
                    </span>
                    {m.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => markDone(m.id)}
                        className="h-7 px-2 rounded-lg border border-accent-green/40 text-accent-green text-[10px] font-extrabold uppercase cursor-pointer"
                      >
                        Marcar vista
                      </button>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase text-accent-green">Vista</span>
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
