"use client"

import { useEffect, useState } from "react"
import UserDetailModal from "./UserDetailModal"
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

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users")
    const data = await res.json()
    if (res.ok) setUsers(data.users)
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Usuarios</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-64 bg-background border border-card-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
        />
      </div>

      <div className="rounded-2xl glass-panel p-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-card-border text-text-muted font-bold select-none">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 px-4">Email</th>
                <th className="py-2 px-4">Tipo</th>
                <th className="py-2 px-4">Teléfono</th>
                <th className="py-2 px-4">Ubicación</th>
                <th className="py-2 px-4">ID Verificado</th>
                <th className="py-2 px-4">Estado</th>
                <th className="py-2 px-4">Registrado</th>
                <th className="py-2 pl-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-card-border/30 hover:bg-card-bg/30 transition-colors">
                  <td className="py-2.5 pr-4 font-bold text-foreground whitespace-nowrap">{user.name}</td>
                  <td className="py-2.5 px-4 text-text-muted">{user.email ?? "—"}</td>
                  <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">
                    {user.type === "BUSINESS_SELLER" ? "Empresa" : "Personal"}
                  </td>
                  <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">{user.phone ?? "—"}</td>
                  <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">{user.location ?? "—"}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        user.identity_verified
                          ? "bg-accent-green/10 text-accent-green"
                          : "bg-text-muted/10 text-text-muted"
                      }`}
                    >
                      {user.identity_verified ? "Sí" : "No"}
                    </span>
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
                  <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-2.5 pl-4 text-right whitespace-nowrap">
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
                          Editar
                        </span>
                      </div>

                      {!user.identity_verified && (
                        <div className="relative group">
                          <button
                            onClick={() => setVerifyTarget(user)}
                            disabled={pendingId === user.id}
                            className="bg-card-bg border border-card-border text-accent-blue hover:border-accent-blue/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
                            </svg>
                          </button>
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                            Activar verificación
                          </span>
                        </div>
                      )}

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
        )}
      </div>

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
