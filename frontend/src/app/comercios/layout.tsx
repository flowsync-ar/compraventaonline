import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Comercios — publicá en CompraVentaOnline",
  description:
    "Sumá tu comercio de La Pampa a CompraVentaOnline y publicá tus productos en el marketplace pampeano.",
}

export default function ComerciosLayout({ children }: { children: React.ReactNode }) {
  return children
}
