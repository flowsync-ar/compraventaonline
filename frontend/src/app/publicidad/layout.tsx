import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Publicidad — anunciá en CompraVentaOnline",
  description:
    "Anunciá tu marca o comercio en CompraVentaOnline y llegá a compradores de toda La Pampa.",
}

export default function PublicidadLayout({ children }: { children: React.ReactNode }) {
  return children
}
