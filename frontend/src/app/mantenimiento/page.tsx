import ThemedImage from "@/components/ThemedImage"

export const metadata = {
  title: "Sitio en mantenimiento — CompraVentaOnline",
}

// Standalone page — SiteChrome hides the marketplace header/footer here
// (same treatment as /admin). proxy.ts redirects every other public route
// to this one while platform_settings.maintenance_mode is true.
export default function MantenimientoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-5 rounded-3xl glass-panel p-10">
        <ThemedImage
          lightSrc="/logo-cvo.png"
          darkSrc="/logo-cvo.png"
          alt="CompraVentaOnline"
          className="h-16 w-auto object-contain"
        />

        <span className="text-4xl">🛠️</span>

        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Estamos mejorando la plataforma
        </h1>

        <p className="text-sm text-text-muted leading-relaxed">
          CompraVentaOnline está en mantenimiento por unos momentos. Ya volvemos —
          gracias por la paciencia.
        </p>
      </div>
    </div>
  )
}
