"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // The recovery link lands here with tokens in the URL — the Supabase SDK
  // exchanges them for a temporary "recovery" session automatically and
  // fires PASSWORD_RECOVERY. Without that session, updateUser() would fail.
  useEffect(() => {
    const supabase = getSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const timeout = setTimeout(() => {
      setReady((current) => {
        if (!current) setInvalidLink(true)
        return current
      })
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password })
      if (updateError) throw new Error(updateError.message)

      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 w-full flex flex-col gap-6">
      <div className="text-center">
        <span className="text-4xl">🔑</span>
        <h1 className="font-heading text-2xl font-extrabold text-foreground mt-4">Elegí tu nueva contraseña</h1>
      </div>

      <div className="rounded-3xl bg-card-bg border border-card-border p-8 shadow-xl">
        {invalidLink ? (
          <div className="text-center flex flex-col gap-3">
            <p className="text-sm text-text-muted">
              Este enlace no es válido o ya expiró. Pedí uno nuevo desde la pantalla de inicio de sesión.
            </p>
          </div>
        ) : !ready ? (
          <p className="text-sm text-text-muted text-center">Verificando enlace...</p>
        ) : success ? (
          <div className="bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-xl p-4 text-sm font-semibold text-center">
            ✓ Contraseña actualizada. Redirigiendo al inicio de sesión...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-sm font-semibold">
                ⚠️ {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent-gold"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground">Confirmar contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent-gold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-4 text-sm font-extrabold text-background shadow-md hover:opacity-95 transition-all mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
