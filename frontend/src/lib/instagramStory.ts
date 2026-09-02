import { readFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

// Instagram story / destacada: 9:16
export const STORY_W = 1080
export const STORY_H = 1920

// Slot where the listing cover sits. If you drop a custom frame at
// public/instagram-destacada.png, tweak these to match the hole.
export const PHOTO_SLOT = {
  left: 90,
  top: 400,
  width: 900,
  height: 1020,
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

function frameSvg(title: string, priceLabel: string): string {
  const t = escapeXml(truncate(title, 42))
  const p = escapeXml(priceLabel)
  const { left, top, width, height } = PHOTO_SLOT
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${STORY_W}" height="${STORY_H}" viewBox="0 0 ${STORY_W} ${STORY_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0B1C33"/>
      <stop offset="100%" stop-color="#122A4A"/>
    </linearGradient>
  </defs>
  <path fill="url(#bg)" fill-rule="evenodd"
    d="M0 0h${STORY_W}v${STORY_H}H0z M${left} ${top}h${width}v${height}H${left}z"/>
  <rect x="${left}" y="${top}" width="${width}" height="${height}" rx="28" fill="none" stroke="#F6843B" stroke-width="6"/>
  <text x="540" y="160" text-anchor="middle" fill="#187cff" font-size="42" font-family="Arial, Helvetica, sans-serif" font-weight="800">CompraVenta</text>
  <text x="540" y="210" text-anchor="middle" fill="#F6843B" font-size="42" font-family="Arial, Helvetica, sans-serif" font-weight="800">Online</text>
  <text x="540" y="270" text-anchor="middle" fill="#F6843B" font-size="28" font-family="Georgia, serif" font-weight="700">100% Pampeano</text>
  <text x="540" y="340" text-anchor="middle" fill="#FFFFFF" font-size="22" font-family="Arial, Helvetica, sans-serif" font-weight="700" letter-spacing="4">DESTACADA</text>
  <text x="540" y="1520" text-anchor="middle" fill="#FFFFFF" font-size="36" font-family="Arial, Helvetica, sans-serif" font-weight="800">${t}</text>
  <text x="540" y="1580" text-anchor="middle" fill="#F6843B" font-size="40" font-family="Arial, Helvetica, sans-serif" font-weight="800">${p}</text>
  <text x="540" y="1750" text-anchor="middle" fill="#FFFFFF" font-size="26" font-family="Arial, Helvetica, sans-serif" font-weight="700">Tocá el sticker para ver el aviso</text>
  <text x="540" y="1800" text-anchor="middle" fill="#9BB4D0" font-size="20" font-family="Arial, Helvetica, sans-serif">compraventaonline.com.ar</text>
</svg>`
}

async function loadCover(coverImageUrl: string): Promise<Buffer> {
  if (coverImageUrl.startsWith("data:")) {
    const base64 = coverImageUrl.split(",")[1] ?? ""
    return Buffer.from(base64, "base64")
  }
  const res = await fetch(coverImageUrl)
  if (!res.ok) throw new Error(`No se pudo descargar la portada (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

export async function composeInstagramDestacada(params: {
  coverImageUrl: string
  title: string
  priceLabel: string
}): Promise<Buffer> {
  const cover = await loadCover(params.coverImageUrl)
  const photo = await sharp(cover)
    .rotate()
    .resize(PHOTO_SLOT.width, PHOTO_SLOT.height, { fit: "cover", position: "centre" })
    .toBuffer()

  const customPath = path.join(process.cwd(), "public", "instagram-destacada.png")
  let frame: Buffer
  try {
    frame = await readFile(customPath)
  } catch {
    frame = await sharp(Buffer.from(frameSvg(params.title, params.priceLabel))).png().toBuffer()
  }

  const frameMeta = await sharp(frame).metadata()
  const canvas = sharp({
    create: {
      width: frameMeta.width ?? STORY_W,
      height: frameMeta.height ?? STORY_H,
      channels: 4,
      background: { r: 11, g: 28, b: 51, alpha: 1 },
    },
  })

  return canvas
    .composite([
      { input: photo, left: PHOTO_SLOT.left, top: PHOTO_SLOT.top },
      { input: await sharp(frame).resize(frameMeta.width ?? STORY_W, frameMeta.height ?? STORY_H).toBuffer(), left: 0, top: 0 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer()
}
