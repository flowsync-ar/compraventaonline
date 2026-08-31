// Argentine document display:
// - DNI (up to 8 digits): 28.660.386
// - CUIL / CUIT (11 digits): 20-28660386-8
export function formatDocumentNumber(
  value: string,
  kind: "PERSONAL_SELLER" | "BUSINESS_SELLER" = "PERSONAL_SELLER",
): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)

  if (kind === "BUSINESS_SELLER" || digits.length > 8) {
    if (digits.length <= 2) return digits
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function documentNumberPlaceholder(
  kind: "PERSONAL_SELLER" | "BUSINESS_SELLER",
): string {
  return kind === "PERSONAL_SELLER" ? "Ej. 28.660.386" : "Ej. 30-71112223-9"
}
