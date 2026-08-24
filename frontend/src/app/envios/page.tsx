"use client";

import { useState } from "react";
import CustomDropdown from "@/components/CustomDropdown";

export default function ShippingPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [vehicle, setVehicle] = useState("moto");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || !city || !message) return;

    setLoading(true);

    // Simular envío de solicitud con animación premium
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setName("");
      setPhone("");
      setEmail("");
      setCity("");
      setVehicle("moto");
      setMessage("");
      
      // Auto-resetear estado de éxito después de unos segundos
      setTimeout(() => {
        setSubmitted(false);
      }, 6000);
    }, 1200);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col gap-12">
      
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-5xl animate-bounce duration-1000">🚚</span>
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground mt-2">
          Envíos & Logística de Cercanía
        </h1>
        <p className="text-text-muted text-base leading-relaxed">
          Facilitamos la entrega de tus productos de forma directa en La Pampa. Si brindás servicios de mensajería o cadetería local, te invitamos a sumarte a nuestra red oficial.
        </p>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* Card: Compradores y Vendedores */}
        <div className="rounded-2xl border border-card-border bg-card-bg-solid p-6 md:p-8 shadow-lg flex flex-col gap-5 hover:border-accent-gold/45 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-gold/10 text-accent-gold text-2xl font-bold">
            🤝
          </div>
          <div>
            <h3 className="font-heading text-lg font-extrabold text-foreground">
              Para Compradores y Vendedores
            </h3>
            <p className="text-text-muted text-sm mt-2 leading-relaxed">
              Como plataforma de clasificados pampeana, no obligamos al uso de una sola empresa logística. Fomentamos el trato de cercanía y libre acuerdo:
            </p>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-text-muted mt-2">
            <li className="flex gap-2">
              <span className="text-accent-gold font-bold">✓</span>
              <span><strong>Puntos de encuentro seguros:</strong> Coordiná el retiro o entrega en plazas centrales, paseos públicos o locales físicos de comercios locales.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent-gold font-bold">✓</span>
              <span><strong>Independencia total:</strong> Elegí pagar en efectivo o transferencia al recibir tu producto, disminuyendo comisiones intermediarias.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent-gold font-bold">✓</span>
              <span><strong>Cadeterías independientes:</strong> Podés solicitar el envío a tu domicilio contratando servicios de mensajería de tu propia localidad de forma directa.</span>
            </li>
          </ul>
        </div>

        {/* Card: Proveedores de Delivery / Cadetes */}
        <div className="rounded-2xl border border-card-border bg-card-bg-solid p-6 md:p-8 shadow-lg flex flex-col gap-5 border-l-4 border-l-accent-gold hover:border-accent-gold/45 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-green/10 text-accent-green text-2xl font-bold">
            🛵
          </div>
          <div>
            <h3 className="font-heading text-lg font-extrabold text-foreground">
              ¿Tenés un servicio de Delivery o Cadetería?
            </h3>
            <p className="text-text-muted text-sm mt-2 leading-relaxed">
              Queremos invitar a todas las personas y agencias que cuenten con servicios de distribución (ya sea moto-envíos, autos, fletes, cadetería en bicicleta o cualquier otro medio de transporte en La Pampa) a contactarse con nosotros.
            </p>
          </div>
          <div className="bg-accent-gold/5 rounded-xl p-4 border border-accent-gold/15 text-sm text-text-muted leading-relaxed">
            <p className="font-bold text-foreground mb-1">🤝 Un plan conveniente para todos</p>
            Te ofrecemos sumarte a nuestra red de logística recomendada para coordinar envíos de forma eficiente. Diseñamos planes que resultan sumamente beneficiosos tanto para el cliente final (que desea recibir su compra rápido en su domicilio) como para el cadete o repartidor (quien accede a una corriente constante de entregas y ganancias justas).
          </div>
        </div>

      </div>

      {/* Contact Partner Form */}
      <div id="registro-partner" className="rounded-2xl border border-card-border bg-card-bg-solid p-6 md:p-10 shadow-xl max-w-3xl mx-auto w-full">
        <div className="text-center flex flex-col gap-2 mb-8">
          <h3 className="font-heading text-xl font-extrabold text-foreground">
            Sumá tu Servicio de Cadetería / Delivery
          </h3>
          <p className="text-text-muted text-sm max-w-xl mx-auto leading-relaxed">
            Completá el formulario para registrar tu servicio y nuestro equipo se contactará a la brevedad para ofrecerte la integración de envíos locales.
          </p>
        </div>

        {submitted ? (
          <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-xl p-6 text-sm text-center flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-extrabold text-base mb-1">¡Solicitud de Partner Recibida con éxito!</p>
              <p className="text-text-muted max-w-md mx-auto leading-relaxed">
                Gracias por ponerte en contacto. Analizaremos los datos de cobertura de tu servicio y te contactaremos por WhatsApp o correo electrónico para coordinar un plan conveniente para todos.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Nombre o Razón Social</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. MotoMensajería Santa Rosa" 
                  className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">WhatsApp / Teléfono de Contacto</label>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 2954-123456" 
                  className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Correo Electrónico</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@correo.com" 
                  className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-foreground">Localidad / Zona de Cobertura</label>
                <input 
                  type="text" 
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej. Santa Rosa, General Pico, Toay" 
                  className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground">Medio de Transporte Principal</label>
              <CustomDropdown
                name="vehicle"
                defaultValue={vehicle}
                onChange={setVehicle}
                options={[
                  { name: "Motocicleta / Scooter", value: "moto" },
                  { name: "Automóvil / Utilitario", value: "auto" },
                  { name: "Flete / Camioneta de Carga", value: "flete" },
                  { name: "Bicicleta", value: "bici" },
                  { name: "Múltiples vehículos / Otro servicio", value: "otro" },
                ]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground">Contanos sobre tu servicio de delivery</label>
              <textarea 
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Detallá tus horarios, zonas específicas, cantidad de repartidores, tarifas promedio de cadetería o cualquier información útil..." 
                className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent-gold resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-sm font-extrabold text-white shadow-md hover:opacity-95 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando solicitud...
                </>
              ) : (
                "Enviar Solicitud de Partner"
              )}
            </button>

          </form>
        )}

        <div className="border-t border-card-border/50 pt-4 mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-muted justify-center">
          <p>🚚 CompraVentaOnline Red Logística Local</p>
          <p>✉️ logistica@compraventaonline.com.ar</p>
        </div>
      </div>

    </div>
  );
}
