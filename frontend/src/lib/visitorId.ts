// A long-lived, anonymous, random id used ONLY to dedup listing view counts
// for visitors who aren't logged in (see the listing_views migration). It
// identifies a browser, not a person — it's never tied to an account and
// carries no personal data.
const COOKIE_NAME = "cvo_vid";
const MAX_AGE_DAYS = 400; // browsers cap cookie Max-Age at 400 days anyway

export function getOrCreateVisitorId(): string {
  if (typeof document === "undefined") return "";

  const existing = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];

  if (existing) return existing;

  const id = crypto.randomUUID();
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${MAX_AGE_DAYS * 86400}; SameSite=Lax`;
  return id;
}
