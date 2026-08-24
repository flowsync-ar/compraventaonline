"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import CustomDropdown from "@/components/CustomDropdown"
import Toast from "@/components/Toast"
import TermsAcceptanceModal from "@/components/TermsAcceptanceModal"
import { LA_PAMPA_CITIES } from "@/lib/constants/laPampaCities"

const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/

function CompletarPerfilForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/dashboard"

  const supabaseRef = useRef<SupabaseClient<Database> | null>(null)
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [checkingSession, setCheckingSession] = useState(true)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")

  const [username, setUsername] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle")
  const [usernameMsg, setUsernameMsg] = useState("")

  const [sellerType, setSellerType] = useState<"PERSONAL_SELLER" | "BUSINESS_SELLER">("PERSONAL_SELLER")
  const [documentNumber, setDocumentNumber] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // CUIL/CUIT are always 11 digits, formatted XX-XXXXXXXX-X — strips
  // whatever the user typed down to digits first so pasting a raw 11-digit
  // number, or editing mid-string, both land in the right shape.
  const formatCuit = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
  }

  const slugifyForUsername = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(".")

  const checkUsernameAvailability = async (candidate: string): Promise<boolean> => {
    const { data, error } = await getSupabase().from("sellers").select("id").eq("username", candidate).maybeSingle()
    if (error) throw error
    return !data
  }

  // No session → nothing to complete, back to login. Session exists →
  // prefill from Google's own metadata and suggest a free username so this
  // is a one-click "looks good, continue" for most people.
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) {
        router.replace("/login")
        return
      }
      const meta = session.user.user_metadata
      const name = (meta?.full_name as string) || (meta?.name as string) || ""
      setFullName(name)
      setEmail(session.user.email ?? "")

      const base = (slugifyForUsername(name) || slugifyForUsername((session.user.email ?? "").split("@")[0])).slice(0, 25) || "usuario"
      try {
        let candidate = base
        for (let attempt = 0; attempt < 6; attempt++) {
          if (await checkUsernameAvailability(candidate)) {
            setUsername(candidate)
            setUsernameStatus("available")
            setUsernameMsg("¡Disponible!")
            break
          }
          candidate = `${base}${Math.floor(100 + Math.random() * 900)}`
        }
      } catch {
        // Best-effort suggestion — the user can still type their own.
      }
      setCheckingSession(false)
    }
    init() // eslint-disable-line react-hooks/set-state-in-effect
  }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUsernameChange = (value: string) => {
    setUsername(value.toLowerCase())
    setUsernameStatus("idle")
    setUsernameMsg("")
  }

  const handleCheckUsername = async () => {
    const trimmed = username.trim()
    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameStatus("invalid")
      setUsernameMsg("Usá entre 3 y 30 caracteres: letras, números, puntos o guiones bajos.")
      return
    }
    setUsernameStatus("checking")
    try {
      const available = await checkUsernameAvailability(trimmed)
      if (available) {
        setUsernameStatus("available")
        setUsernameMsg("¡Disponible!")
      } else {
        setUsernameStatus("taken")
        setUsernameMsg("Este nombre de usuario ya existe.")
      }
    } catch {
      setUsernameStatus("idle")
      setUsernameMsg("No se pudo comprobar la disponibilidad. Intentá de nuevo.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (usernameStatus !== "available") {
      setErrorMsg("Verificá que el nombre de usuario esté disponible antes de continuar.")
      return
    }
    if (!acceptTerms) {
      setErrorMsg("Debes aceptar los términos y condiciones para continuar.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, sellerType, documentNumber, phone, location, acceptTerms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo completar el perfil.")
      router.push(next)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo completar el perfil.")
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-text-muted">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">¡Ya casi estás!</h1>
          <p className="text-text-muted text-xs mt-1">
            Nos faltan un par de datos para terminar de armar tu Perfil Comercial, {fullName || email}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl glass-panel p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-foreground">Nombre de Usuario</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="ej. juan.perez"
                className="flex-1 bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
              />
              <button
                type="button"
                onClick={handleCheckUsername}
                disabled={usernameStatus === "checking"}
                className="rounded-xl border border-card-border px-4 text-xs font-bold text-foreground hover:border-accent-gold transition-all cursor-pointer disabled:opacity-50"
              >
                {usernameStatus === "checking" ? "..." : "Verificar"}
              </button>
            </div>
            {usernameMsg && (
              <p className={`text-[11px] font-semibold ${
                usernameStatus === "available" ? "text-base font-bold text-accent-green" :
                usernameStatus === "taken" || usernameStatus === "invalid" ? "text-red-500" : "text-text-muted"
              }`}>
                {usernameMsg}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-foreground">Tipo de Vendedor</label>
            <div className="grid grid-cols-2 gap-3 bg-background border border-card-border p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSellerType("PERSONAL_SELLER")}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sellerType === "PERSONAL_SELLER" ? "bg-accent-blue text-background shadow-md" : "text-text-muted hover:text-foreground"
                }`}
              >
                Particular
              </button>
              <button
                type="button"
                onClick={() => setSellerType("BUSINESS_SELLER")}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sellerType === "BUSINESS_SELLER" ? "bg-accent-blue text-background shadow-md" : "text-text-muted hover:text-foreground"
                }`}
              >
                Comercio
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-foreground">
              {sellerType === "PERSONAL_SELLER" ? "DNI / CUIL" : "CUIT"}
            </label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(formatCuit(e.target.value))}
              placeholder={sellerType === "PERSONAL_SELLER" ? "Ej. 20-35444333-8" : "Ej. 30-71112223-9"}
              className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-foreground">Celular</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 2954123456"
              className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
            />
            <p className="text-[10px] text-text-muted">
              Lo vamos a compartir solo con compradores que ya iniciaron sesión, para coordinar la entrega.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-foreground">Ciudad</label>
            <CustomDropdown
              name="location"
              defaultValue={location}
              showSearch
              onChange={(value) => setLocation(value)}
              options={[
                { name: "Seleccioná tu ciudad", value: "" },
                ...LA_PAMPA_CITIES.map((city) => ({ name: city, value: city })),
              ]}
            />
          </div>

          <div className="flex items-start gap-2.5 mt-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-card-border bg-background text-accent-gold accent-accent-gold focus:ring-accent-gold"
            />
            <label htmlFor="terms" className="text-xs text-text-muted select-none leading-relaxed cursor-pointer">
              Acepto los{" "}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowTermsModal(true) }}
                className="text-accent-gold hover:underline font-semibold cursor-pointer"
              >
                Términos y Condiciones
              </button>{" "}
              y las <Link href="/rules" className="text-accent-gold hover:underline">Reglas de la Comunidad</Link> de CompraVentaOnline.
            </label>
          </div>

          {errorMsg && <Toast type="error" message={errorMsg} onClose={() => setErrorMsg("")} />}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-4 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all mt-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Guardando..." : "Terminar y Continuar"}
          </button>
        </form>
      </div>

      {showTermsModal && (
        <TermsAcceptanceModal
          onAccept={() => { setAcceptTerms(true); setShowTermsModal(false) }}
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </div>
  )
}

export default function CompletarPerfilPage() {
  return (
    <Suspense fallback={null}>
      <CompletarPerfilForm />
    </Suspense>
  )
}
