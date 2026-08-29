"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ConfirmModal from "@/components/ConfirmModal"
import {
  type NotifKind,
  loadNotifTray,
  saveNotifTray,
  isOutOfInbox,
  isClosed,
  isDeleted,
  closeNotif,
  restoreNotif,
  deleteNotif,
  emptyClosed,
  closedCount,
} from "@/lib/notificationTray"

interface InboxItem {
  id: string
  type: "category" | "support" | "report"
  title: string
  subtitle: string
  href: string
  created_at: string
}

const ADMIN_TRAY_ID = "admin"
const SECTION: { type: InboxItem["type"]; label: string }[] = [
  { type: "category", label: "Categorías pedidas" },
  { type: "support", label: "Consultas generales" },
  { type: "report", label: "Reclamos" },
]

function NotifCloseButton({ onClick, label = "Cerrar notificación" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className="shrink-0 h-5 w-5 rounded-md text-text-muted hover:text-foreground hover:bg-card-border/40 text-[11px] font-bold leading-none cursor-pointer"
      title={label}
      aria-label={label}
    >
      ✕
    </button>
  )
}

export default function AdminInboxBell() {
  const [open, setOpen] = useState(false)
  const [notifTab, setNotifTab] = useState<"inbox" | "closed">("inbox")
  const [items, setItems] = useState<InboxItem[]>([])
  const [notifTray, setNotifTray] = useState(() =>
    typeof window === "undefined" ? loadNotifTray(ADMIN_TRAY_ID) : loadNotifTray(ADMIN_TRAY_ID)
  )
  const [confirmEmptyClosed, setConfirmEmptyClosed] = useState(false)

  useEffect(() => {
    setNotifTray(loadNotifTray(ADMIN_TRAY_ID))
  }, [])

  const persistTray = (updater: (prev: typeof notifTray) => typeof notifTray) => {
    setNotifTray((prev) => {
      const next = updater(prev)
      saveNotifTray(ADMIN_TRAY_ID, next)
      return next
    })
  }

  const load = async () => {
    try {
      const res = await fetch("/api/admin/inbox")
      const data = await res.json()
      if (!res.ok) return
      setItems(data.items ?? [])
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  const visible = items.filter((item) => !isDeleted(notifTray, item.type, item.id))
  const inboxItems = visible.filter((item) => !isOutOfInbox(notifTray, item.type, item.id))
  const closedItems = visible.filter((item) => isClosed(notifTray, item.type, item.id))
  const unreadCount = inboxItems.length
  const closedTotal = closedCount(notifTray)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          setNotifTab("inbox")
        }}
        className="relative p-2 text-text-muted hover:text-foreground transition-colors hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center rounded-xl bg-card-bg border border-card-border/80 hover:border-card-border h-9 w-9 shadow-sm"
        title="Notificaciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-5 w-5 text-[9px] font-extrabold leading-none text-white bg-red-500 rounded-full border border-background shadow-md animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-3 w-96 rounded-2xl bg-card-bg-solid border border-card-border p-4 shadow-2xl z-50 flex flex-col gap-3 max-h-[70vh] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex shrink-0 border-b border-card-border">
              <button
                type="button"
                onClick={() => setNotifTab("inbox")}
                className={`flex-1 pb-2.5 text-[11px] font-extrabold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                  notifTab === "inbox"
                    ? "border-accent-gold text-foreground"
                    : "border-transparent text-text-muted hover:text-foreground"
                }`}
              >
                Nuevas{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setNotifTab("closed")}
                className={`flex-1 pb-2.5 text-[11px] font-extrabold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                  notifTab === "closed"
                    ? "border-accent-gold text-foreground"
                    : "border-transparent text-text-muted hover:text-foreground"
                }`}
              >
                Cerradas{closedTotal > 0 ? ` (${closedTotal})` : ""}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
              {notifTab === "inbox" && inboxItems.length === 0 && (
                <p className="text-xs text-text-muted text-center py-6">No tenés ninguna consulta por el momento.</p>
              )}

              {notifTab === "inbox" &&
                SECTION.map(({ type, label }) => {
                  const group = inboxItems.filter((item) => item.type === type)
                  if (group.length === 0) return null
                  return (
                    <div key={type} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center border-b border-card-border/30 pb-2">
                        <span className="text-xs font-heading font-extrabold text-foreground uppercase tracking-wider">
                          {label}
                        </span>
                      </div>
                      {group.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border bg-accent-gold/5 border-accent-gold/20 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className="font-bold text-foreground line-clamp-2 hover:text-accent-gold"
                            >
                              {item.title}
                            </Link>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[9px] text-text-muted">
                                {new Date(item.created_at).toLocaleDateString("es-AR")}
                              </span>
                              <NotifCloseButton onClick={() => persistTray((prev) => closeNotif(prev, item.type, item.id))} />
                            </div>
                          </div>
                          <p className="text-text-muted line-clamp-2">{item.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  )
                })}

              {notifTab === "closed" && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-text-muted">
                      {closedItems.length === 0
                        ? "No hay notificaciones cerradas."
                        : "Si cerraste una por error, restaurála. Vaciar no se puede deshacer."}
                    </span>
                    {closedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setConfirmEmptyClosed(true)}
                        className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer shrink-0"
                      >
                        Vaciar
                      </button>
                    )}
                  </div>
                  {closedItems.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl border border-card-border/50 bg-card-bg/40 flex flex-col gap-1 text-xs opacity-80">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-foreground line-clamp-2">{item.title}</span>
                        <NotifCloseButton
                          label="Borrar de forma permanente"
                          onClick={() => persistTray((prev) => deleteNotif(prev, item.type, item.id))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => persistTray((prev) => restoreNotif(prev, item.type as NotifKind, item.id))}
                        className="self-start text-[10px] font-bold text-accent-gold hover:underline cursor-pointer"
                      >
                        Restaurar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={confirmEmptyClosed}
        type="danger"
        title="Vaciar notificaciones cerradas"
        description="Se van a eliminar todas las notificaciones cerradas. No se pueden recuperar."
        confirmText="Vaciar"
        cancelText="Cancelar"
        onCancel={() => setConfirmEmptyClosed(false)}
        onConfirm={() => {
          persistTray((prev) => emptyClosed(prev))
          setConfirmEmptyClosed(false)
        }}
      />
    </div>
  )
}
