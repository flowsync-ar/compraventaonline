type UmamiWindow = Window & { umami?: { track: (event: string, data?: Record<string, string | number | boolean>) => void } }

export function trackEvent(name: string, data?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return
  try {
    ;(window as UmamiWindow).umami?.track(name, data)
  } catch {
    // analytics must never break the product flow
  }
}
