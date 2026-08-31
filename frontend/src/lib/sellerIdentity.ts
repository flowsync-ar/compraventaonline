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

export type IdentityFieldErrors = {
  document?: boolean
  phone?: boolean
}

export function identityConflictPayload(documentTaken: boolean, phoneTaken: boolean): {
  error: string
  fields: IdentityFieldErrors
} | null {
  const error = identityConflictMessage(documentTaken, phoneTaken)
  if (!error) return null
  return {
    error,
    fields: {
      document: documentTaken || undefined,
      phone: phoneTaken || undefined,
    },
  }
}

export const fieldErrorClass =
  "w-full bg-background border border-red-500 rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-red-500"
export const fieldNormalClass =
  "w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"

export function fieldsFromErrorPayload(data: { error?: string; fields?: IdentityFieldErrors }): IdentityFieldErrors {
  if (data.fields) return data.fields
  const msg = data.error ?? ""
  const taken = /registrad/i.test(msg)
  return {
    document: taken && /DNI|CUIT|documento/i.test(msg),
    phone: taken && /tel[eé]fono/i.test(msg),
  }
}
