"use client"

import { useEffect, useState } from "react"
import UserDetailModal from "./UserDetailModal"
import CreateUserModal from "./CreateUserModal"
import ConfirmModal from "@/components/ConfirmModal"

interface AdminUser {
  id: string
  user_id: string
  name: string
  email: string | null
  type: string
  phone: string | null
  location: string | null
  status: "ACTIVE" | "SUSPENDED"
  created_at: string
  identity_verified: boolean
  highlight_free: boolean
  fantasma?: boolean
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [verifyTarget, setVerifyTarget] = useState<AdminUser | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [highlightTarget, setHighlightTarget] = useState<AdminUser | null>(null)
  const [togglingHighlight, setTogglingHighlight] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users")
    const data = await res.json()
    if (res.ok) {
      setUsers(data.users ?? [])
      setLoadError(null)
    } else {
      setUsers([])
      setLoadError(data.error ?? "No se pudo cargar la lista de usuarios.")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const handleToggleStatus = async (user: AdminUser) => {
    const action = user.status === "ACTIVE" ? "suspend" : "reactivate"
    const verb = action === "suspend" ? "suspender" : "reactivar"
    if (!confirm(`¿Seguro que querés ${verb} a ${user.name}?`)) return

    setPendingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo actualizar el estado del usuario.")
        return
      }
      loadUsers()
    } finally {
      setPendingId(null)
    }
  }

  const handleVerifyIdentity = async () => {
    if (!verifyTarget) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/admin/users/${verifyTarget.id}/identity`, { method: "PATCH" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo activar la verificación.")
        return
      }
      setVerifyTarget(null)
      loadUsers()
    } finally {
      setVerifying(false)
    }
  }

  const handleToggleHighlightFree = async () => {
    if (!highlightTarget) return
    setTogglingHighlight(true)
    try {
      const res = await fetch(`/api/admin/users/${highlightTarget.id}/highlight-free`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !highlightTarget.highlight_free }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo actualizar el destacado gratis.")
        return
      }
      setHighlightTarget(null)
      loadUsers()
    } finally {
      setTogglingHighlight(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo eliminar el usuario.")
        return
      }
      setDeleteTarget(null)
      loadUsers()
    } finally {
      setDeleting(false)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.phone ?? "").includes(search)
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground">Usuarios</h1>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="h-10 w-full sm:w-auto px-4 rounded-xl bg-accent-gold text-sm font-extrabold text-background cursor-pointer"
          >
            Crear usuario
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full bg-background border border-card-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
        />
      </div>

      <div className="rounded-2xl glass-panel p-3 sm:p-6">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">No se encontraron usuarios.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:hidden">
              {filtered.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-card-border bg-background/40 p-3 flex flex-col gap-3 cursor-pointer"
                  onClick={() => setDetailUserId(user.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-foreground break-words">{user.name}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {user.type === "BUSINESS_SELLER" ? "Empresa" : "Personal"}
                        {user.location ? ` · ${user.location}` : ""}
                        {user.fantasma ? " · Fantasma" : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        user.status === "ACTIVE"
                          ? "bg-accent-green/10 text-accent-green"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {user.status === "ACTIVE" ? "Activo" : "Suspendido"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setDetailUserId(user.id)}
                      className="h-9 px-3 rounded-lg border border-card-border bg-card-bg text-xs font-bold text-foreground cursor-pointer"
                    >
                      Editar
                    </button>
                    {!user.identity_verified && (
                      <button
                        type="button"
                        onClick={() => setVerifyTarget(user)}
                        disabled={pendingId === user.id}
                        className="h-9 px-3 rounded-lg border border-accent-blue/40 bg-accent-blue/10 text-accent-blue text-xs font-extrabold cursor-pointer disabled:opacity-50"
                      >
                        Verificar ID
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setHighlightTarget(user)}
                      disabled={pendingId === user.id}
                      className="h-9 px-3 rounded-lg border border-card-border bg-card-bg text-xs font-bold text-foreground cursor-pointer disabled:opacity-50"
                    >
                      {user.highlight_free ? "Quitar gratis" : "Destacar gratis"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user)}
                      disabled={pendingId === user.id}
                      className="h-9 px-3 rounded-lg border border-card-border bg-card-bg text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {user.status === "ACTIVE" ? "Suspender" : "Reactivar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(user)}
                      disabled={pendingId === user.id}
                      className="h-9 px-3 rounded-lg border border-red-500/30 bg-card-bg text-xs font-bold text-red-500 cursor-pointer disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-card-border text-text-muted font-bold select-none">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 px-4">Tipo</th>
                <th className="py-2 px-4">Ubicación</th>
                <th className="py-2 px-4">Fantasma</th>
                <th className="py-2 px-4">Estado</th>
                <th className="py-2 pl-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setDetailUserId(user.id)}
                  className="border-b border-card-border/30 hover:bg-card-bg/30 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 pr-4 font-bold text-foreground">{user.name}</td>
                  <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">
                    {user.type === "BUSINESS_SELLER" ? "Empresa" : "Personal"}
                  </td>
                  <td className="py-2.5 px-4 text-text-muted">{user.location ?? "—"}</td>
                  <td className="py-2.5 px-4">
                    {user.fantasma ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-accent-blue/10 text-accent-blue">
                        Sí
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        user.status === "ACTIVE"
                          ? "bg-accent-green/10 text-accent-green"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {user.status === "ACTIVE" ? "Activo" : "Suspendido"}
                    </span>
                  </td>
                  <td className="py-2.5 pl-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative group">
                        <button
                          onClick={() => setDetailUserId(user.id)}
                          className="bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                          Ver ficha
                        </span>
                      </div>

                      {!user.identity_verified && (
                        <button
                          type="button"
                          onClick={() => setVerifyTarget(user)}
                          disabled={pendingId === user.id}
                          className="h-8 px-2.5 rounded-lg border border-accent-blue/40 bg-accent-blue/10 text-accent-blue text-[10px] font-extrabold uppercase tracking-wide hover:bg-accent-blue/15 transition-all cursor-pointer disabled:opacity-50"
                        >
                          Verificar ID
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setHighlightTarget(user)}
                        disabled={pendingId === user.id}
                        className={`h-8 px-2.5 rounded-lg border text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50 ${
                          user.highlight_free
                            ? "border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/15"
                            : "border-card-border bg-card-bg text-foreground hover:border-accent-gold/40"
                        }`}
                      >
                        {user.highlight_free ? "Quitar gratis" : "Destacar gratis"}
                      </button>

                      <div className="relative group">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={pendingId === user.id}
                          className={`bg-card-bg border border-card-border h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${
                            user.status === "ACTIVE"
                              ? "text-orange-500 hover:border-orange-500/40"
                              : "text-accent-green hover:border-accent-green/40"
                          }`}
                        >
                          {user.status === "ACTIVE" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                          {user.status === "ACTIVE" ? "Suspender" : "Reactivar"}
                        </span>
                      </div>

                      <div className="relative group">
                        <button
                          onClick={() => setDeleteTarget(user)}
                          disabled={pendingId === user.id}
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
              ))}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            loadUsers()
          }}
        />
      )}

      {detailUserId && (
        <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
      )}

      <ConfirmModal
        isOpen={verifyTarget !== null}
        title="Activar verificación de identidad"
        description={`¿Marcar a ${verifyTarget?.name} como verificado? Va a poder publicar y comprar sin pasar por Didit.`}
        confirmText="Activar"
        type="warning"
        isLoading={verifying}
        onConfirm={handleVerifyIdentity}
        onCancel={() => setVerifyTarget(null)}
      />

      <ConfirmModal
        isOpen={highlightTarget !== null}
        title={highlightTarget?.highlight_free ? "Quitar destacado gratis" : "Permitir destacado gratis"}
        description={
          highlightTarget?.highlight_free
            ? `¿Sacar el destacado gratis a ${highlightTarget?.name}? A partir de ahora va a tener que pagar por producto.`
            : `¿Permitir que ${highlightTarget?.name} destaque publicaciones sin pagar?`
        }
        confirmText={highlightTarget?.highlight_free ? "Quitar" : "Activar"}
        type="warning"
        isLoading={togglingHighlight}
        onConfirm={handleToggleHighlightFree}
        onCancel={() => setHighlightTarget(null)}
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Eliminar usuario"
        description={`¿Eliminar definitivamente a ${deleteTarget?.name}? Esto borra su cuenta y TODAS sus publicaciones, favoritos y preguntas. No se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
