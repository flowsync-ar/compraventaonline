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

  const faqs: FAQItem[] = [
    {
      category: "general",
      question: "¿Qué es CompraVentaOnline?",
      answer: "Es el primer marketplace diseñado exclusivamente para conectar a compradores y vendedores dentro de la provincia de La Pampa, Argentina. Facilitamos el comercio de cercanía de forma gratuita, permitiendo buscar publicaciones por localidad (Santa Rosa, General Pico, Toay, Realicó, etc.) y coordinar el intercambio directamente sin intermediarios obligatorios."
    },
    {
      category: "vendedores",
      question: "¿Cómo puedo empezar a vender mis productos?",
      answer: "Es muy fácil: 1) Registrate en la plataforma ingresando tu nombre, email, contraseña y DNI/CUIL o CUIT. 2) Se creará automáticamente tu Perfil Comercial. 3) Hacé click en el botón 'Vender' de la barra superior. 4) Completá el formulario con el nombre del producto, descripción, marca, precio, stock, categoría y plan de destacado, y dale a publicar. Tu artículo pasará una moderación de contenido automática y estará disponible al instante en el buscador."
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
      answer: "Utilizá el buscador de la página principal para encontrar lo que necesites. Podés buscar por palabras clave, filtrar por categoría (searcheable) y ordenar por menor/mayor precio o condición (nuevo/usado). Una vez que encuentres lo que buscás, podés comunicarte directamente con el vendedor para coordinar el pago (efectivo, transferencia, etc.) y el punto de entrega en la localidad."
    },
    {
      category: "compradores",
      question: "¿Cómo se coordinan las entregas y los pagos de forma segura?",
      answer: "Como CompraVentaOnline funciona como un catálogo de clasificados interactivo regional, el pago y la entrega se acuerdan directamente entre vos y el vendedor. Recomendamos siempre encontrarse en lugares públicos y concurridos (como plazas, centros comerciales o locales físicos de los comercios registrados) para realizar la transacción de forma 100% segura."
    },
    {
      category: "general",
      question: "¿Qué tipo de productos están prohibidos publicar?",
      answer: "Para mantener una comunidad segura y legal en la provincia, está prohibido publicar: medicamentos de venta bajo receta, pirotecnia, armas o artículos de defensa personal, animales, productos robados, copias ilegales de software o películas, y cualquier contenido ofensivo o discriminatorio. Todas las publicaciones se evalúan periódicamente."
    }
  ];

  const filteredFaqs = activeTab === "all" 
    ? faqs 
    : faqs.filter(faq => faq.category === activeTab);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) return;
    setSubmitted(true);
    setContactName("");
    setContactEmail("");
    setContactMessage("");
    setTimeout(() => {
      setSubmitted(false);
    }, 4000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col gap-10">
      
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
        <span className="text-5xl">🌾</span>
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
                    ? "bg-accent-blue text-background shadow-md" 
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

              <button 
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-sm font-extrabold text-background shadow-md hover:opacity-95 transition-all mt-2 cursor-pointer"
              >
                Enviar Consulta
              </button>
            </form>
          )}

          <div className="border-t border-card-border/50 pt-4 flex flex-col gap-1.5 text-xs text-text-muted leading-relaxed">
            <p>📍 Santa Rosa, La Pampa, Argentina</p>
            <p>✉️ soporte@compraventaonline.com.ar</p>
          </div>
        </div>

      </div>
    </div>
  );
}
