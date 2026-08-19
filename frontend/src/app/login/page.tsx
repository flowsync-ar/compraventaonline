"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import CustomDropdown from "@/components/CustomDropdown"
import GenericAvatar from "@/components/GenericAvatar"
import Toast from "@/components/Toast"
import TermsAcceptanceModal from "@/components/TermsAcceptanceModal"
import { LA_PAMPA_CITIES } from "@/lib/constants/laPampaCities"

// useSearchParams() requires a Suspense boundary in Next.js 16 (same fix
// as the dashboard's "Vender" tab-sync bug) — needed here so the header's
// <Link href="/login"> actually does something when the visitor is
// already on /login viewing the register form: without a query-param
// driving `isLogin`, a Link to the exact same pathname is a client-side
// no-op (no URL change => no re-render), so "INGRESAR" appeared dead.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Lazy client init to avoid prerender errors when env vars are missing at build time
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null)
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const [isLogin, setIsLogin] = useState(true)

  // Single source of truth for which form is showing: the `mode` query
  // param, not just local state. Toggling in-page updates both (instant
  // feedback + a real URL to navigate back to), so a Link from anywhere
  // else on the site pointing at /login (login) or /login?mode=register
  // always lands on the right view, even if the visitor is already on
  // /login — a URL change to a different `mode` is what makes Next.js
  // actually re-run this effect instead of treating the click as a no-op.
  useEffect(() => {
    setIsLogin(searchParams.get("mode") !== "register")
  }, [searchParams])
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")

  // Forgot password
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // Form fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState("")
  const [sellerType, setSellerType] = useState<"PERSONAL_SELLER" | "BUSINESS_SELLER">("PERSONAL_SELLER")
  const [documentNumber, setDocumentNumber] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  // Username — always lowercase (see register/route.ts for why), must be
  // explicitly checked (button click, not on-the-fly) before it can be
  // submitted. Any edit after a check invalidates it back to "idle".
  const [username, setUsername] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle")
  const [usernameMsg, setUsernameMsg] = useState("")

  // Avatar — optional. Preview is a local object URL, never uploaded until
  // the whole registration form is submitted (see fileToBase64 in handleSubmit).
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/

  const handleUsernameChange = (value: string) => {
    setUsername(value.toLowerCase())
    setUsernameStatus("idle")
    setUsernameMsg("")
  }

  const checkUsernameAvailability = async (candidate: string): Promise<boolean> => {
    const { data, error } = await getSupabase().from("sellers").select("id").eq("username", candidate).maybeSingle()
    // A query error (network issue, missing column, whatever) must NOT be
    // read as "no row found" — that would silently report a taken/unverified
    // username as available.
    if (error) throw error
    return !data
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

  const handleSuggestUsername = async () => {
    const base = (slugifyForUsername(fullName) || slugifyForUsername(email.split("@")[0] ?? "") || "usuario").slice(0, 25)
    setUsernameStatus("checking")
    try {
      let candidate = base
      for (let attempt = 0; attempt < 6; attempt++) {
        if (await checkUsernameAvailability(candidate)) {
          setUsername(candidate)
          setUsernameStatus("available")
          setUsernameMsg("¡Disponible! Te sugerimos este nombre de usuario.")
          return
        }
        candidate = `${base}${Math.floor(100 + Math.random() * 900)}`
      }
      setUsernameStatus("idle")
      setUsernameMsg("No pudimos encontrar una sugerencia libre, probá escribiendo una vos.")
    } catch {
      setUsernameStatus("idle")
      setUsernameMsg("No se pudo generar una sugerencia. Intentá de nuevo.")
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg("La foto de perfil no puede superar los 3MB.")
      return
    }
    setAvatarFile(file)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  // Redirect if already logged in
  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/")
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setSuccessMsg("")
    setLoading(true)

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { error } = await getSupabase().auth.signInWithPassword({ email, password })

        if (error) {
          // Supabase returns the same generic "Invalid login credentials"
          // whether the email doesn't exist or the password is wrong, on
          // purpose (anti account-enumeration). We deliberately undo that
          // here via a server-side lookup, so we only distinguish the two
          // AFTER an actual failed login attempt — not on every keystroke.
          if (error.message === "Invalid login credentials") {
            let emailExists = true
            try {
              const res = await fetch("/api/auth/check-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              })
              if (res.ok) {
                const data = await res.json()
                emailExists = !!data.exists
              }
            } catch {
              // If the check itself fails, fall back to the generic message
              // below rather than block the user on a broken lookup.
            }
            throw new Error(
              emailExists
                ? "Email o contraseña incorrectos."
                : "No existe un usuario registrado con ese email."
            )
          }

          const knownErrors: Record<string, string> = {
            "Email not confirmed": "Todavía no confirmaste tu email. Revisá tu casilla de correo.",
          }
          throw new Error(knownErrors[error.message] ?? error.message)
        }

        setSuccessMsg("¡Inicio de sesión exitoso! Redireccionando...")
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 1000)

      } else {
        // --- REGISTER FLOW ---
        if (!acceptTerms) {
          throw new Error("Debes aceptar los términos y condiciones de la comunidad.")
        }
        if (usernameStatus !== "available") {
          throw new Error("Comprobá la disponibilidad de tu nombre de usuario antes de continuar.")
        }
        if (!location) {
          throw new Error("Seleccioná tu ciudad.")
        }

        const avatarDataUrl = avatarFile ? await fileToBase64(avatarFile) : null

        // Create auth user + send confirmation email server-side (own Zoho SMTP,
        // not Supabase's shared mailer). The trigger handle_new_user creates
        // the sellers row; the route itself records terms_acceptances (the
        // trigger never touched that table, despite what this comment used
        // to claim — see TermsAcceptanceModal for the actual consent UI).
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            fullName,
            sellerType,
            documentNumber,
            phone,
            location,
            username,
            acceptTerms,
            avatarDataUrl,
          }),
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.error ?? "No se pudo crear la cuenta. Intentá de nuevo.")
        }

        setRegisteredEmail(email)
        setShowConfirmModal(true)
        setLoading(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ocurrió un error inesperado."
      setErrorMsg(message)
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      })
      setForgotSent(true)
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgotModal = () => {
    setShowForgotModal(false)
    setForgotSent(false)
    setForgotEmail("")
  }

  return (
    <>
    {/* Fixed to the viewport (not the form card) on purpose — a long
        registration form scrolls, and an inline banner up top would go
        unseen once the user's scrolled down to e.g. the terms checkbox.
        Horizontally centered but pinned near the TOP (not true dead-center)
        — dead-center used to sit right on top of the form card and hide
        it; floating just below the header keeps it visible without
        covering anything the user actually needs to see. */}
    <div className="fixed inset-x-0 top-24 z-[100] flex items-start justify-center p-4 pointer-events-none">
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {errorMsg && <Toast type="error" message={errorMsg} onClose={() => setErrorMsg("")} />}
        {successMsg && <Toast type="success" message={successMsg} onClose={() => setSuccessMsg("")} />}
      </div>
    </div>
    {showTermsModal && (
      <TermsAcceptanceModal
        onAccept={() => { setAcceptTerms(true); setShowTermsModal(false); }}
        onClose={() => setShowTermsModal(false)}
      />
    )}
    {showConfirmModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-card-bg border border-card-border rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3">
            <span className="text-5xl">📬</span>
            <h2 className="font-heading text-xl font-extrabold text-foreground">
              ¡Revisá tu correo!
            </h2>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Te enviamos un email de confirmación a{" "}
            <span className="text-foreground font-bold">{registeredEmail}</span>.
            <br /><br />
            Hacé clic en el enlace del email para activar tu cuenta y empezar a usar CompraVentaOnline.
          </p>
          <p className="text-xs text-text-muted">
            ¿No lo encontrás? Revisá la carpeta de <span className="text-accent-gold font-bold">Spam</span> o Promociones.
          </p>
          <button
            onClick={() => { setShowConfirmModal(false); setIsLogin(true); router.push("/login") }}
            className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all cursor-pointer"
          >
            Entendido, volver al inicio de sesión
          </button>
        </div>
      </div>
    )}
    {showForgotModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-card-bg border border-card-border rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col gap-5 relative">
          <button
            onClick={closeForgotModal}
            className="absolute top-4 right-4 text-text-muted hover:text-foreground text-lg cursor-pointer"
          >
            ✕
          </button>

          {forgotSent ? (
            <div className="text-center flex flex-col gap-3">
              <span className="text-5xl">📬</span>
              <h2 className="font-heading text-xl font-extrabold text-foreground">¡Listo!</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                Si <span className="text-foreground font-bold">{forgotEmail}</span> está registrado, te
                enviamos instrucciones para restablecer la contraseña. Revisá tu correo (y la carpeta de Spam).
              </p>
              <button
                onClick={closeForgotModal}
                className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all cursor-pointer mt-2"
              >
                Entendido
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <span className="text-4xl">🔑</span>
                <h2 className="font-heading text-xl font-extrabold text-foreground mt-3">¿Olvidaste tu contraseña?</h2>
                <p className="text-sm text-text-muted mt-1">Te mandamos un enlace para elegir una nueva.</p>
              </div>
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nombre@correo.com"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? "Enviando..." : "Enviar enlace"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )}
    <div className="mx-auto max-w-lg px-4 py-16 w-full flex flex-col gap-6">
      <div className="text-center">
        <span className="text-4xl">🌾</span>
        <h1 className="font-heading text-2xl font-extrabold text-foreground mt-4">
          {isLogin ? "Ingresá a tu Cuenta" : "Registrate en la Plataforma"}
        </h1>
        <p className="text-text-muted text-xs mt-1">
          {isLogin
            ? "Conectá con compradores y vendedores de toda La Pampa."
            : "Creá tu perfil de vendedor y empezá a publicar gratis."
          }
        </p>
      </div>

      <div className="rounded-3xl bg-card-bg border border-card-border p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Avatar (Registration only, optional) */}
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground">Foto de Perfil (opcional)</label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden border border-card-border">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="Vista previa de tu foto de perfil" className="h-full w-full object-cover" />
                  ) : (
                    <GenericAvatar />
                  )}
                </div>
                <label className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-accent-gold hover:text-accent-gold transition-colors">
                  {avatarFile ? "Cambiar foto" : "Elegir foto"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] text-text-muted">
                Si no elegís una, tu perfil muestra una foto genérica hasta que subas la tuya.
              </p>
            </div>
          )}

          {/* Full Name (Registration only) */}
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground">Nombre Completo / Razón Social</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Juan Pérez o Ferretería Luro"
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
              />
            </div>
          )}

          {/* Username (Registration only) */}
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground">Nombre de Usuario</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="Ej. juan.perez"
                  className="flex-1 min-w-0 bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                />
                <button
                  type="button"
                  onClick={handleCheckUsername}
                  disabled={!username.trim() || usernameStatus === "checking"}
                  className="shrink-0 rounded-xl border border-card-border px-3 py-2 text-[11px] font-bold text-foreground hover:border-accent-gold hover:text-accent-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {usernameStatus === "checking" ? "Comprobando..." : "Comprobar disponibilidad"}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                {usernameMsg && (
                  <p
                    className={`text-[11px] font-semibold ${
                      usernameStatus === "available"
                        ? "text-accent-green"
                        : usernameStatus === "taken" || usernameStatus === "invalid"
                          ? "text-red-500"
                          : "text-text-muted"
                    }`}
                  >
                    {usernameMsg}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSuggestUsername}
                  disabled={usernameStatus === "checking"}
                  className="ml-auto text-[11px] font-bold text-accent-gold hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sugerir nombre de usuario
                </button>
              </div>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-foreground">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-foreground">Contraseña</label>
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-background border border-card-border rounded-xl pl-4 pr-11 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground transition-colors cursor-pointer focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
            {isLogin && (
              <button
                type="button"
                onClick={() => { setForgotEmail(email); setShowForgotModal(true) }}
                className="self-end text-[11px] font-bold text-accent-gold hover:underline cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>

          {/* Seller Setup (Registration only) */}
          {!isLogin && (
            <>
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
                  required
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
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
                    onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                    className="text-accent-gold hover:underline font-semibold cursor-pointer"
                  >
                    Términos y Condiciones
                  </button>{" "}
                  y las <Link href="/rules" className="text-accent-gold hover:underline">Reglas de la Comunidad</Link> de CompraVentaOnline.
                </label>
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-4 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all mt-4 disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? (isLogin ? "Iniciando sesión..." : "Registrando perfil...")
              : (isLogin ? "Ingresar" : "Crear Perfil Comercial")
            }
          </button>
        </form>

        <div className="border-t border-card-border/50 pt-5 mt-6 text-center text-xs text-text-muted">
          {isLogin ? (
            <p>
              ¿No tenés una cuenta?{" "}
              <button
                type="button"
                onClick={() => { setIsLogin(false); setErrorMsg(""); setSuccessMsg(""); router.push("/login?mode=register"); }}
                className="text-accent-gold font-bold hover:underline cursor-pointer"
              >
                Registrate como vendedor
              </button>
            </p>
          ) : (
            <p>
              ¿Ya estás registrado?{" "}
              <button
                type="button"
                onClick={() => { setIsLogin(true); setErrorMsg(""); setSuccessMsg(""); router.push("/login"); }}
                className="text-accent-gold font-bold hover:underline cursor-pointer"
              >
                Ingresá con tu cuenta
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
