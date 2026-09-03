"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import ConfirmModal from "@/components/ConfirmModal"
import CustomDropdown from "@/components/CustomDropdown"
import { imagesToWebp } from "@/lib/imageToWebp"
import { normalizeListingTitle } from "@/lib/listingTitle"

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="min-h-32 rounded-xl border border-card-border bg-background" />,
})

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
  share_to_social: string[] | null
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

function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "")
  if (!trimmed) return null
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/\./g, "")
  const n = Number(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function formatPriceDraft(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, "")
  if (!cleaned) return ""
  const comma = cleaned.indexOf(",")
  const intRaw = (comma >= 0 ? cleaned.slice(0, comma) : cleaned).replace(/\./g, "").replace(/\D/g, "")
  const decRaw = comma >= 0 ? cleaned.slice(comma + 1).replace(/\D/g, "").slice(0, 2) : null
  if (!intRaw) return comma >= 0 ? `0,${decRaw ?? ""}` : ""
  const grouped = Number(intRaw).toLocaleString("es-AR")
  return decRaw !== null ? `${grouped},${decRaw}` : grouped
}

function formatStoredPrice(value: number): string {
  return value.toLocaleString("es-AR", { maximumFractionDigits: 2 })
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
  const [photos, setPhotos] = useState<string[]>([])
  const [savedPhotos, setSavedPhotos] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [savingPhotos, setSavingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoOk, setPhotoOk] = useState(false)
  const [draggingPhoto, setDraggingPhoto] = useState<number | null>(null)
  const [priceDraft, setPriceDraft] = useState("")
  const [savedPrice, setSavedPrice] = useState(0)
  const [savingPrice, setSavingPrice] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [priceOk, setPriceOk] = useState(false)
  const [description, setDescription] = useState("")
  const [savedDescription, setSavedDescription] = useState("")
  const [savingDescription, setSavingDescription] = useState(false)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [descriptionOk, setDescriptionOk] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [savedTitle, setSavedTitle] = useState("")
  const [savingTitle, setSavingTitle] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [titleOk, setTitleOk] = useState(false)
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
        const imgs = detail.listing?.products?.images?.filter(Boolean) ?? (detail.listing?.image_url ? [detail.listing.image_url] : [])
        setPhotos(imgs)
        setSavedPhotos(imgs)
        const loadedPrice = Number(detail.listing?.price ?? 0)
        setSavedPrice(loadedPrice)
        setPriceDraft(Number.isFinite(loadedPrice) ? formatStoredPrice(loadedPrice) : "")
        const loadedDescription = detail.listing?.products?.description ?? ""
        setDescription(loadedDescription)
        setSavedDescription(loadedDescription)
        const loadedTitle = detail.listing?.products?.name ?? ""
        setTitleDraft(loadedTitle)
        setSavedTitle(loadedTitle)
      })
      .finally(() => setLoading(false))
  }, [listingId])

  const photosDirty = photos.join("|") !== savedPhotos.join("|")
  const parsedPrice = parsePriceInput(priceDraft)
  const priceDirty = parsedPrice !== null && parsedPrice !== savedPrice
  const descriptionDirty = description !== savedDescription
  const titleDirty = titleDraft.trim() !== savedTitle.trim()
  const isDirty = categoryId !== savedCategoryId || photosDirty || priceDirty || (priceDraft.trim() !== "" && parsedPrice === null) || descriptionDirty || titleDirty

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

  const applyPhotoState = (images: string[], imageUrl: string | null) => {
    setPhotos(images)
    setSavedPhotos(images)
    setListing((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        image_url: imageUrl,
        products: prev.products ? { ...prev.products, images } : prev.products,
      }
    })
  }

  const savePhotos = async () => {
    setSavingPhotos(true)
    setPhotoError(null)
    setPhotoOk(false)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhotoError(data.error ?? "No se pudieron guardar las fotos.")
        return false
      }
      const next = Array.isArray(data.product?.images) ? data.product.images : photos
      applyPhotoState(next, data.image_url ?? next[0] ?? null)
      setPhotoOk(true)
      return true
    } catch {
      setPhotoError("No se pudieron guardar las fotos.")
      return false
    } finally {
      setSavingPhotos(false)
    }
  }

  const savePrice = async () => {
    const next = parsePriceInput(priceDraft)
    if (next === null) {
      setPriceError("El precio tiene que ser un número mayor a 0.")
      return false
    }
    setSavingPrice(true)
    setPriceError(null)
    setPriceOk(false)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPriceError(data.error ?? "No se pudo guardar el precio.")
        return false
      }
      setSavedPrice(next)
      setPriceDraft(formatStoredPrice(next))
      setListing((prev) => (prev ? { ...prev, price: next } : prev))
      setPriceOk(true)
      return true
    } catch {
      setPriceError("No se pudo guardar el precio.")
      return false
    } finally {
      setSavingPrice(false)
    }
  }

  const saveDescription = async () => {
    setSavingDescription(true)
    setDescriptionError(null)
    setDescriptionOk(false)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDescriptionError(data.error ?? "No se pudo guardar la descripción.")
        return false
      }
      const next = typeof data.product?.description === "string" ? data.product.description : description
      setDescription(next)
      setSavedDescription(next)
      setListing((prev) =>
        prev?.products ? { ...prev, products: { ...prev.products, description: next } } : prev,
      )
      setDescriptionOk(true)
      return true
    } catch {
      setDescriptionError("No se pudo guardar la descripción.")
      return false
    } finally {
      setSavingDescription(false)
    }
  }

  const saveTitle = async () => {
    const next = normalizeListingTitle(titleDraft)
    if (next.length < 2 || next.length > 80) {
      setTitleError("El título debe tener entre 2 y 80 caracteres.")
      return false
    }
    setSavingTitle(true)
    setTitleError(null)
    setTitleOk(false)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTitleError(data.error ?? "No se pudo guardar el título.")
        return false
      }
      const saved = typeof data.product?.name === "string" ? data.product.name : next
      setTitleDraft(saved)
      setSavedTitle(saved)
      setListing((prev) =>
        prev?.products ? { ...prev, products: { ...prev.products, name: saved } } : prev,
      )
      setTitleOk(true)
      return true
    } catch {
      setTitleError("No se pudo guardar el título.")
      return false
    } finally {
      setSavingTitle(false)
    }
  }

  const handleAddPhotos = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploadingPhotos(true)
    setPhotoError(null)
    setPhotoOk(false)
    try {
      const webp = await imagesToWebp(Array.from(fileList).filter((f) => f.type.startsWith("image/")))
      if (webp.length === 0) return
      const form = new FormData()
      for (const file of webp) form.append("files", file)
      const res = await fetch(`/api/admin/listings/${listingId}/images`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) {
        setPhotoError(data.error ?? "No se pudieron subir las fotos.")
        return
      }
      const next = Array.isArray(data.images) ? data.images : []
      applyPhotoState(next, data.image_url ?? next[0] ?? null)
      setPhotoOk(true)
    } catch {
      setPhotoError("No se pudieron subir las fotos.")
    } finally {
      setUploadingPhotos(false)
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

  const thumbnail = photos[0] ?? listing?.image_url ?? listing?.products?.images?.[0] ?? null
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
                <label className="text-[9px] uppercase text-text-muted/70 font-bold">Título</label>
                <input
                  type="text"
                  value={titleDraft}
                  maxLength={80}
                  onChange={(e) => {
                    setTitleDraft(e.target.value)
                    setTitleOk(false)
                  }}
                  onBlur={() => setTitleDraft(normalizeListingTitle(titleDraft))}
                  className="mt-1 w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm font-bold text-foreground focus:outline-none focus:border-accent-gold"
                />
                {titleError && <p className="text-xs text-red-500 font-bold mt-1">{titleError}</p>}
                {titleOk && <p className="text-xs text-accent-green font-bold mt-1">Título actualizado.</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <button
                    type="button"
                    disabled={savingTitle || !titleDirty}
                    onClick={() => void saveTitle()}
                    className="rounded-lg bg-accent-gold px-3 py-1.5 text-[10px] font-extrabold text-background disabled:opacity-50 cursor-pointer"
                  >
                    {savingTitle ? "Guardando…" : "Guardar título"}
                  </button>
                  <Link
                    href={`/listings/${listing.id}`}
                    target="_blank"
                    className="text-[11px] font-bold text-accent-gold hover:underline"
                  >
                    Ver en el sitio
                  </Link>
                </div>
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
                disabled={saving || categoryId === savedCategoryId}
                onClick={() => void saveCategory()}
                className="self-start rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Guardando…" : "Guardar categoría"}
              </button>
            </div>

            <div className="rounded-xl border border-card-border bg-background/40 p-4 flex flex-col gap-3">
              <label className="text-xs font-extrabold text-foreground uppercase tracking-wide">Precio</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-muted">{listing.currencies?.symbol ?? "$"}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceDraft}
                  onChange={(e) => {
                    setPriceDraft(formatPriceDraft(e.target.value))
                    setPriceOk(false)
                  }}
                  className="flex-1 bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                />
              </div>
              {priceError && <p className="text-xs text-red-500 font-bold">{priceError}</p>}
              {priceOk && <p className="text-xs text-accent-green font-bold">Precio actualizado.</p>}
              <button
                type="button"
                disabled={savingPrice || !priceDirty}
                onClick={() => void savePrice()}
                className="self-start rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
              >
                {savingPrice ? "Guardando…" : "Guardar precio"}
              </button>
            </div>

            <div className="rounded-xl border border-card-border bg-background/40 p-4 flex flex-col gap-3">
              <label className="text-xs font-extrabold text-foreground uppercase tracking-wide">Fotos</label>
              <p className="text-[11px] text-text-muted -mt-1">
                La primera es la portada. Podés subir, borrar o arrastrar para reordenar.
              </p>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photos.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      draggable
                      onDragStart={() => setDraggingPhoto(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggingPhoto === null || draggingPhoto === index) return
                        setPhotos((prev) => {
                          const next = [...prev]
                          const [moved] = next.splice(draggingPhoto, 1)
                          next.splice(index, 0, moved)
                          return next
                        })
                        setDraggingPhoto(null)
                        setPhotoOk(false)
                      }}
                      onDragEnd={() => setDraggingPhoto(null)}
                      className={`relative aspect-square rounded-xl overflow-hidden border bg-background cursor-grab active:cursor-grabbing ${
                        index === 0 ? "border-accent-gold ring-1 ring-accent-gold/30" : "border-card-border"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-contain" />
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 bg-accent-gold text-white text-[8px] font-extrabold uppercase px-1 py-0.5 rounded">
                          Portada
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPhotos((prev) => prev.filter((_, i) => i !== index))
                          setPhotoOk(false)
                        }}
                        className="absolute top-1 right-1 h-6 w-6 rounded-lg bg-black/60 text-white text-xs font-bold cursor-pointer"
                        aria-label="Quitar foto"
                      >
                        ×
                      </button>
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotos((prev) => {
                              const next = [...prev]
                              const [moved] = next.splice(index, 1)
                              next.unshift(moved)
                              return next
                            })
                            setPhotoOk(false)
                          }}
                          className="absolute bottom-1 right-1 rounded bg-black/60 text-white text-[8px] font-bold px-1 py-0.5 cursor-pointer"
                        >
                          Portada
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <label className="self-start inline-flex items-center rounded-xl border border-card-border bg-card-bg px-4 py-2 text-xs font-bold text-foreground cursor-pointer">
                {uploadingPhotos ? "Subiendo…" : "Agregar fotos"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploadingPhotos}
                  onChange={(e) => {
                    void handleAddPhotos(e.target.files)
                    e.target.value = ""
                  }}
                />
              </label>
              {photoError && <p className="text-xs text-red-500 font-bold">{photoError}</p>}
              {photoOk && <p className="text-xs text-accent-green font-bold">Fotos actualizadas.</p>}
              <button
                type="button"
                disabled={savingPhotos || uploadingPhotos || !photosDirty}
                onClick={() => void savePhotos()}
                className="self-start rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
              >
                {savingPhotos ? "Guardando…" : "Guardar orden de fotos"}
              </button>
            </div>

            <div className="rounded-xl border border-card-border bg-background/40 p-4 flex flex-col gap-3">
              <label className="text-xs font-extrabold text-foreground uppercase tracking-wide">Descripción</label>
              <RichTextEditor
                key={`${listing.id}-description`}
                value={savedDescription}
                onChange={(html) => {
                  setDescription(html)
                  setDescriptionOk(false)
                }}
                placeholder="Descripción del artículo..."
              />
              {descriptionError && <p className="text-xs text-red-500 font-bold">{descriptionError}</p>}
              {descriptionOk && <p className="text-xs text-accent-green font-bold">Descripción actualizada.</p>}
              <button
                type="button"
                disabled={savingDescription || !descriptionDirty}
                onClick={() => void saveDescription()}
                className="self-start rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
              >
                {savingDescription ? "Guardando…" : "Guardar descripción"}
              </button>
            </div>

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
                <span className="block text-[9px] uppercase text-text-muted/70">Instagram CVO</span>
                {listing.share_to_social?.includes("INSTAGRAM") ? "Aceptó publicar" : "No aceptó"}
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
      description="Cambiaste título, categoría, precio, descripción o fotos. Si salís sin guardar, se pierden los cambios que no confirmaste. Las fotos nuevas ya quedan subidas."
      confirmText="Guardar"
      cancelText="Seguir editando"
      discardText="Salir sin guardar"
      type="warning"
      isLoading={saving || savingPhotos || savingPrice || savingDescription || savingTitle}
      onCancel={() => setAskSave(false)}
      onDiscard={onClose}
      onConfirm={async () => {
        const titleOkSave = titleDirty ? await saveTitle() : true
        const catOk = categoryId !== savedCategoryId ? await saveCategory() : true
        const priceOkSave = priceDirty ? await savePrice() : true
        const descOk = descriptionDirty ? await saveDescription() : true
        const photoOkSave = photosDirty ? await savePhotos() : true
        if (titleOkSave && catOk && priceOkSave && descOk && photoOkSave) {
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
