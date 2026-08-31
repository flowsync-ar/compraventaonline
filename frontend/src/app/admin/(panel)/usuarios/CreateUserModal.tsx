"use client"

import { FormEvent, useState } from "react"

const inputClass =
  "w-full bg-background border border-card-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"

type SellerType = "PERSONAL_SELLER" | "BUSINESS_SELLER"

function randomPassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

interface CreateUserModalProps {
  onClose: () => void
  onCreated: () => void
}

export default function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [sellerType, setSellerType] = useState<SellerType>("PERSONAL_SELLER")
  const [identityVerified, setIdentityVerified] = useState(false)
  const [highlightFree, setHighlightFree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          username,
          phone,
          location: location || undefined,
          documentNumber: documentNumber || undefined,
          sellerType,
          identityVerified,
          highlightFree,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el usuario.")
        return
      }
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl glass-panel p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 className="font-heading text-xl font-extrabold text-foreground">Crear usuario</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-card-border bg-card-bg text-text-muted hover:text-foreground transition-all cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Nombre</span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Contraseña</span>
            <div className="flex gap-2">
              <input
                required
                type="text"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setPassword(randomPassword())}
                className="shrink-0 h-10 px-3 rounded-xl border border-card-border bg-card-bg text-[11px] font-extrabold uppercase tracking-wide text-foreground hover:border-accent-gold/40 cursor-pointer"
              >
                Generar
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Usuario</span>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="min. 3 caracteres"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Teléfono</span>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Ubicación (opcional)</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
          </label>

          <div className="flex gap-1 p-1 rounded-xl bg-card-bg border border-card-border">
            <button
              type="button"
              onClick={() => setSellerType("PERSONAL_SELLER")}
              className={`flex-1 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wide cursor-pointer transition-all ${
                sellerType === "PERSONAL_SELLER" ? "bg-accent-blue text-white shadow-md" : "text-text-muted"
              }`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => setSellerType("BUSINESS_SELLER")}
              className={`flex-1 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wide cursor-pointer transition-all ${
                sellerType === "BUSINESS_SELLER" ? "bg-accent-blue text-white shadow-md" : "text-text-muted"
              }`}
            >
              Empresa
            </button>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
              {sellerType === "PERSONAL_SELLER" ? "DNI / CUIL (opcional)" : "CUIT (opcional)"}
            </span>
            <input
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={identityVerified}
              onChange={(e) => setIdentityVerified(e.target.checked)}
            />
            Marcar identidad verificada
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={highlightFree} onChange={(e) => setHighlightFree(e.target.checked)} />
            Permitir destacar gratis
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-card-border bg-card-bg text-sm font-bold text-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-4 rounded-xl bg-accent-gold text-sm font-extrabold text-background cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
