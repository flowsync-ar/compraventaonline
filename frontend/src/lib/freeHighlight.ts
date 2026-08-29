const FREE_HIGHLIGHT_EMAILS = new Set([
  "ramirotule@gmail.com",
  "raminformatik@gmail.com",
]);

export function canFeatureForFree(email: string | null | undefined): boolean {
  if (!email) return false;
  return FREE_HIGHLIGHT_EMAILS.has(email.trim().toLowerCase());
}
