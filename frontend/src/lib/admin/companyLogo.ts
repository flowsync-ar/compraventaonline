import type { createAdminClient } from "@/lib/supabase/admin"

type Admin = ReturnType<typeof createAdminClient>

export async function saveCompanyLogo(
  admin: Admin,
  params: { userId: string; sellerId: string; file: File },
): Promise<string> {
  const ext = params.file.name.split(".").pop()?.replace(/[^\w]+/g, "") || "png"
  const path = `${params.userId}/logo.${ext}`
  const { error: uploadError } = await admin.storage.from("avatars").upload(path, params.file, {
    upsert: true,
    contentType: params.file.type || "image/png",
    cacheControl: "3600",
  })
  if (uploadError) {
    throw new Error(uploadError.message)
  }
  const { data: urlData } = admin.storage.from("avatars").getPublicUrl(path)
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`
  const { error: updateError } = await admin.from("sellers").update({ avatar_url: avatarUrl }).eq("id", params.sellerId)
  if (updateError) {
    throw new Error(updateError.message)
  }
  return avatarUrl
}
