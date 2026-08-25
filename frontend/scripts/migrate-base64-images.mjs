// One-off repair script — NOT part of the app's runtime code.
//
// Fixes the 33 (of 48) products whose `images` column has raw base64 data
// URIs embedded directly in the database instead of real Storage URLs —
// the fallback that used to fire on every Storage upload failure before
// the "listings" bucket + RLS policies existed (see
// supabase/migrations/043_listings_storage_bucket.sql). Decodes each
// base64 entry, resizes/re-encodes it through sharp (same 1600px/webp
// pipeline the browser upload path now uses), uploads it to the
// now-working bucket, and replaces the array entry with the real public
// URL.
//
// Run migration 043 FIRST (the bucket must exist). This script uses the
// service-role key, so it bypasses storage RLS entirely — the bucket
// existing is the only real prerequisite.
//
// Usage:
//   node --env-file=.env.local scripts/migrate-base64-images.mjs --dry-run   (preview only, no writes)
//   node --env-file=.env.local scripts/migrate-base64-images.mjs            (actually migrates)

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const DRY_RUN = process.argv.includes("--dry-run");
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  console.error("Run with: node --env-file=.env.local scripts/migrate-base64-images.mjs");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function migrateImage(productId, index, dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    console.warn(`  [${productId}] image #${index}: not a recognizable data URL, leaving as-is`);
    return dataUrl;
  }

  const resized = await sharp(parsed.buffer)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const path = `migrated/${productId}/${index}-${Date.now()}.webp`;

  console.log(
    `  [${productId}] image #${index}: ${(parsed.buffer.length / 1024).toFixed(0)}KB base64 -> ${(resized.length / 1024).toFixed(0)}KB webp`
  );

  if (DRY_RUN) return dataUrl; // preview only, don't actually upload/replace

  const { error: uploadError } = await supabase.storage
    .from("listings")
    .upload(path, resized, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });

  if (uploadError) {
    console.error(`  [${productId}] image #${index}: upload failed — ${uploadError.message}`);
    return dataUrl; // keep the base64 as a fallback rather than lose the image
  }

  const { data: urlData } = supabase.storage.from("listings").getPublicUrl(path);
  return urlData.publicUrl;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN — no writes will happen ===\n" : "=== Migrating base64 images to Storage ===\n");

  const { data: products, error } = await supabase.from("products").select("id, name, images");
  if (error) {
    console.error("Could not fetch products:", error.message);
    process.exit(1);
  }

  const affected = (products ?? []).filter((p) => (p.images ?? []).some((img) => img.startsWith("data:")));
  console.log(`Found ${affected.length} product(s) with base64 images.\n`);

  let fixedProducts = 0;
  let fixedImages = 0;
  let failedImages = 0;

  for (const product of affected) {
    console.log(`Product "${product.name}" (${product.id}):`);
    const newImages = [];
    for (let i = 0; i < product.images.length; i++) {
      const img = product.images[i];
      if (!img.startsWith("data:")) {
        newImages.push(img);
        continue;
      }
      const result = await migrateImage(product.id, i, img);
      if (result.startsWith("data:")) {
        failedImages++;
      } else {
        fixedImages++;
      }
      newImages.push(result);
    }

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ images: newImages })
        .eq("id", product.id);
      if (updateError) {
        console.error(`  Could not update product row: ${updateError.message}`);
        continue;
      }
    }
    fixedProducts++;
    console.log("");
  }

  console.log("=== Done ===");
  console.log(`Products processed: ${fixedProducts}/${affected.length}`);
  console.log(`Images migrated: ${fixedImages}`);
  if (failedImages > 0) console.log(`Images that FAILED and are still base64: ${failedImages} — check the upload errors above.`);
  if (DRY_RUN) console.log("\nThis was a dry run — nothing was written. Re-run without --dry-run to apply.");
}

main();
