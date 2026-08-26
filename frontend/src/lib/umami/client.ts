import "server-only"

const UMAMI_API_BASE = "https://api.umami.is/v1"

// Same website-id embedded in the tracking <Script> tag in layout.tsx —
// it's not a secret (it's already public in every page's HTML), so no
// need for its own env var. UMAMI_API_KEY is the only real secret here.
const WEBSITE_ID = "f7038b2c-d579-41cc-9a2f-7fad22cde88d"

export interface UmamiStats {
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
}

export interface UmamiMetric {
  x: string
  y: number
}

function authHeaders() {
  const apiKey = process.env.UMAMI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("Umami no está configurado en el servidor (falta UMAMI_API_KEY)")
  }
  return { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
}

async function umamiFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${UMAMI_API_BASE}/websites/${WEBSITE_ID}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[umami] request failed", res.status, text)
    throw new Error(`Umami rechazó la solicitud (HTTP ${res.status})`)
  }
  return res.json()
}

export async function getWebsiteStats(startAt: number, endAt: number): Promise<UmamiStats> {
  return umamiFetch<UmamiStats>("/stats", { startAt: String(startAt), endAt: String(endAt) })
}

export async function getWebsiteMetric(
  type: "path" | "referrer" | "browser" | "device" | "country",
  startAt: number,
  endAt: number,
  limit = 10
): Promise<UmamiMetric[]> {
  return umamiFetch<UmamiMetric[]>("/metrics", {
    startAt: String(startAt),
    endAt: String(endAt),
    type,
    limit: String(limit),
  })
}
