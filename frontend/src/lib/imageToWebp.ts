// Every image upload in the app (product photos, avatars, hero carousel)
// runs through this before hitting Supabase Storage — WebP is meaningfully
// smaller than JPEG/PNG at the same visual quality, and it's what actually
// controls page weight since these uploads are shown at full size all over
// the public site (listing cards, carousel, profile).
//
// Runs client-side (Canvas), not server-side: most upload call sites go
// straight from the browser to Supabase Storage with no API route in
// between to run sharp on, so this is the one place that's actually in
// every path.
export async function imageToWebp(file: File, quality = 0.85): Promise<File> {
  // Already WebP: nothing to do. GIF: skipped on purpose — canvas only
  // captures a single frame, which would silently kill animation.
  if (file.type === "image/webp" || file.type === "image/gif" || !file.type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
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

export async function imagesToWebp(files: File[], quality = 0.85): Promise<File[]> {
  return Promise.all(files.map((file) => imageToWebp(file, quality)));
}
