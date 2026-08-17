export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="text-center mb-10">
        <span className="text-4xl">🔒</span>
        <h1 className="font-heading text-3xl font-extrabold text-foreground mt-4">
          Política de Privacidad
        </h1>
        <p className="text-text-muted text-sm mt-2">
          Tu privacidad es importante para nosotros. Leé cómo usamos tu información.
        </p>
      </div>

      <div className="flex flex-col gap-6">

        <section className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
            1. Información que recopilamos
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-text-muted leading-relaxed list-none">
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Datos de registro: nombre, email, tipo de vendedor y documento (DNI/CUIT).</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Información de publicaciones: fotos, descripciones, precios y categorías de los productos que publicás.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Datos de uso: páginas visitadas, búsquedas realizadas y favoritos guardados.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Comunicaciones: preguntas y respuestas entre compradores y vendedores dentro de la plataforma.</li>
          </ul>
        </section>

        <section className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
            2. Cómo usamos tu información
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-text-muted leading-relaxed list-none">
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Para operar y mejorar la plataforma.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Para conectar compradores y vendedores dentro de La Pampa.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Para enviarte notificaciones relacionadas con tu cuenta y publicaciones.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Para detectar y prevenir fraudes o actividades prohibidas.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Nunca vendemos tu información personal a terceros.</li>
          </ul>
        </section>

        <section className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
            3. Almacenamiento y seguridad
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-text-muted leading-relaxed list-none">
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Tus datos se almacenan de forma segura usando Supabase con cifrado en tránsito y en reposo.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Las contraseñas nunca se almacenan en texto plano.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Las imágenes de productos se almacenan en servidores seguros con acceso controlado.</li>
          </ul>
        </section>

        <section className="rounded-2xl glass-panel p-6 flex flex-col gap-4">
          <h2 className="font-heading text-base font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
            4. Tus derechos
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-text-muted leading-relaxed list-none">
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Podés solicitar acceso, rectificación o eliminación de tus datos en cualquier momento.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Podés eliminar tu cuenta desde el panel de usuario.</li>
            <li className="flex gap-2"><span className="text-accent-gold shrink-0">→</span> Para cualquier consulta escribinos a <a href="mailto:contacto@compraventaonline.com.ar" className="text-accent-gold hover:underline">contacto@compraventaonline.com.ar</a></li>
          </ul>
        </section>

        <p className="text-center text-xs text-text-muted mt-4">
          Última actualización: julio 2026 · Ley 25.326 de Protección de Datos Personales (Argentina)
        </p>

      </div>
    </div>
  )
}
