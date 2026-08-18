"use client"

import { useEffect, useState } from "react"
import ConfirmModal from "@/components/ConfirmModal"

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  parent_id: string | null
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [icon, setIcon] = useState("")
  const [parentId, setParentId] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadCategories = async () => {
    const res = await fetch("/api/admin/categories")
    const data = await res.json()
    if (res.ok) setCategories(data.categories)
    setLoading(false)
  }

  useEffect(() => {
    loadCategories() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setSlug("")
    setIcon("")
    setParentId("")
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setName(category.name)
    setSlug(category.slug)
    setIcon(category.icon ?? "")
    setParentId(category.parent_id ?? "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories"
    const method = editingId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, icon, parentId: parentId || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la categoría.")
        return
      }
      resetForm()
      loadCategories()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo borrar la categoría.")
        return
      }
      setDeleteTarget(null)
      loadCategories()
    } finally {
      setDeleting(false)
    }
  }

  const rootCategories = categories.filter((c) => !c.parent_id && c.id !== editingId)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-foreground">Categorías</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row items-end gap-3 flex-wrap"
      >
        <div className="flex-1 w-full">
          <label className="text-sm font-bold text-foreground block mb-1.5">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="text-sm font-bold text-foreground block mb-1.5">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
          />
        </div>
        <div className="w-full md:w-24">
          <label className="text-sm font-bold text-foreground block mb-1.5">Ícono</label>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🏷️"
            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="text-sm font-bold text-foreground block mb-1.5">Categoría padre (opcional)</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
          >
            <option value="">— Categoría principal —</option>
            {rootCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 md:flex-none rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-5 py-2.5 text-sm font-extrabold text-background shadow-md hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {editingId ? "Guardar" : "Crear"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-card-border px-4 py-2.5 text-sm font-bold text-text-muted hover:bg-card-bg/25 transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

      <div className="rounded-2xl glass-panel p-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-card-border text-text-muted font-bold select-none">
                <th className="py-2">Ícono</th>
                <th className="py-2">Nombre</th>
                <th className="py-2">Slug</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories
                .filter((c) => !c.parent_id)
                .flatMap((root) => [
                  root,
                  ...categories.filter((c) => c.parent_id === root.id),
                ])
                .map((category) => (
                <tr key={category.id} className="border-b border-card-border/30 hover:bg-card-bg/30 transition-colors">
                  <td className="py-2.5">{category.icon}</td>
                  <td className="py-2.5 font-bold text-foreground">
                    {category.parent_id ? (
                      <span className="pl-4 inline-flex items-center gap-1.5 text-text-muted font-semibold">
                        <span className="text-xs">↳</span>
                        <span className="text-foreground">{category.name}</span>
                      </span>
                    ) : (
                      category.name
                    )}
                  </td>
                  <td className="py-2.5 text-text-muted">{category.slug}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative group">
                        <button
                          onClick={() => handleEdit(category)}
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

                      <div className="relative group">
                        <button
                          onClick={() => setDeleteTarget(category)}
                          className="bg-card-bg border border-card-border text-red-500 hover:border-red-500/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m9.96-3.08c.18.04.36.08.54.13M15 3.57a48.008 48.008 0 0 0-6 0M4.5 6.08c.18-.05.36-.09.54-.13M18 6.08a48.108 48.108 0 0 0-12 0M6.25 6.08l.81 12.35c.04.83.69 1.5 1.52 1.5H15.4c.83 0 1.48-.67 1.52-1.5l.81-12.35m-9.96 0h12" />
                          </svg>
                        </button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                          Borrar
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

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Borrar categoría"
        description={`¿Borrar "${deleteTarget?.name}"? Los productos que la usan quedarán sin categoría.`}
        confirmText="Borrar"
        type="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
