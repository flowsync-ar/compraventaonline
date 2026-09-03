import type { SupabaseClient } from "@supabase/supabase-js"
import { formatDocumentNumber } from "@/lib/documentNumber"
import { digitsOnly } from "@/lib/sellerIdentity"
import type { Database } from "@/lib/supabase/types"

type SellerType = Database["public"]["Enums"]["seller_type"]
type AdminClient = SupabaseClient

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))]
}

function documentVariants(value: string): string[] {
  const digits = digitsOnly(value)
  if (!digits) return []
  return unique([
    value.trim(),
    digits,
    formatDocumentNumber(digits, "PERSONAL_SELLER"),
    formatDocumentNumber(digits, "BUSINESS_SELLER"),
    digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : "",
    digits.length > 10 ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}` : "",
  ])
}

export function phoneVariants(value: string): string[] {
  const digits = digitsOnly(value)
  if (!digits) return []
  const withoutCountry = digits.startsWith("54") && digits.length > 10 ? digits.slice(2) : digits
  return unique([value.trim(), digits, withoutCountry, `0${withoutCountry}`])
}

export async function findIdentityConflicts(
  admin: AdminClient,
  params: {
    documentNumber?: string | null
    phone?: string | null
    sellerType: SellerType
    excludeUserId?: string | null
  },
): Promise<{ documentTaken: boolean; phoneTaken: boolean }> {
  const documentDigits = digitsOnly(params.documentNumber)
  const phoneDigits = digitsOnly(params.phone)

  const { data, error } = await admin.rpc("find_seller_identity_conflicts", {
    p_document_digits: documentDigits,
    p_phone_digits: phoneDigits,
    p_seller_type: params.sellerType,
    p_exclude_user_id: params.excludeUserId ?? null,
  })

  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data
    if (row) {
      return {
        documentTaken: !!row.document_taken,
        phoneTaken: !!row.phone_taken,
      }
    }
  }

  let documentTaken = false
  let phoneTaken = false

  if (documentDigits) {
    const { data: docs } = await admin
      .from("sellers")
      .select("id, user_id, type, document_number")
      .in("document_number", documentVariants(params.documentNumber ?? ""))
      .eq("type", params.sellerType)
    documentTaken = (docs ?? []).some((row) => row.user_id !== params.excludeUserId)
  }

  if (phoneDigits) {
    const { data: phones } = await admin
      .from("sellers")
      .select("id, user_id, phone")
      .in("phone", phoneVariants(params.phone ?? ""))
    phoneTaken = (phones ?? []).some((row) => row.user_id !== params.excludeUserId)
  }

  return { documentTaken, phoneTaken }
}

export async function findSellerForCompanyConversion(
  admin: AdminClient,
  params: { email: string; phone: string },
): Promise<{ id: string; user_id: string; name: string; email: string; partner: boolean } | null> {
  const email = params.email.trim().toLowerCase()
  if (email) {
    const { data: byEmail } = await admin
      .from("sellers")
      .select("id, user_id, name, email, partner")
      .eq("email", email)
      .maybeSingle()
    if (byEmail) return byEmail
  }

  const digits = digitsOnly(params.phone)
  const variants = phoneVariants(params.phone)
  if (variants.length > 0) {
    const { data: phones } = await admin
      .from("sellers")
      .select("id, user_id, name, email, partner, phone")
      .in("phone", variants)
      .limit(5)
    if (phones?.[0]) return phones[0]
  }

  const tail = digits.slice(-8)
  if (tail.length < 6) return null
  const { data: fuzzy } = await admin
    .from("sellers")
    .select("id, user_id, name, email, partner, phone")
    .ilike("phone", `%${tail}%`)
    .limit(20)
  const match = (fuzzy ?? []).find((row) => digitsOnly(row.phone) === digits || digitsOnly(row.phone).endsWith(tail))
  return match ?? null
}
