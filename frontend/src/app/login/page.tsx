"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export default function LoginPage() {
  const router = useRouter()
  // Lazy client init to avoid prerender errors when env vars are missing at build time
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null)
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const [isLogin, setIsLogin] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")

  // Form fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState("")
  const [sellerType, setSellerType] = useState<"PERSONAL_SELLER" | "BUSINESS_SELLER">("PERSONAL_SELLER")
  const [documentNumber, setDocumentNumber] = useState("")
  const [phone, setPhone] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard")
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
          throw new Error(
            error.message === "Invalid login credentials"
              ? "Email o contraseña incorrectos."
              : error.message
          )
        }

        setSuccessMsg("¡Inicio de sesión exitoso! Redireccionando...")
        setTimeout(() => {
          router.push("/dashboard")
          router.refresh()
        }, 1000)

      } else {
        // --- REGISTER FLOW ---
        if (!acceptTerms) {
          throw new Error("Debes aceptar los términos y condiciones de la comunidad.")
        }

        // Create auth user + send confirmation email server-side (own Zoho SMTP,
        // not Supabase's shared mailer). The trigger handle_new_user creates
        // sellers + terms_acceptances automatically from the metadata below.
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

  return (
    <>
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
            onClick={() => { setShowConfirmModal(false); setIsLogin(true) }}
            className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all cursor-pointer"
          >
            Entendido, volver al inicio de sesión
          </button>
        </div>
      </div>
    )}
    <div className="mx-auto max-w-md px-4 py-16 w-full flex flex-col gap-6">
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
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-xs font-semibold mb-6">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-xl p-3 text-xs font-semibold mb-6">
            ✓ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

              <div className="flex items-start gap-2.5 mt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-card-border bg-background text-accent-gold accent-accent-gold focus:ring-accent-gold"
                />
                <label htmlFor="terms" className="text-xs text-text-muted select-none leading-relaxed cursor-pointer">
                  Acepto los <Link href="/terms" className="text-accent-gold hover:underline">Términos y Condiciones</Link> y las <Link href="/rules" className="text-accent-gold hover:underline">Reglas de la Comunidad</Link> de CompraVentaOnline.
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
                onClick={() => setIsLogin(false)}
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
                onClick={() => setIsLogin(true)}
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
