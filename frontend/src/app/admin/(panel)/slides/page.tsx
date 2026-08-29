"use client"

import { useEffect, useState } from "react"
import ConfirmModal from "@/components/ConfirmModal"
import { imageToBlurFillBanner, imageToWebp } from "@/lib/imageToWebp"

interface Slide {
  id: string
  image_url: string
  image_url_mobile: string | null
  eyebrow: string
  title: string | null
  cta_label: string
  href: string
  sort_order: number
  active: boolean
  dark_overlay: boolean
  image_fit: "cover" | "contain"
  show_cta: boolean
}

export default function AdminSlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [imageUrlMobile, setImageUrlMobile] = useState("")
  const [eyebrow, setEyebrow] = useState("")
  const [title, setTitle] = useState("")
  const [showTitle, setShowTitle] = useState(false)
  const [ctaLabel, setCtaLabel] = useState("Ver más")
  const [href, setHref] = useState("/search")
  const [active, setActive] = useState(true)
  const [imageFit, setImageFit] = useState<"cover" | "contain">("cover")
  const [showCta, setShowCta] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [generatingBlur, setGeneratingBlur] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Slide | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadSlides = async () => {
    const res = await fetch("/api/admin/slides")
    const data = await res.json()
    if (res.ok) setSlides(data.slides)
    setLoading(false)
  }

  useEffect(() => {
    loadSlides() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setImageUrl("")
    setImageUrlMobile("")
    setEyebrow("")
    setTitle("")
    setShowTitle(false)
    setCtaLabel("Ver más")
    setHref("/search")
    setActive(true)
    setImageFit("cover")
    setShowCta(false)
  }

  const handleEdit = (slide: Slide) => {
    setEditingId(slide.id)
    setImageUrl(slide.image_url)
    setImageUrlMobile(slide.image_url_mobile ?? "")
    setEyebrow(slide.eyebrow)
    setTitle(slide.title ?? "")
    setShowTitle(!!slide.title)
    setCtaLabel(slide.cta_label)
    setHref(slide.href)
    setActive(slide.active)
    setImageFit(slide.image_fit)
    setShowCta(slide.show_cta)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: "desktop" | "mobile") => {
    const rawFile = e.target.files?.[0]
    if (!rawFile) return

    setError(null)
    const setUploadingState = target === "mobile" ? setUploadingMobile : setUploading
    setUploadingState(true)
    try {
      const file = await imageToWebp(rawFile, 0.85, 1920)
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/slides/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir la imagen.")
        return
      }
      if (target === "mobile") setImageUrlMobile(data.imageUrl)
      else setImageUrl(data.imageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.")
    } finally {
      setUploadingState(false)
      e.target.value = ""
    }
  }

  const uploadSlideFile = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/admin/slides/upload", { method: "POST", body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "No se pudo subir la imagen.")
    return data.imageUrl as string
  }

  const handleGenerateBlurFill = async () => {
    if (!imageUrl) {
      setError("Subí primero la imagen centrada.")
      return
    }
    setError(null)
    setGeneratingBlur(true)
    try {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error("No se pudo leer la imagen subida.")
      const source = await res.blob()
      const composed = await imageToBlurFillBanner(source)
      setImageUrl(await uploadSlideFile(composed))
      setImageFit("cover")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el fondo blur.")
    } finally {
      setGeneratingBlur(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!imageUrl) {
      setError("Subí una imagen para el slide.")
      return
    }

    setSaving(true)
    const url = editingId ? `/api/admin/slides/${editingId}` : "/api/admin/slides"
    const method = editingId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, imageUrlMobile, eyebrow, title: showTitle ? title : "", ctaLabel, href, active, darkOverlay: false, imageFit, showCta }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el slide.")
        return
      }
      resetForm()
      loadSlides()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (slide: Slide) => {
    await fetch(`/api/admin/slides/${slide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !slide.active }),
    })
    loadSlides()
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = slides[index + direction]
    const current = slides[index]
    if (!target) return

    setReorderingId(current.id)
    try {
      await Promise.all([
        fetch(`/api/admin/slides/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: target.sort_order }),
        }),
        fetch(`/api/admin/slides/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: current.sort_order }),
        }),
      ])
      await loadSlides()
    } finally {
      setReorderingId(null)
    }
  }

  const handleDrop = async (targetIndex: number) => {
    const sourceIndex = draggedIndex
    setDraggedIndex(null)
    setDragOverIndex(null)
    if (sourceIndex === null || sourceIndex === targetIndex || reorderingId !== null) return

    const reordered = [...slides]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    setSlides(reordered)
    setReorderingId(moved.id)
    try {
      // Persist every row whose position actually changed, sort_order = new index.
      await Promise.all(
        reordered.map((slide, index) =>
          slide.sort_order === index
            ? null
            : fetch(`/api/admin/slides/${slide.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sortOrder: index }),
              })
        )
      )
      await loadSlides()
    } finally {
      setReorderingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/slides/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "No se pudo borrar el slide.")
        return
      }
      setDeleteTarget(null)
      loadSlides()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Carousel de Inicio</h1>
        <p className="text-sm text-text-muted mt-1">
          Administrá las imágenes del carousel principal de la home.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl glass-panel p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-48 shrink-0">
            <label className="text-sm font-bold text-foreground block mb-1.5">Imagen</label>
            <div className="relative h-28 w-full rounded-xl border border-card-border bg-background overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-text-muted">Sin imagen</span>
              )}
            </div>
            <label className="mt-2 block w-full text-center rounded-xl border border-card-border px-3 py-2 text-xs font-bold text-text-muted hover:bg-card-bg/30 transition-all cursor-pointer">
              {uploading ? "Subiendo..." : "Elegir archivo"}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "desktop")}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={handleGenerateBlurFill}
              disabled={!imageUrl || uploading || generatingBlur}
              className="mt-1.5 w-full rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-3 py-2 text-xs font-bold text-accent-gold hover:bg-accent-gold/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Usa la imagen subida al centro, nítida, y rellena el ancho con la misma foto desenfocada."
            >
              {generatingBlur ? "Generando fondo…" : "Generar fondo blur"}
            </button>
          </div>

          <div className="w-full md:w-48 shrink-0">
            <label className="text-sm font-bold text-foreground block mb-1.5" title="Opcional. El banner de escritorio suele ser muy ancho para un celular — si no cargás una versión mobile, se recorta automáticamente para llenar la pantalla.">
              Imagen mobile (opcional)
            </label>
            <div className="relative h-28 w-full rounded-xl border border-card-border bg-background overflow-hidden flex items-center justify-center">
              {imageUrlMobile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrlMobile} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-text-muted text-center px-2">Se recorta la de escritorio</span>
              )}
            </div>
            <div className="mt-2 flex gap-1.5">
              <label className="flex-1 block text-center rounded-xl border border-card-border px-3 py-2 text-xs font-bold text-text-muted hover:bg-card-bg/30 transition-all cursor-pointer">
                {uploadingMobile ? "Subiendo..." : "Elegir archivo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "mobile")}
                  disabled={uploadingMobile}
                  className="hidden"
                />
              </label>
              {imageUrlMobile && (
                <button
                  type="button"
                  onClick={() => setImageUrlMobile("")}
                  className="rounded-xl border border-card-border px-2.5 text-xs font-bold text-text-muted hover:text-red-500 hover:border-red-500/40 transition-all cursor-pointer"
                  aria-label="Quitar imagen mobile"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-bold text-foreground block mb-1.5">Eyebrow</label>
                <input
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  placeholder="Tecnología"
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                />
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer mb-1.5 w-fit">
                  <input
                    type="checkbox"
                    checked={showTitle}
                    onChange={(e) => setShowTitle(e.target.checked)}
                    className="h-4 w-4 accent-accent-gold cursor-pointer"
                  />
                  Mostrar título
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título del slide"
                  disabled={!showTitle}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={showCta}
                  onChange={(e) => setShowCta(e.target.checked)}
                  className="h-4 w-4 accent-accent-gold cursor-pointer"
                />
                Mostrar botón
              </label>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-sm font-bold text-foreground block mb-1.5">Texto del botón</label>
                  <input
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    disabled={!showCta}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-bold text-foreground block mb-1.5">Link destino</label>
                  <input
                    value={href}
                    onChange={(e) => setHref(e.target.value)}
                    placeholder="/comercios"
                    disabled={!showCta}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 accent-accent-gold cursor-pointer"
                />
                Activo
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer w-fit" title="Cubrir: la imagen llena todo el ancho, puede recortar los bordes (ideal para fotos). Ajustar: nunca recorta, pero puede dejar franjas vacías a los costados (ideal para banners con texto propio).">
                <span>Imagen:</span>
                <select
                  value={imageFit}
                  onChange={(e) => setImageFit(e.target.value as "cover" | "contain")}
                  className="bg-background border border-card-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none focus:border-accent-gold cursor-pointer"
                >
                  <option value="cover">Cubrir todo el ancho (recorta)</option>
                  <option value="contain">Ajustar sin recortar</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
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
        ) : slides.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no hay slides cargados.</p>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-card-border text-text-muted font-bold select-none">
                <th className="py-2">Orden</th>
                <th className="py-2">Imagen</th>
                <th className="py-2">Título</th>
                <th className="py-2">Botón</th>
                <th className="py-2">Link</th>
                <th className="py-2">Estado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {slides.map((slide, index) => (
                <tr
                  key={slide.id}
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (dragOverIndex !== index) setDragOverIndex(index)
                  }}
                  onDragLeave={() => setDragOverIndex((prev) => (prev === index ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleDrop(index)
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null)
                    setDragOverIndex(null)
                  }}
                  className={`border-b border-card-border/30 hover:bg-card-bg/30 transition-colors cursor-grab active:cursor-grabbing ${
                    draggedIndex === index ? "opacity-40" : ""
                  } ${dragOverIndex === index && draggedIndex !== index ? "border-t-2 border-t-accent-gold" : ""}`}
                >
                  <td className="py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-text-muted/60 select-none mb-0.5 block" title="Arrastrá para reordenar">⠿</span>
                      <button
                        type="button"
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0 || reorderingId !== null}
                        className="text-text-muted hover:text-accent-gold disabled:opacity-30 cursor-pointer"
                        aria-label="Subir"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === slides.length - 1 || reorderingId !== null}
                        className="text-text-muted hover:text-accent-gold disabled:opacity-30 cursor-pointer"
                        aria-label="Bajar"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="h-12 w-20 rounded-lg overflow-hidden bg-background border border-card-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slide.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  </td>
                  <td className="py-2.5 font-bold text-foreground">
                    <span className="block text-[10px] font-bold uppercase text-accent-gold">{slide.eyebrow}</span>
                    {slide.title || <span className="text-text-muted italic font-normal">(sin título)</span>}
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      slide.show_cta ? "bg-accent-green/10 text-accent-green" : "bg-text-muted/10 text-text-muted"
                    }`}>
                      {slide.show_cta ? "Visible" : "Oculto"}
                    </span>
                  </td>
                  <td className="py-2.5 text-text-muted">
                    {slide.show_cta ? slide.href : "-"}
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(slide)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
                        slide.active ? "bg-accent-green/10 text-accent-green" : "bg-text-muted/10 text-text-muted"
                      }`}
                    >
                      {slide.active ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(slide)}
                        className="bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                        aria-label="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(slide)}
                        className="bg-card-bg border border-card-border text-red-500 hover:border-red-500/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                        aria-label="Borrar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m9.96-3.08c.18.04.36.08.54.13M15 3.57a48.008 48.008 0 0 0-6 0M4.5 6.08c.18-.05.36-.09.54-.13M18 6.08a48.108 48.108 0 0 0-12 0M6.25 6.08l.81 12.35c.04.83.69 1.5 1.52 1.5H15.4c.83 0 1.48-.67 1.52-1.5l.81-12.35m-9.96 0h12" />
                        </svg>
                      </button>
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
        title="Borrar slide"
        description={`¿Borrar "${deleteTarget?.title || deleteTarget?.eyebrow || "este slide"}"? Esta acción no se puede deshacer.`}
        confirmText="Borrar"
        type="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
