"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import CompanyLogoPicker from "@/components/CompanyLogoPicker"
import CategorySubcategoryPicker from "@/components/CategorySubcategoryPicker"
import CustomDropdown from "@/components/CustomDropdown"
import { normalizeListingTitle } from "@/lib/listingTitle"

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

interface Company {
  id: string
  name: string
  email: string | null
  phone: string
  location: string | null
  address: string | null
  instagram: string | null
  website: string | null
  bio: string | null
  avatar_url: string | null
  username: string | null
  document_number: string | null
}

interface ListingRow {
  id: string
  price: number
  stock: number
  status: string
  image_url: string | null
  products: { name: string } | null
  currencies: { symbol: string } | null
}

const inputClass =
  "w-full bg-background border border-card-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"

export default function AdminEmpresaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [company, setCompany] = useState<Company | null>(null)
  const [listings, setListings] = useState<ListingRow[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; parent_id: string | null }[]>([])
  const [currencies, setCurrencies] = useState<{ id: string; code: string; symbol: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [address, setAddress] = useState("")
  const [instagram, setInstagram] = useState("")
  const [website, setWebsite] = useState("")
  const [bio, setBio] = useState("")
  const [username, setUsername] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")

  const [productName, setProductName] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("1")
  const [categoryId, setCategoryId] = useState("")
  const [currencyId, setCurrencyId] = useState("")
  const [brand, setBrand] = useState("")
  const [description, setDescription] = useState("")
  const [photoDrafts, setPhotoDrafts] = useState<{ id: string; file: File; preview: string }[]>([])
  const [draggingPhoto, setDraggingPhoto] = useState<number | null>(null)
  const [photosDropActive, setPhotosDropActive] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/admin/empresas/${id}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "No se pudo cargar.")
      return
    }
    const next: Company = data.company
    setCompany(next)
    setListings(data.listings ?? [])
    setCategories(data.categories ?? [])
    setCurrencies(data.currencies ?? [])
    setName(next.name)
    setPhone(next.phone ?? "")
    setLocation(next.location ?? "")
    setAddress(next.address ?? "")
    setInstagram(next.instagram ?? "")
    setWebsite(next.website ?? "")
    setBio(next.bio ?? "")
    setUsername(next.username ?? "")
    setDocumentNumber(next.document_number ?? "")
    const ars = (data.currencies ?? []).find((c: { code: string }) => c.code === "ARS")
    setCurrencyId((current) => current || ars?.id || data.currencies?.[0]?.id || "")
  }

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parent_id })),
    [categories],
  )
  const selectedCurrency = currencies.find((c) => c.id === currencyId)

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const res = await fetch(`/api/admin/empresas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          location,
          address,
          instagram,
          website,
          bio,
          username,
          documentNumber,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.")
        return
      }
      setCompany(data.company)
      setOk("Datos de la empresa actualizados. Los avisos ya publicados los muestran solos.")
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file: File) => {
    setLogoUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`/api/admin/empresas/${id}/logo`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir el logo.")
        return
      }
      setCompany((current) => (current ? { ...current, avatar_url: data.avatar_url } : current))
      setOk("Logo actualizado. Aparece en la esquina de las fotos de sus productos.")
    } finally {
      setLogoUploading(false)
    }
  }

  const publishProduct = async (e: FormEvent) => {
    e.preventDefault()
    setPublishing(true)
    setError(null)
    setOk(null)
    try {
      const form = new FormData()
      const listingTitle = normalizeListingTitle(productName)
      setProductName(listingTitle)
      form.append("name", listingTitle)
      form.append("price", price)
      form.append("stock", stock)
      form.append("categoryId", categoryId)
      form.append("currencyId", currencyId)
      form.append("brand", brand)
      form.append("description", description)
      photoDrafts.forEach((photo) => form.append("files", photo.file))
      const res = await fetch(`/api/admin/empresas/${id}/listings`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo publicar.")
        return
      }
      setProductName("")
      setPrice("")
      setStock("1")
      setBrand("")
      setDescription("")
      setPhotoDrafts((prev) => {
        prev.forEach((photo) => URL.revokeObjectURL(photo.preview))
        return []
      })
      setOk("Producto publicado con los datos de la empresa.")
      await load()
    } finally {
      setPublishing(false)
    }
  }

  const addPhotoFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list).filter((file) => file.type.startsWith("image/"))
    if (incoming.length === 0) return
    setPhotoDrafts((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ])
  }

  const movePhoto = (from: number, to: number) => {
    if (from === to) return
    setPhotoDrafts((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  if (!company && !error) {
    return <p className="p-6 text-sm text-text-muted">Cargando…</p>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/empresas" className="text-[11px] font-bold text-accent-gold hover:underline">
            ← Empresas
          </Link>
          <h1 className="font-heading text-xl font-extrabold text-foreground mt-1">{company?.name ?? "Empresa"}</h1>
        </div>
        {company && (
          <Link
            href={`/admin/precios?sellerId=${company.id}`}
            className="rounded-xl border border-card-border px-3 py-2 text-[11px] font-extrabold text-foreground hover:border-accent-gold"
          >
            Actualizar precios
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
      {ok && <p className="text-sm text-accent-green font-bold">{ok}</p>}

      {company && (
        <>
          <form onSubmit={saveProfile} className="rounded-2xl border border-card-border bg-card-bg p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <CompanyLogoPicker
                previewUrl={company.avatar_url}
                onFile={(file) => void uploadLogo(file)}
                uploading={logoUploading}
              />
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Nombre
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Usuario
              <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Teléfono
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              CUIT
              <input className={inputClass} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Ciudad
              <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Dirección
              <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Instagram
              <input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              Sitio web
              <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold md:col-span-2">
              Descripción
              <textarea className={`${inputClass} min-h-20`} value={bio} onChange={(e) => setBio(e.target.value)} />
            </label>
            <div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Guardando…" : "Guardar datos"}
              </button>
            </div>
          </form>

          <form onSubmit={publishProduct} className="rounded-2xl border border-card-border bg-card-bg p-5 flex flex-col gap-4">
            <h2 className="font-heading text-sm font-extrabold">Cargar producto de esta empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs font-bold md:col-span-2">
                Título
                <input
                  required
                  maxLength={80}
                  className={inputClass}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  onBlur={() => setProductName(normalizeListingTitle(productName))}
                />
              </label>
              <div className="md:col-span-2">
                <CategorySubcategoryPicker
                  categories={categoryOptions}
                  value={categoryId}
                  onChange={setCategoryId}
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-[7.5rem_1fr] sm:grid-cols-[8.5rem_1fr] gap-3 items-end">
                <label className="flex flex-col gap-1 text-xs font-bold">
                  Moneda
                  <CustomDropdown
                    name="currencyId"
                    defaultValue={currencyId}
                    onChange={setCurrencyId}
                    options={currencies.map((c) => ({ name: `${c.symbol} ${c.code}`, value: c.id }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold">
                  Precio
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-muted font-bold w-6 shrink-0">
                      {selectedCurrency?.symbol ?? "$"}
                    </span>
                    <input
                      required
                      inputMode="decimal"
                      className={inputClass}
                      value={price}
                      onChange={(e) => setPrice(formatPriceDraft(e.target.value))}
                      placeholder="125.000"
                    />
                  </div>
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs font-bold">
                Stock
                <input className={inputClass} value={stock} onChange={(e) => setStock(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold">
                Marca
                <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} />
              </label>
              <div className="md:col-span-2 flex flex-col gap-2">
                <span className="text-xs font-bold">Fotos</span>
                <p className="text-[11px] text-text-muted -mt-1">
                  La primera es la portada. Arrastrá para reordenar o tocá “Portada” en otra miniatura.
                </p>
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 transition-all ${
                    photosDropActive
                      ? "border-accent-gold bg-accent-gold/5"
                      : "border-card-border hover:border-accent-gold/50"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setPhotosDropActive(true)
                  }}
                  onDragLeave={() => setPhotosDropActive(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setPhotosDropActive(false)
                    if (e.dataTransfer.files.length > 0) addPhotoFiles(e.dataTransfer.files)
                  }}
                >
                  <span className="text-2xl">📸</span>
                  <p className="text-xs font-bold text-foreground">Arrastrá las fotos acá o elegí archivos</p>
                  <label className="inline-flex items-center rounded-xl border border-card-border bg-card-bg px-4 py-2 text-[11px] font-bold text-foreground cursor-pointer hover:border-accent-gold">
                    Seleccionar imágenes
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files?.length) addPhotoFiles(e.target.files)
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
                {photoDrafts.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {photoDrafts.map((photo, index) => (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={() => setDraggingPhoto(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggingPhoto === null) return
                          movePhoto(draggingPhoto, index)
                          setDraggingPhoto(null)
                        }}
                        onDragEnd={() => setDraggingPhoto(null)}
                        className={`relative aspect-square rounded-xl overflow-hidden bg-background border cursor-grab active:cursor-grabbing ${
                          index === 0 ? "border-accent-gold ring-1 ring-accent-gold/30" : "border-card-border"
                        } ${draggingPhoto === index ? "opacity-40" : ""}`}
                        title="Arrastrá para reordenar"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.preview} alt="" className="h-full w-full object-contain pointer-events-none" />
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 bg-accent-gold text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(photo.preview)
                            setPhotoDrafts((prev) => prev.filter((item) => item.id !== photo.id))
                          }}
                          className="absolute top-1 right-1 h-6 w-6 rounded-lg bg-black/60 text-white text-xs font-bold cursor-pointer"
                          aria-label="Quitar foto"
                        >
                          ×
                        </button>
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => movePhoto(index, 0)}
                            className="absolute bottom-1 right-1 rounded bg-black/60 text-white text-[8px] font-bold px-1 py-0.5 cursor-pointer"
                          >
                            Portada
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex flex-col gap-1 text-xs font-bold md:col-span-2">
                Descripción
                <textarea className={`${inputClass} min-h-24`} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </div>
            <button
              type="submit"
              disabled={publishing}
              className="self-start rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
            >
              {publishing ? "Publicando…" : "Publicar producto"}
            </button>
          </form>

          <div>
            <h2 className="font-heading text-sm font-extrabold mb-3">Catálogo ({listings.length})</h2>
            {listings.length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no hay productos.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg px-4 py-3 text-sm hover:border-accent-gold"
                  >
                    <span className="font-bold flex-1 truncate">{listing.products?.name ?? "Sin nombre"}</span>
                    <span className="text-xs font-extrabold">
                      {listing.currencies?.symbol ?? "$"}
                      {Number(listing.price).toLocaleString("es-AR")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
