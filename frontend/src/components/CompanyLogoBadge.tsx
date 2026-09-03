export default function CompanyLogoBadge({
  src,
  name,
  size = "md",
}: {
  src: string | null | undefined
  name: string
  size?: "sm" | "md"
}) {
  if (!src) return null
  const box = size === "sm" ? "h-10 w-10" : "h-14 w-14 sm:h-16 sm:w-16"
  return (
    <div
      className={`pointer-events-none absolute top-3 left-3 z-20 ${box} rounded-xl overflow-hidden bg-white border border-white shadow-md p-1`}
      title={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="h-full w-full object-contain" />
    </div>
  )
}

export function instagramHref(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  const handle = value.replace(/^@/, "")
  return `https://www.instagram.com/${handle}`
}

export function websiteHref(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}
