"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ConfirmModal from "@/components/ConfirmModal"
import CustomDropdown from "@/components/CustomDropdown"
import RichTextDisplay from "@/components/RichTextDisplay"

interface CategoryOption {
  id: string
  name: string
  parent_id: string | null
}

interface ListingDetail {
  id: string
  price: number
  stock: number
  condition: string
  status: string
  featured_plan: string
  image_url: string | null
  created_at: string
  updated_at: string
  sellerEmail: string | null
  products: {
    id: string
    name: string
    description: string | null
    brand: string | null
    images: string[] | null
    category_id: string | null
    categories: { id: string; name: string; parent_id: string | null } | null
  } | null
  sellers: { id: string; name: string } | null
  currencies: { symbol: string; code: string } | null
}

interface Stats {
  questionsReceived: number
  reportsReceived: number
  favoritesSaved: number
}

interface QuestionRow {
  id: string
  question: string
  answer: string | null
  question_deleted: boolean
  answer_deleted: boolean
  hidden_by_seller: boolean
  created_at: string
  updated_at: string
  buyer: { name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  APPROVED: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  DELETED: "Eliminada",
}

function flattenTree(categories: CategoryOption[]): { category: CategoryOption; depth: number }[] {
  const childrenByParentId = new Map<string | null, CategoryOption[]>()
  for (const c of categories) {
    const siblings = childrenByParentId.get(c.parent_id) ?? []
    siblings.push(c)
    childrenByParentId.set(c.parent_id, siblings)
  }
  const result: { category: CategoryOption; depth: number }[] = []
  const visit = (parentId: string | null, depth: number, seen: Set<string>) => {
    for (const c of childrenByParentId.get(parentId) ?? []) {
      if (seen.has(c.id)) continue
      result.push({ category: c, depth })
      visit(c.id, depth + 1, new Set(seen).add(c.id))
    }
  }
  visit(null, 0, new Set())
  return result
}

function categoryPath(categories: CategoryOption[], id: string): string {
  const chain: CategoryOption[] = []
  let current = categories.find((c) => c.id === id)
  while (current) {
    chain.unshift(current)
    current = current.parent_id ? categories.find((c) => c.id === current!.parent_id) : undefined
  }
  return chain.map((c) => c.name).join(" → ")
}

function depthColor(depth: number): string {
  if (depth === 0) return "#F6843B"
  if (depth === 1) return "#187cff"
  return "#000000"
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card-bg border border-card-border p-3 flex flex-col items-center text-center">
      <span className="text-xl font-extrabold text-foreground">{value}</span>
      <span className="text-[9px] text-text-muted uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  )
}

export default function ListingDetailModal({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoryId, setCategoryId] = useState("")
  const [savedCategoryId, setSavedCategoryId] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [askSave, setAskSave] = useState(false)
  const [moderating, setModerating] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    questionId: string
    target: "question" | "answer"
    mode: "hide" | "delete"
  } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/listings/${listingId}/detail`).then((res) => res.json()),
      fetch("/api/admin/categories").then((res) => res.json()),
    ])
      .then(([detail, cats]) => {
        setListing(detail.listing ?? null)
        setStats(detail.stats ?? null)
        setQuestions(detail.questions ?? [])
        const currentId = detail.listing?.products?.category_id ?? detail.listing?.products?.categories?.id ?? ""
        setCategoryId(currentId)
        setSavedCategoryId(currentId)
        setCategories(cats.categories ?? [])
      })
      .finally(() => setLoading(false))
  }, [listingId])

  const isDirty = categoryId !== savedCategoryId

  const requestClose = () => {
    if (isDirty) {
      setAskSave(true)
      return
    }
    onClose()
  }

  const saveCategory = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: categoryId || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error ?? "No se pudo guardar la categoría.")
        return false
      }
      setSavedCategoryId(categoryId)
      setSaveOk(true)
      setListing((prev) => {
        if (!prev?.products) return prev
        const cat = categories.find((c) => c.id === categoryId) ?? null
        return {
          ...prev,
          products: {
            ...prev.products,
            category_id: categoryId || null,
            categories: cat ? { id: cat.id, name: cat.name, parent_id: cat.parent_id } : null,
          },
        }
      })
      return true
    } catch {
      setSaveError("No se pudo guardar la categoría.")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContent = async () => {
    if (!deleteTarget) return
    const { questionId, target, mode } = deleteTarget

    setModerating(`${questionId}-${target}-${mode}`)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, mode }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo eliminar el contenido.")
        return
      }
      if (data.deleted) {
        // Hard-deleted question — the whole row is gone, drop it from the list.
        setQuestions((prev) => prev.filter((q) => q.id !== questionId))
      } else {
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...data.question } : q)))
      }
      setDeleteTarget(null)
    } catch {
      alert("No se pudo eliminar el contenido.")
    } finally {
      setModerating(null)
    }
  }

  const thumbnail = listing?.image_url ?? listing?.products?.images?.[0] ?? null
  const isActive = listing?.status === "ACTIVE" || listing?.status === "APPROVED"

  return (
    <>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-card-bg border border-card-border p-4 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
      >
        <button onClick={requestClose} className="absolute top-4 right-4 text-text-muted hover:text-foreground text-lg cursor-pointer">
          ✕
        </button>

        {loading ? (
          <p className="text-sm text-text-muted py-10 text-center">Cargando detalle...</p>
        ) : !listing ? (
          <p className="text-sm text-red-500 py-10 text-center">No se pudo cargar la publicación.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4">
              <div className="h-20 w-20 rounded-xl overflow-hidden border border-card-border bg-card-bg-solid shrink-0">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnail} alt={listing.products?.name ?? "Producto"} className="h-full w-full object-contain" />
                ) : (
                  <span className="h-full w-full flex items-center justify-center text-text-muted text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/listings/${listing.id}`}
                  target="_blank"
                  className="font-heading text-lg font-bold text-foreground hover:text-accent-gold transition-colors"
                >
                  {listing.products?.name ?? "Sin nombre"}
                </Link>
                <p className="text-sm text-text-muted mt-0.5">
                  {listing.products?.brand ?? "Sin marca"}
                  {listing.products?.categories?.name ? ` · ${listing.products.categories.name}` : " · Sin categoría"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      isActive
                        ? "bg-accent-green/10 text-accent-green"
                        : listing.status === "SOLD"
                          ? "bg-accent-gold/10 text-accent-gold"
                          : "bg-card-border/30 text-text-muted"
                    }`}
                  >
                    {STATUS_LABELS[listing.status] ?? listing.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-card-border/30 text-text-muted">
                    {listing.condition === "NEW" ? "Nuevo" : "Usado"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-card-border bg-background/40 p-4 flex flex-col gap-3">
              <label className="text-xs font-extrabold text-foreground uppercase tracking-wide">Categoría</label>
              <CustomDropdown
                name="categoryId"
                defaultValue={categoryId}
                showSearch
                placeholder="Buscar categoría..."
                options={[
                  { name: "— Sin categoría —", value: "" },
                  ...flattenTree(categories).map(({ category, depth }) => ({
                    name: depth === 0 ? category.name : categoryPath(categories, category.id),
                    value: category.id,
                    color: depthColor(depth),
                  })),
                ]}
                onChange={(val) => {
                  setCategoryId(val)
                  setSaveOk(false)
                }}
              />
              {saveError && <p className="text-xs text-red-500 font-bold">{saveError}</p>}
              {saveOk && <p className="text-xs text-accent-green font-bold">Categoría actualizada.</p>}
              <button
                type="button"
                disabled={saving || !isDirty}
                onClick={() => void saveCategory()}
                className="self-start rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Guardando…" : "Guardar categoría"}
              </button>
            </div>

            {listing.products?.description && (
              <RichTextDisplay html={listing.products.description} className="text-sm text-foreground/90 leading-relaxed" />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-text-muted">
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Creado por</span>
                {listing.sellers?.name ?? "—"}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Email del vendedor</span>
                {listing.sellerEmail ?? "—"}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Precio</span>
                {listing.currencies?.symbol ?? "$"}
                {Number(listing.price).toLocaleString("es-AR")}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Stock</span>
                {listing.stock}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Publicada desde</span>
                {new Date(listing.created_at).toLocaleDateString("es-AR")}
              </div>
              <div>
                <span className="block text-[9px] uppercase text-text-muted/70">Última actualización</span>
                {new Date(listing.updated_at).toLocaleDateString("es-AR")}
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile label="Favoritos guardados" value={stats.favoritesSaved} />
                <StatTile label="Preguntas recibidas" value={stats.questionsReceived} />
                <StatTile label="Reclamos recibidos" value={stats.reportsReceived} />
              </div>
            )}

            <p className="text-[10px] text-text-muted/70 italic">
              La cantidad de visitas no se muestra porque el sitio todavía no registra vistas de publicaciones.
            </p>

            <div className="flex flex-col gap-3 border-t border-card-border pt-5">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wide">Preguntas y Respuestas</h3>

              {questions.length === 0 ? (
                <p className="text-xs text-text-muted">Sin consultas registradas.</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                  {questions.map((q) => (
                    <div key={q.id} className="rounded-xl border border-card-border bg-card-bg p-3 flex flex-col gap-2 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold text-text-muted block uppercase">
                            {q.buyer?.name ?? "Comprador"} · {new Date(q.created_at).toLocaleDateString("es-AR")}
                          </span>
                          <p className={q.question_deleted ? "text-text-muted italic mt-1" : "text-foreground mt-1"}>
                            {q.question}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col gap-1">
                          <button
                            onClick={() => setDeleteTarget({ questionId: q.id, target: "question", mode: "hide" })}
                            disabled={q.question_deleted || moderating === `${q.id}-question-hide`}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border border-card-border text-text-muted hover:bg-card-border/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {q.question_deleted ? "Oculta" : "Ocultar pregunta"}
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ questionId: q.id, target: "question", mode: "delete" })}
                            disabled={moderating === `${q.id}-question-delete`}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border border-red-500/30 text-red-500 hover:bg-red-500/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Eliminar pregunta
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {q.hidden_by_seller && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-card-border/30 text-text-muted uppercase">
                            Oculta por el vendedor
                          </span>
                        )}
                      </div>

                      {q.answer && (
                        <div className="flex items-start justify-between gap-3 border-t border-card-border/50 pt-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-accent-gold block uppercase">Respuesta del vendedor</span>
                            <p className={q.answer_deleted ? "text-text-muted italic mt-1" : "text-foreground mt-1"}>
                              {q.answer}
                            </p>
                          </div>
                          <div className="shrink-0 flex flex-col gap-1">
                            <button
                              onClick={() => setDeleteTarget({ questionId: q.id, target: "answer", mode: "hide" })}
                              disabled={q.answer_deleted || moderating === `${q.id}-answer-hide`}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-card-border text-text-muted hover:bg-card-border/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {q.answer_deleted ? "Oculta" : "Ocultar respuesta"}
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ questionId: q.id, target: "answer", mode: "delete" })}
                              disabled={moderating === `${q.id}-answer-delete`}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-red-500/30 text-red-500 hover:bg-red-500/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Eliminar respuesta
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Rendered outside the listing modal — otherwise a
        click on ConfirmModal's own backdrop (which doesn't stopPropagation)
        would bubble up and close this whole listing modal underneath it. */}
    <ConfirmModal
      isOpen={askSave}
      title="¿Guardar los cambios?"
      description="Cambiaste la categoría. Si salís sin guardar, se pierde."
      confirmText="Guardar"
      cancelText="Seguir editando"
      discardText="Salir sin guardar"
      type="warning"
      isLoading={saving}
      onCancel={() => setAskSave(false)}
      onDiscard={onClose}
      onConfirm={async () => {
        const ok = await saveCategory()
        if (ok) {
          setAskSave(false)
          onClose()
        }
      }}
    />
    <ConfirmModal
      isOpen={deleteTarget !== null}
      title={
        deleteTarget?.mode === "delete"
          ? deleteTarget.target === "answer"
            ? "Eliminar respuesta por completo"
            : "Eliminar pregunta por completo"
          : deleteTarget?.target === "answer"
            ? "Ocultar respuesta"
            : "Ocultar pregunta"
      }
      description={
        deleteTarget?.mode === "delete"
          ? deleteTarget.target === "answer"
            ? "Esto borra la respuesta por completo, sin dejar ningún aviso ni rastro — la publicación vuelve a mostrarse como 'Aún sin responder'. Es irreversible."
            : "Esto borra la pregunta por completo, sin dejar ningún aviso ni rastro. También desaparece del historial del comprador que la hizo. Es irreversible."
          : deleteTarget?.target === "answer"
            ? "¿Ocultar el texto de esta respuesta? Se reemplaza por un aviso de moderación visible; la fila no se borra."
            : "¿Ocultar el texto de esta pregunta? Se reemplaza por un aviso de moderación visible; la fila no se borra."
      }
      confirmText={deleteTarget?.mode === "delete" ? "Eliminar por completo" : "Ocultar"}
      type="danger"
      isLoading={moderating !== null}
      onConfirm={handleDeleteContent}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  )
}
