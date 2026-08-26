"use client";

import { useEffect, useState } from "react";

interface Props {
  children: React.ReactNode;
}

// Same <details>/<summary> accordion as before, but now starts CLOSED on
// mobile AND tablet (<lg) — only auto-opens at the lg breakpoint, matching
// the lg:pointer-events-none on the summary that blocks closing it there.
// Browsers won't let CSS force-show a closed <details>'s content (confirmed
// empirically — display:flex computes but still doesn't paint), so the
// open/closed state has to be real client state instead of a CSS trick.
export default function FiltersAccordion({ children }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const sync = () => setOpen(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  return (
    <details className="group" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      {children}
    </details>
  );
}
