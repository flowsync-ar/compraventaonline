"use client"

import { useState } from "react"
import Link from "next/link"
import { LA_PAMPA_CITIES } from "@/lib/constants/laPampaCities"
import { communityLanguageRejection } from "@/lib/communityLanguage"
import CustomDropdown from "@/components/CustomDropdown"

export default function ComerciosPage() {
  const [commerceName, setCommerceName] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    const languageError = communityLanguageRejection(commerceName, contactName, message)
    if (languageError) {
      setSubmitError(languageError)
      return
    }

    setSending(true)
    try {
      const composed = [
        "Consulta de comercio (página /comercios)",
        `Comercio: ${commerceName.trim()}`,
        `Contacto: ${contactName.trim()}`,
        phone.trim() ? `Teléfono: ${phone.trim()}` : null,
        city.trim() ? `Localidad: ${city.trim()}` : null,
        "",
        message.trim(),
      ]
        .filter((line) => line !== null)
        .join("\n")

      const res = await fetch("/api/support-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${contactName.trim()} — ${commerceName.trim()}`.slice(0, 120),
          email: email.trim(),
          message: composed,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(data.error ?? "No se pudo enviar. Probá de nuevo.")
        return
      }
      setSubmitted(true)
      setCommerceName("")
      setContactName("")
      setEmail("")
      setPhone("")
      setCity("")
      setMessage("")
    } catch {
      setSubmitError("No se pudo enviar. Probá de nuevo.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col gap-12">
      <div className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
          Publicá tu comercio en CompraVentaOnline
        </h1>
        <p className="text-text-muted text-base leading-relaxed">
          Si tenés un local o vendés en La Pampa y querés mostrar tus productos en el marketplace,
          dejános tus datos. Te contactamos para ayudarte a abrir tu perfil y cargar el catálogo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-2xl border border-card-border bg-card-bg-solid p-6 flex flex-col gap-3">
            <h2 className="font-heading text-lg font-extrabold text-foreground">¿Para quién es?</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-text-muted leading-relaxed">
              <li className="flex gap-2">
                <span className="text-accent-gold font-bold">✓</span>
                Comercios de Santa Rosa, General Pico y el resto de la provincia
              </li>
              <li className="flex gap-2">
                <span className="text-accent-gold font-bold">✓</span>
                Locales que quieren un escaparate online sin armar una web propia
              </li>
              <li className="flex gap-2">
                <span className="text-accent-gold font-bold">✓</span>
                Quienes ya venden y necesitan cargar muchas publicaciones
              </li>
            </ul>
          </div>
          <p className="text-xs text-text-muted leading-relaxed px-1">
            Si ya sabés manejar el panel, podés{" "}
            <Link href="/dashboard" className="font-bold text-accent-gold hover:underline">
              registrarte y publicar
            </Link>{" "}
            por tu cuenta. Esta página es para que te acompañemos.
          </p>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-card-border bg-card-bg-solid p-6 md:p-8 shadow-xl">
          {submitted ? (
            <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-xl p-6 text-sm font-medium text-center">
              Recibimos tu consulta. Te vamos a contactar a la brevedad.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider">
                Pedí que te contactemos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Nombre del comercio</label>
                  <input
                    type="text"
                    required
                    value={commerceName}
                    onChange={(e) => setCommerceName(e.target.value)}
                    placeholder="Ej. Casa López"
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Tu nombre</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ej. Ana López"
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="comercio@correo.com"
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="2954..."
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Localidad</label>
                <CustomDropdown
                  name="city"
                  defaultValue={city}
                  onChange={setCity}
                  options={[
                    { name: "Elegí una localidad", value: "" },
                    ...LA_PAMPA_CITIES.map((item) => ({ name: item, value: item })),
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Contanos qué vendés</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Rubro, si ya tenés fotos o lista de productos, y cómo preferís que te contactemos."
                  className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold resize-none"
                />
              </div>
              {submitError && <p className="text-xs text-red-500 font-bold">{submitError}</p>}
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-sm font-extrabold text-white shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {sending ? "Enviando..." : "Quiero que me contacten"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
