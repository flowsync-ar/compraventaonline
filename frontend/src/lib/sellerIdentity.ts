export function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "")
}

export const IDENTITY_CONFLICT_CONTACT =
  "Si creés que es un error (por ejemplo, alguien cargó mal tu documento), escribinos desde Ayuda y lo revisamos."

export function identityConflictMessage(documentTaken: boolean, phoneTaken: boolean): string | null {
  const detail = documentTaken && phoneTaken
    ? "Ya existe un DNI y un número de teléfono registrados en nuestra base de datos."
    : documentTaken
      ? "Ya existe un DNI/CUIT registrado en nuestra base de datos."
      : phoneTaken
        ? "Ya existe un número de teléfono registrado en nuestra base de datos."
        : null
  if (!detail) return null
  return `${detail} ${IDENTITY_CONFLICT_CONTACT}`
}

export function isIdentityConflictError(message: string): boolean {
  return message.includes("registrados en nuestra base de datos") || message.includes("registrado en nuestra base de datos")
}
