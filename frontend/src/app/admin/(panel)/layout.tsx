import type { ReactNode } from "react"
import Link from "next/link"
import AdminSidebar from "./AdminSidebar"

// The proxy already validated the admin session for every route under
// /admin (except /admin/login, which renders its own minimal layout).
// SiteChrome (root layout) hides the public marketplace header/footer for
// every /admin route, so this is the entire chrome for the panel.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8 overflow-y-auto">
        <div className="flex justify-end mb-4">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-card-border bg-card-bg px-3 py-1.5 text-sm font-bold text-text-muted hover:text-foreground hover:border-accent-gold/40 transition-all"
          >
            Ver sitio
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
            </svg>
          </Link>
        </div>
        {children}
      </main>
    </div>
  )
}
