"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import CompanyLogoPicker from "@/components/CompanyLogoPicker"

interface Company {
  id: string
  name: string
  email: string | null
  phone: string | null
  location: string | null
  address: string | null
  avatar_url: string | null
  username: string | null
}

const inputClass =
  "w-full bg-background border border-card-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"

export default function AdminEmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [convertedMsg, setConvertedMsg] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [address, setAddress] = useState("")
  const [instagram, setInstagram] = useState("")
  const [website, setWebsite] = useState("")
  const [bio, setBio] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  const load = async () => {
    const res = await fetch("/api/admin/empresas")
    const data = await res.json()
    if (!res.ok) setError(data.error ?? "No se pudieron cargar las empresas.")
    else {
      setError(null)
      setCompanies(data.companies ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setCreatedPassword(null)
    setConvertedMsg(null)
    try {
      const form = new FormData()
      form.append("name", name)
      form.append("email", email)
      form.append("phone", phone)
      form.append("location", location)
      form.append("address", address)
      form.append("instagram", instagram)
      form.append("website", website)
      form.append("bio", bio)
      form.append("documentNumber", documentNumber)
      if (logoFile) form.append("logo", logoFile)
      const res = await fetch("/api/admin/empresas", {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la empresa.")
        return
      }
      if (data.converted) {
        setCreatedPassword(null)
        setError(null)
        setConvertedMsg(
          `Esa cuenta ya existía${data.previousName ? ` (${data.previousName})` : ""}. La pasamos a empresa suscripta, sin crear un usuario nuevo.`,
        )
      } else {
        setConvertedMsg(null)
        setCreatedPassword(data.password ?? null)
      }
      setShowForm(false)
      setName("")
      setEmail("")
      setPhone("")
      setLocation("")
      setAddress("")
      setInstagram("")
      setWebsite("")
      setBio("")
      setDocumentNumber("")
      setLogoFile(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-extrabold text-foreground">Empresas suscriptas</h1>
          <p className="text-xs text-text-muted mt-1 max-w-xl">
            Cargá el comercio una vez (logo, teléfono, dirección, Instagram). Cada producto que publiques queda
            a nombre de esa empresa y muestra esos datos en el aviso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background cursor-pointer"
        >
          {showForm ? "Cancelar" : "Agregar empresa"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
      {createdPassword && (
        <p className="text-sm text-accent-green font-bold">
          Empresa creada. Contraseña inicial (guardala): {createdPassword}
        </p>
      )}
      {convertedMsg && <p className="text-sm text-accent-green font-bold">{convertedMsg}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-card-border bg-card-bg p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-xs font-bold">
            Nombre de la empresa
            <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Email (opcional)
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Teléfono
            <input required className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <div className="md:col-span-2">
            <CompanyLogoPicker
              previewUrl={logoPreview}
              fileName={logoFile?.name ?? null}
              onFile={setLogoFile}
            />
          </div>
          <label className="flex flex-col gap-1 text-xs font-bold">
            CUIT (opcional)
            <input className={inputClass} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Ciudad
            <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Santa Rosa" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Dirección
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Instagram
            <input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@comercio o URL" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold">
            Sitio web
            <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold md:col-span-2">
            Descripción
            <textarea className={`${inputClass} min-h-20`} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Creando…" : "Crear empresa"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : companies.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no hay empresas suscriptas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/admin/empresas/${company.id}`}
              className="flex items-center gap-4 rounded-2xl border border-card-border bg-card-bg p-4 hover:border-accent-gold transition-colors"
            >
              <div className="h-12 w-12 rounded-xl overflow-hidden bg-background border border-card-border shrink-0">
                {company.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.avatar_url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="flex h-full items-center justify-center text-lg">🏢</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground truncate">{company.name}</p>
                <p className="text-[11px] text-text-muted truncate">
                  {company.phone}
                  {company.location ? ` · ${company.location}` : ""}
                  {company.address ? ` · ${company.address}` : ""}
                </p>
              </div>
              <span className="text-[10px] font-extrabold text-accent-gold uppercase">Abrir</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
