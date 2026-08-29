// Every image upload in the app (product photos, avatars, hero carousel)
// runs through this before hitting Supabase Storage — WebP is meaningfully
// smaller than JPEG/PNG at the same visual quality, and downscaling to a
// sane max dimension is what actually controls page weight: a photo
// straight off a phone camera (4000px+ on the long side) was previously
// re-encoded to WebP but kept at FULL resolution, then served as-is in a
// 300x200 card or even a 64x64 thumbnail — the browser downloaded the
// whole file every time just to shrink it with CSS.
//
// Runs client-side (Canvas), not server-side: most upload call sites go
// straight from the browser to Supabase Storage with no API route in
// between to run sharp on, so this is the one place that's actually in
// every path.
export async function imageToWebp(
  file: File,
  quality = 0.85,
  maxDimension = 1600
): Promise<File> {
  // Already WebP: nothing to do. GIF: skipped on purpose — canvas only
  // captures a single frame, which would silently kill animation.
  if (file.type === "image/webp" || file.type === "image/gif" || !file.type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (!blob) return file;

    const webpName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], webpName, { type: "image/webp" });
  } catch (err) {
    // Corrupt file, unsupported format (e.g. HEIC in some browsers), or no
    // canvas/WebP support — never block the upload over this, just ship
    // the original file as-is.
    console.warn("[imageToWebp] conversion failed, using original file:", err);
    return file;
  }
}

/** Wide hero: same photo as a blurred cover fill, sharp and contained in the center. */
export async function imageToBlurFillBanner(
  source: Blob,
  quality = 0.85,
  targetWidth = 1920,
): Promise<File> {
  const bitmap = await createImageBitmap(source)
  const targetHeight = Math.round(
    Math.min(680, Math.max(320, bitmap.height * Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)))),
  )

  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    throw new Error("No se pudo preparar el canvas")
  }

  ctx.fillStyle = "#111111"
  ctx.fillRect(0, 0, targetWidth, targetHeight)

  const coverScale = Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height) * 1.25
  const coverW = bitmap.width * coverScale
  const coverH = bitmap.height * coverScale
  ctx.filter = "blur(36px)"
  ctx.drawImage(bitmap, (targetWidth - coverW) / 2, (targetHeight - coverH) / 2, coverW, coverH)

  const containScale = Math.min(targetWidth / bitmap.width, targetHeight / bitmap.height)
  const artW = bitmap.width * containScale
  const artH = bitmap.height * containScale
  ctx.filter = "none"
  ctx.drawImage(bitmap, (targetWidth - artW) / 2, (targetHeight - artH) / 2, artW, artH)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality))
  if (!blob) throw new Error("No se pudo generar la imagen")
  return new File([blob], "slide-blur-fill.webp", { type: "image/webp" })
}

export async function imagesToWebp(
  files: File[],
  quality = 0.85,
  maxDimension = 1600
): Promise<File[]> {
  return Promise.all(files.map((file) => imageToWebp(file, quality, maxDimension)));
}
