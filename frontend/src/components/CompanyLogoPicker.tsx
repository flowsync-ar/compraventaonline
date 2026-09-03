"use client"

export default function CompanyLogoPicker({
  previewUrl,
  fileName,
  onFile,
  uploading = false,
}: {
  previewUrl: string | null
  fileName?: string | null
  onFile: (file: File) => void
  uploading?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Logo de la empresa</span>
      <label className="group flex items-center gap-4 rounded-2xl border border-dashed border-card-border bg-background/60 px-4 py-3 cursor-pointer transition-colors hover:border-accent-gold hover:bg-accent-gold/5">
        <div className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-white border border-card-border shadow-sm">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Logo" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="flex h-full items-center justify-center text-2xl text-text-muted/60">🏢</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-xl bg-accent-gold px-3 py-1.5 text-[11px] font-extrabold text-background group-hover:brightness-105">
            {uploading ? "Subiendo…" : previewUrl ? "Cambiar logo" : "Elegir logo"}
          </span>
          <p className="text-[11px] text-text-muted mt-1.5 truncate">
            {fileName || "PNG, JPG o WebP. Se muestra en la esquina de cada aviso."}
          </p>
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={uploading}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ""
          }}
        />
      </label>
    </div>
  )
}
