"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LA_PAMPA_CITIES } from "@/lib/constants/laPampaCities";
import CustomDropdown from "./CustomDropdown";

const DROPDOWN_TRIGGER_CLASSNAME =
  "w-full bg-transparent text-sm font-semibold text-foreground text-left outline-none cursor-pointer select-none flex items-center justify-between gap-1";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

// Lives in the header (SiteChrome, a client component rendered on every
// page) rather than being passed categories as a prop from each page's own
// server-side fetch — self-fetching here is what lets one instance work
// everywhere without every page needing to know about it.
export default function HomeSearchBar() {
  return (
    <Suspense fallback={<div className="h-[46px] w-full rounded-2xl sm:rounded-full bg-card-bg/40" />}>
      <HomeSearchBarForm />
    </Suspense>
  );
}

function HomeSearchBarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("categories")
      .select("id, name, slug, parent_id")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("[HomeSearchBar] Error fetching categories:", error.message);
          return;
        }
        setCategories(data ?? []);
      });
  }, []);

  const rootOptions = useMemo(
    () => [
      { name: "Todas las categorías", value: "" },
      ...categories.filter((c) => !c.parent_id).map((c) => ({ name: c.name, value: c.slug })),
    ],
    [categories]
  );

  const categorySearchOptions = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    return categories.map((c) => {
      const parents: string[] = [];
      let current = c.parent_id ? byId.get(c.parent_id) : undefined;
      const seen = new Set<string>();
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        parents.unshift(current.name);
        current = current.parent_id ? byId.get(current.parent_id) : undefined;
      }
      return {
        name: c.name,
        value: c.slug,
        groupLabel: parents.length > 0 ? parents.join(" › ") : undefined,
      };
    });
  }, [categories]);

  const searchHref = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (location) params.set("location", location);
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(searchHref());
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch rounded-full bg-card-bg-solid border border-card-border shadow-md"
      >
        {/* Texto libre */}
        <div className="flex items-center gap-2 flex-1 sm:min-w-36 sm:basis-64 px-4 py-2.5 sm:py-2">
          <button
            type="submit"
            aria-label="Buscar en todo el sitio"
            className="shrink-0 text-text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué estás buscando?"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-text-muted outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 text-text-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="hidden sm:block w-px bg-card-border my-2.5" />

        {/* Categoría — desktop/tablet. En mobile la home es solo el texto;
            categoría y ciudad se eligen en /search. */}
        <div className="hidden sm:flex items-center gap-2 sm:w-60 min-w-28 px-4 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent-blue">
            <path d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <CustomDropdown
            name="category"
            defaultValue={category}
            onChange={setCategory}
            showSearch
            placeholder="Buscar categoría..."
            triggerClassName={DROPDOWN_TRIGGER_CLASSNAME}
            panelWidthClassName="w-max min-w-full max-w-xs"
            options={rootOptions}
            searchOptions={categorySearchOptions}
          />
        </div>

        <div className="hidden sm:block w-px bg-card-border my-2.5" />

        {/* Ubicación */}
        <div className="hidden sm:flex items-center gap-2 sm:w-60 min-w-28 px-4 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-muted">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <CustomDropdown
            name="location"
            defaultValue={location}
            onChange={setLocation}
            showSearch
            placeholder="Buscar ciudad..."
            triggerClassName={DROPDOWN_TRIGGER_CLASSNAME}
            panelWidthClassName="w-max min-w-full max-w-xs"
            options={[
              { name: "Toda La Pampa", value: "" },
              ...LA_PAMPA_CITIES.map((city) => ({ name: city, value: city })),
            ]}
          />
        </div>

        <button
          type="submit"
          className="hidden sm:flex items-center justify-center gap-2 rounded-bl-none rounded-tr-full rounded-br-full bg-gradient-to-r from-accent-gold to-accent-gold-hover px-5 py-2 text-sm font-extrabold text-white hover:opacity-95 transition-all cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Buscar
        </button>
      </form>
    </div>
  );
}
