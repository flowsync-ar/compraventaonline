export const MAX_LISTING_IMAGES = 10
export const MIN_LISTING_IMAGE_PX = 400

export function remainingListingImageSlots(currentCount: number): number {
  return Math.max(0, MAX_LISTING_IMAGES - currentCount)
}

export function capListingImages<T>(images: T[]): T[] {
  return images.slice(0, MAX_LISTING_IMAGES)
}

export function listingImagesLimitMessage(extra?: { taking?: number }): string {
  if (extra?.taking != null && extra.taking > 0) {
    return `Máximo ${MAX_LISTING_IMAGES} fotos por publicación. Se van a cargar ${extra.taking}.`
  }
  return `Máximo ${MAX_LISTING_IMAGES} fotos por publicación.`
}

export function listingImageTooSmallMessage(rejected: number, accepted: number): string {
  if (accepted === 0) {
    return `Cada foto debe medir al menos ${MIN_LISTING_IMAGE_PX}×${MIN_LISTING_IMAGE_PX} píxeles. Las miniaturas se ven pixeladas.`
  }
  return `${rejected} ${rejected === 1 ? "foto no se cargó" : "fotos no se cargaron"} porque miden menos de ${MIN_LISTING_IMAGE_PX}×${MIN_LISTING_IMAGE_PX} píxeles.`
}

async function getImagePixelSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

export async function prepareListingImageFiles(
  files: File[] | FileList,
  currentCount: number,
): Promise<{ accepted: File[]; message: string | null }> {
  const slots = remainingListingImageSlots(currentCount)
  if (slots === 0) {
    return { accepted: [], message: listingImagesLimitMessage() }
  }

  const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"))
  if (incoming.length === 0) {
    return { accepted: [], message: null }
  }

  const largeEnough: File[] = []
  let rejectedSmall = 0
  for (const file of incoming) {
    const size = await getImagePixelSize(file)
    if (!size || size.width < MIN_LISTING_IMAGE_PX || size.height < MIN_LISTING_IMAGE_PX) {
      rejectedSmall++
      continue
    }
    largeEnough.push(file)
  }

  const accepted = largeEnough.slice(0, slots)
  const parts: string[] = []
  if (largeEnough.length > slots) {
    parts.push(listingImagesLimitMessage({ taking: accepted.length }))
  }
  if (rejectedSmall > 0) {
    parts.push(listingImageTooSmallMessage(rejectedSmall, accepted.length))
  }
  return { accepted, message: parts.length > 0 ? parts.join(" ") : null }
}
