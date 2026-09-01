"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
  category: "vendedores" | "compradores" | "general" | "reputacion";
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<"all" | "general" | "vendedores" | "compradores" | "reputacion">("all");
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sending, setSending] = useState(false);

  const faqs: FAQItem[] = [
    {
      category: "general",
      question: "¿Qué es CompraVentaOnline?",
      answer: "Es el primer marketplace diseñado exclusivamente para conectar a compradores y vendedores dentro de la provincia de La Pampa, Argentina. Facilitamos el comercio de cercanía de forma gratuita, permitiendo buscar publicaciones por localidad (Santa Rosa, General Pico, Toay, Realicó, etc.) y coordinar el intercambio directamente sin intermediarios obligatorios."
    },
    {
      category: "general",
      question: "¿Por qué tengo que validar mi identidad para comprar o vender?",
      answer: "CompraVentaOnline pide validación de identidad para publicar, vender y usar funciones de compra o contacto comercial. El objetivo es una comunidad más segura: confirmar que sos mayor de 18 años y que la cuenta corresponde a una persona real. Completás el proceso en Verificar identidad (documento y datos auténticos de tu propia identidad). Tener la identidad validada no garantiza la conducta de la otra parte: sigue siendo una operación entre particulares. No está permitido usar datos ajenos, documentación falsa ni una cuenta validada de otra persona."
    },
    {
      category: "vendedores",
      question: "¿Cómo puedo empezar a vender mis productos?",
      answer: "1) Registrate (solo mayores de 18 años) con datos verdaderos. 2) Completá la validación de identidad: sin eso no podés publicar. 3) Entrá a Vender / Publicar artículo. 4) Cargá fotos, descripción, precio real y categoría, y confirmá. Tu artículo pasa por moderación y luego aparece en el buscador. El pago y la entrega los coordinás vos con el comprador."
    },
    {
      category: "reputacion",
      question: "¿Cómo se califica a los vendedores?",
      answer: "Cada vez que concretás una venta, el comprador puede calificarte: Positiva (+10 puntos), Neutral (0 puntos) o Negativa (-5 puntos). Esos puntos se acumulan de por vida y determinan tu nivel: 🥉 BRONCE (0-49 pts), 🥈 PLATA (50-149 pts), 🥇 ORO (150-299 pts) y 💎 PREMIUM (300+ pts). Tu nivel y puntaje se muestran en tus publicaciones para que los compradores sepan con quién están tratando."
    },
    {
      category: "reputacion",
      question: "¿Cómo se califica a los compradores?",
      answer: "Con el mismo criterio que a los vendedores: cada vez que confirmás una compra, el vendedor puede calificarte Positiva (+10 puntos), Neutral (0 puntos) o Negativa (-5 puntos), acumulados de por vida con los mismos niveles (🥉 BRONCE, 🥈 PLATA, 🥇 ORO, 💎 PREMIUM). Comprar y no concretar la operación puede afectar tu calificación como comprador dentro de la plataforma."
    },
    {
      category: "reputacion",
      question: "¿Cómo canjeo un premio o destacado gratuito?",
      answer: "Si obtuviste un premio por subir de reputación, andá a tu 'Panel Vendedor', ingresá a la pestaña 'Mis Premios', elegí el destacado disponible y hacé click en 'Canje'. Seleccioná cualquiera de tus publicaciones aprobadas para aplicarle el destacado gratuito por 30 días, lo que posicionará tu artículo en la página principal y en lo alto del buscador pampeano."
    },
    {
      category: "compradores",
      question: "¿Cómo compro un artículo en la plataforma?",
      answer: "Buscá en la página principal por palabras clave, categoría, precio o condición. Para Comprar ahora necesitás estar registrado, ser mayor de 18 años y tener la identidad validada: si todavía no lo hiciste, te vamos a pedir que completes Verificar identidad. Después coordinás el pago y la entrega directamente con el vendedor. Preguntar al vendedor puede estar disponible con tu cuenta iniciada; las operaciones comerciales siguen exigiendo identidad validada."
    },
    {
      category: "compradores",
      question: "¿Cómo se coordinan las entregas y los pagos de forma segura?",
      answer: "Como CompraVentaOnline funciona como un catálogo de clasificados interactivo regional, el pago y la entrega se acuerdan directamente entre vos y el vendedor. Recomendamos siempre encontrarse en lugares públicos y concurridos (como plazas, centros comerciales o locales físicos de los comercios registrados) para realizar la transacción de forma 100% segura."
    },
    {
      category: "general",
      question: "¿Qué tipo de productos están prohibidos publicar?",
      answer: "No se pueden publicar, entre otros: drogas y sustancias controladas; armas, municiones, explosivos y pirotecnia; animales vivos; servicios o contenidos pornográficos o sexuales; medicamentos bajo receta; bienes robados o falsificados; documentos falsos; y ofertas de odio, violencia o estafa. Tampoco fotos o precios engañosos. El detalle está en el punto 7 de los Términos y Condiciones. Las publicaciones que infrinjan esas reglas se retiran y la cuenta puede ser sancionada."
    }
  ];

  const filteredFaqs = activeTab === "all" 
    ? faqs 
    : faqs.filter(faq => faq.category === activeTab);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) return;
    setSending(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/support-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error ?? "No se pudo enviar. Probá de nuevo.");
        return;
      }
      setSubmitted(true);
      setContactName("");
      setContactEmail("");
      setContactMessage("");
      setTimeout(() => {
        setSubmitted(false);
      }, 4000);
    } catch {
      setSubmitError("No se pudo enviar. Probá de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col gap-10">
      
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
        <span className="text-5xl">💬</span>
        <h1 className="font-heading text-4xl font-extrabold text-foreground mt-2">Centro de Soporte y Ayuda</h1>
        <p className="text-text-muted text-base leading-relaxed">
          Encontrá respuestas a las consultas más frecuentes sobre cómo comprar, vender y gestionar tus publicaciones en el marketplace de La Pampa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* FAQs Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-wrap gap-2 border-b border-card-border pb-4">
            {[
              { id: "all", label: "Preguntas Frecuentes" },
              { id: "general", label: "General" },
              { id: "vendedores", label: "Vender" },
              { id: "compradores", label: "Comprar" },
              { id: "reputacion", label: "Reputación y Premios" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setOpenFAQIndex(null);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-accent-blue text-white shadow-md" 
                    : "text-foreground/80 hover:bg-card-border/30"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openFAQIndex === index;
              return (
                <div 
                  key={index} 
                  className="rounded-2xl border border-card-border bg-card-bg-solid overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => setOpenFAQIndex(isOpen ? null : index)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 font-heading font-semibold text-sm text-foreground hover:text-accent-gold transition-colors cursor-pointer select-none"
                  >
                    <span>{faq.question}</span>
                    <span className="text-accent-gold shrink-0 text-lg">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-text-muted leading-relaxed border-t border-card-border/30 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Form Panel */}
        <div className="rounded-2xl border border-card-border bg-card-bg-solid p-6 shadow-xl flex flex-col gap-6">
          <div>
            <h3 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider">¿Tenés otra duda?</h3>
            <p className="text-text-muted text-xs mt-1 leading-relaxed">
              Comunicate con el equipo técnico de CompraVentaOnline y te responderemos a la brevedad.
            </p>
          </div>

          {submitted ? (
            <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-xl p-4 text-sm font-medium text-center animate-in fade-in zoom-in-95 duration-200">
              ✓ ¡Mensaje recibido! Nos pondremos en contacto con vos lo antes posible.
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ej. Juan Pérez" 
                  className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Correo Electrónico</label>
                <input 
                  type="email" 
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="nombre@correo.com" 
                  className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Mensaje / Consulta</label>
                <textarea 
                  required
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Contanos detalladamente en qué podemos ayudarte..." 
                  className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold resize-none"
                />
              </div>

              {submitError && (
                <p className="text-xs text-red-500 font-bold">{submitError}</p>
              )}

              <button 
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-sm font-extrabold text-white shadow-md hover:opacity-95 transition-all mt-2 cursor-pointer disabled:opacity-50"
              >
                {sending ? "Enviando..." : "Enviar Consulta"}
              </button>
            </form>
          )}

          <div className="border-t border-card-border/50 pt-4 flex flex-col gap-1.5 text-xs text-text-muted leading-relaxed">
            <p>✉️ soporte@compraventaonline.com.ar</p>
          </div>
        </div>

      </div>
    </div>
  );
}
