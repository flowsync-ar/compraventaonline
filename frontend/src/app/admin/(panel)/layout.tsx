import type { ReactNode } from "react"
import AdminShell from "./AdminShell"

// The proxy already validated the admin session for every route under
// /admin (except /admin/login, which renders its own minimal layout).
// SiteChrome (root layout) hides the public marketplace header/footer for
// every /admin route, so this is the entire chrome for the panel.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
