"use client"

import { useEffect, useRef, useState } from "react"
import ConfirmModal from "@/components/ConfirmModal"
import CustomDropdown from "@/components/CustomDropdown"

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  parent_id: string | null
}

// DFS from the roots down, computing each category's depth — used both
// for the parent-picker dropdown (indented, any depth) and the table
// (arbitrary nesting, not just "root + direct child" like before).
function flattenTree(categories: Category[]): { category: Category; depth: number }[] {
  const childrenByParentId = new Map<string | null, Category[]>()
  for (const c of categories) {
    const key = c.parent_id
    const siblings = childrenByParentId.get(key) ?? []
    siblings.push(c)
    childrenByParentId.set(key, siblings)
  }

  const result: { category: Category; depth: number }[] = []
  const visit = (parentId: string | null, depth: number, seen: Set<string>) => {
    for (const c of childrenByParentId.get(parentId) ?? []) {
      if (seen.has(c.id)) continue // guards against a malformed cycle in the data
      result.push({ category: c, depth })
      visit(c.id, depth + 1, new Set(seen).add(c.id))
    }
  }
  visit(null, 0, new Set())
  return result
}

// Categoría raíz (naranja), subcategoría (azul), y de ahí en adelante negro —
// pedido explícito del usuario para diferenciar visualmente los niveles.
function depthColor(depth: number): string {
  if (depth === 0) return "#F6843B"
  if (depth === 1) return "#187cff"
  return "#000000"
}

// Root-to-leaf chain (inclusive of the category itself) — used to render
// the full breadcrumb ("Computación → Periféricos → Parlantes") when a
// search match is buried several levels deep, so the result doesn't lose
// its context.
function getAncestorChain(categories: Category[], id: string): Category[] {
  const chain: Category[] = []
  let current = categories.find((c) => c.id === id)
  while (current) {
    chain.unshift(current)
    const parentId: string | null = current.parent_id
    current = parentId ? categories.find((c) => c.id === parentId) : undefined
  }
  return chain
}

function getDescendantIds(categories: Category[], id: string): Set<string> {
  const childrenByParentId = new Map<string | null, Category[]>()
  for (const c of categories) {
    const siblings = childrenByParentId.get(c.parent_id) ?? []
    siblings.push(c)
    childrenByParentId.set(c.parent_id, siblings)
  }

  const result = new Set<string>()
  const queue = [id]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const child of childrenByParentId.get(current) ?? []) {
      if (result.has(child.id)) continue
      result.add(child.id)
      queue.push(child.id)
    }
  }
  return result
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
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  const loadCategories = async () => {
    const res = await fetch("/api/admin/categories")
    const data = await res.json()
    if (res.ok) setCategories(data.categories)
    setLoading(false)
  }

  useEffect(() => {
    loadCategories() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  // The form only mounts once showForm flips to true, so scrollIntoView has
  // to run after that DOM node exists — a plain call right after setShowForm
  // would still be targeting the pre-render (not-yet-mounted) form.
  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [showForm, editingId])

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
    setShowForm(true)
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
      setShowForm(false)
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

  const tree = flattenTree(categories)

  // Parent picker excludes the category being edited AND all of its own
  // descendants — picking either would create a cycle (a category can't
  // end up "below itself" in the tree).
  const excludedIds = editingId ? new Set([editingId, ...getDescendantIds(categories, editingId)]) : new Set<string>()
  const parentOptions = tree.filter(({ category }) => !excludedIds.has(category.id))

  const filteredTree = search.trim()
    ? tree.filter(({ category }) => category.name.toLowerCase().includes(search.trim().toLowerCase()))
    : tree

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Categorías</h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-all cursor-pointer"
          >
            + Agregar categoría
          </button>
        )}
      </div>

      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar categoría o subcategoría..."
          className="w-full bg-background border border-card-border rounded-xl pl-11 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
        />
      </div>

      {showForm && (
      <form
        ref={formRef}
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
          <CustomDropdown
            name="parentId"
            defaultValue={parentId}
            showSearch
            placeholder="Buscar categoría..."
            options={[
              { name: "— Categoría principal —", value: "" },
              ...parentOptions.map(({ category, depth }) => ({
                name: `${"— ".repeat(depth)}${category.name}`,
                value: category.id,
                color: depthColor(depth),
              })),
            ]}
            onChange={(val) => setParentId(val)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 md:flex-none rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {editingId ? "Guardar" : "Crear"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm()
              setShowForm(false)
            }}
            className="rounded-xl border border-card-border px-4 py-2.5 text-sm font-bold text-text-muted hover:bg-card-bg/25 transition-all cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </form>
      )}

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

      <div className="rounded-2xl glass-panel p-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : filteredTree.length === 0 ? (
          <p className="text-sm text-text-muted">No se encontraron categorías para &quot;{search}&quot;.</p>
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
              {filteredTree.map(({ category, depth }) => (
                <tr key={category.id} className="border-b border-card-border/30 hover:bg-card-bg/30 transition-colors">
                  <td className="py-2.5">{category.icon}</td>
                  <td className="py-2.5 font-bold">
                    {search.trim() ? (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        {getAncestorChain(categories, category.id).map((ancestor, i, chain) => (
                          <span key={ancestor.id} className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEdit(ancestor)}
                              style={{ color: depthColor(i) }}
                              className={`hover:underline cursor-pointer ${i === chain.length - 1 ? "font-bold" : "font-semibold text-xs"}`}
                            >
                              {ancestor.name}
                            </button>
                            {i < chain.length - 1 && <span className="text-text-muted text-xs">→</span>}
                          </span>
                        ))}
                      </span>
                    ) : depth > 0 ? (
                      <span
                        className="inline-flex items-center gap-1.5"
                        style={{ paddingLeft: `${depth * 1.25}rem`, color: depthColor(depth) }}
                      >
                        <span className="text-xs">↳</span>
                        <span>{category.name}</span>
                      </span>
                    ) : (
                      <span style={{ color: depthColor(depth) }}>{category.name}</span>
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
