export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="text-center mb-10">
        <span className="text-4xl">📋</span>
        <h1 className="font-heading text-3xl font-extrabold text-foreground mt-4">
          Reglas de la Comunidad
        </h1>
        <p className="text-text-muted text-sm mt-2">
          Para mantener CompraVentaOnline como un espacio seguro y confiable para todos.
        </p>
      </div>

      <div className="flex flex-col gap-6">

        <section className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
            1. Publicaciones
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-text-muted leading-relaxed list-none">
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Solo podés publicar artículos o servicios que sean de tu propiedad o que estés autorizado a vender.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Las fotos y descripciones deben representar fielmente el producto real.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Está prohibido publicar artículos ilegales, robados, falsificados o peligrosos.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> No se permite la venta de medicamentos, armas, explosivos ni sustancias controladas.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> El precio publicado debe ser el precio real. No se admiten publicaciones señuelo.</li>
          </ul>
        </section>

        <section className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
            2. Comportamiento entre usuarios
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-text-muted leading-relaxed list-none">
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Tratá a todos con respeto. No se tolera el acoso, la discriminación ni el lenguaje ofensivo.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Las preguntas y respuestas deben ser honestas y relevantes al producto.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> No compartas datos personales de otros usuarios sin su consentimiento.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Está prohibido intentar cerrar operaciones fuera de la plataforma para evadir responsabilidades.</li>
          </ul>
        </section>

        <section className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
            3. Transacciones
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-text-muted leading-relaxed list-none">
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Confirmá siempre el estado del producto antes de cerrar una operación.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Preferí lugares públicos o conocidos para realizar entregas en persona.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Ante cualquier conflicto, usá el sistema de reportes de la plataforma.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> No se hacemos responsables por operaciones realizadas fuera de CompraVentaOnline.</li>
          </ul>
        </section>

        <section className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
            4. Sanciones
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-text-muted leading-relaxed list-none">
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> El incumplimiento de estas reglas puede resultar en la suspensión o eliminación de tu cuenta.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Las publicaciones que violen estas normas serán eliminadas sin previo aviso.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Nos reservamos el derecho de rechazar el registro o cancelar cuentas a nuestra discreción.</li>
          </ul>
        </section>

        <p className="text-center text-xs text-text-muted mt-4">
          Última actualización: julio 2026 · ¿Dudas?{" "}
          <a href="mailto:hola@compraventaonline.com.ar" className="text-accent-gold hover:underline">
            Contactanos
          </a>
        </p>

      </div>
    </div>
  )
}
