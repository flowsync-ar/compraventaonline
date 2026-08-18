import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import CategorySubcategoryFilter from "../../components/CategorySubcategoryFilter";
import CustomDropdown from "../../components/CustomDropdown";
import FavoriteButton from "../../components/FavoriteButton";

// Case- and accent-insensitive comparison ("guitarra" matches "Guitarra Acústica").
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type ListingRow = {
  id: string;
  price: number;
  condition: string;
  featured_plan: string;
  products: {
    name: string;
    brand: string;
    description: string;
    images: string[] | null;
    categories: { slug: string; name: string } | null;
  } | null;
  sellers: {
    name: string;
    score: number;
    tier: string;
  } | null;
};

async function searchListings(params: {
  q?: string;
  category?: string;
  subcategory?: string;
  condition?: string;
  sort?: string;
}): Promise<ListingRow[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("listings")
      .select(`
        id,
        price,
        condition,
        featured_plan,
        products (
          name,
          brand,
          description,
          images,
          categories ( slug, name )
        ),
        sellers (
          name,
          score,
          tier
        )
      `)
      .eq("status", "APPROVED");

    if (params.condition) {
      query = query.eq("condition", params.condition as "NEW" | "USED");
    }

    if (params.sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (params.sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error("[search] Error fetching listings:", error.message);
      return [];
    }
    if (!data) return [];

    let results = data as unknown as ListingRow[];

    // Client-side keyword filter — PostgREST's .or() doesn't reliably support
    // filtering across an embedded relation (products.name/brand here).
    // Case- and accent-insensitive.
    if (params.q) {
      const q = normalize(params.q);
      results = results.filter(
        (l) =>
          (l.products?.name && normalize(l.products.name).includes(q)) ||
          (l.products?.brand && normalize(l.products.brand).includes(q))
      );
    }

    // Client-side category slug filter (PostgREST nested filter has limited OR support).
    // A specific subcategory matches exactly; a root category also matches
    // listings in any of its subcategories.
    if (params.subcategory) {
      results = results.filter((l) => l.products?.categories?.slug === params.subcategory);
    } else if (params.category) {
      const validSlugs = new Set([params.category]);
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", params.category)
        .single();
      if (catRow) {
        const { data: children } = await supabase
          .from("categories")
          .select("slug")
          .eq("parent_id", catRow.id);
        children?.forEach((c) => validSlugs.add(c.slug));
      }
      results = results.filter(
        (l) => l.products?.categories?.slug && validSlugs.has(l.products.categories.slug)
      );
    }

    return results;
  } catch (err) {
    console.error("[search] Unexpected error fetching listings:", err);
    return [];
  }
}

interface SearchCategory {
  name: string;
  slug: string;
  parentSlug?: string | null;
}

async function fetchCategories(): Promise<SearchCategory[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id")
      .order("name", { ascending: true });

    if (error || !data) throw new Error();

    const slugById = new Map(data.map((cat) => [cat.id, cat.slug]));

    const flat: SearchCategory[] = [
      { name: "Todas las categorías", slug: "" },
      ...data.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        parentSlug: cat.parent_id ? slugById.get(cat.parent_id) ?? null : null,
      })),
    ];
    return flat;
  } catch {
    return [
      { name: "Todas las categorías", slug: "" },
      { name: "Tecnología", slug: "tecnologia" },
      { name: "Hogar", slug: "hogar" },
      { name: "Vehículos", slug: "vehiculos" },
      { name: "Campo / Agro", slug: "campo-agro" },
      { name: "Construcción", slug: "construccion" },
      { name: "Moda", slug: "moda" },
    ];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; subcategory?: string; condition?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const [listings, categories] = await Promise.all([
    searchListings(params),
    fetchCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full">
      <h1 className="font-heading text-3xl font-extrabold text-foreground mb-2">Buscador de Publicaciones</h1>
      <p className="text-text-muted text-sm mb-8">Filtrá entre miles de ofertas directas locales.</p>

      <div className="flex flex-col lg:flex-row gap-8">

        {/* Filters Form Panel */}
        <aside className="w-full lg:w-64 shrink-0">
          <form action="/search" method="GET" className="flex flex-col gap-6 p-6 rounded-2xl glass-panel">
            <h3 className="font-heading text-sm font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">Filtros</h3>

            {/* Input Search */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground">Palabra Clave</label>
              <input
                type="text"
                name="q"
                defaultValue={params.q || ""}
                placeholder="Ej. taladro..."
                className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent-gold"
              />
            </div>

            {/* Category / Subcategory Dropdowns */}
            <CategorySubcategoryFilter
              categories={categories}
              defaultCategory={params.category || ""}
              defaultSubcategory={params.subcategory || ""}
            />

            {/* Condition Choice */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground">Condición</label>
              <CustomDropdown
                name="condition"
                defaultValue={params.condition || ""}
                options={[
                  { name: "Cualquier estado", value: "" },
                  { name: "Nuevo", value: "NEW" },
                  { name: "Usado", value: "USED" },
                ]}
              />
            </div>

            {/* Sort Choice */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground">Ordenar Por</label>
              <CustomDropdown
                name="sort"
                defaultValue={params.sort || ""}
                options={[
                  { name: "Relevancia", value: "" },
                  { name: "Menor precio", value: "price_asc" },
                  { name: "Mayor precio", value: "price_desc" },
                ]}
              />
            </div>

            <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all mt-2">
              Aplicar Filtros
            </button>

            {(params.q || params.category || params.condition || params.sort) && (
              <Link
                href="/search"
                className="w-full text-center rounded-xl border border-card-border py-2.5 text-xs font-bold text-foreground hover:bg-card-border/50 hover:text-accent-gold transition-all"
              >
                Limpiar Filtros
              </Link>
            )}
          </form>
        </aside>

        {/* Search Results Grid */}
        <section className="flex-1">
          <div className="flex items-center justify-between border-b border-card-border pb-4 mb-6">
            <span className="text-xs font-bold text-text-muted">
              Se encontraron <span className="text-foreground">{listings.length}</span> publicaciones
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-16 rounded-2xl glass-panel">
              <span className="text-4xl">🔍</span>
              <h3 className="font-heading text-lg font-bold text-foreground mt-4">Sin resultados</h3>
              <p className="text-text-muted text-xs mt-1">Prueba quitando algunos filtros o cambiando la búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => {
                const product = listing.products;
                const seller = listing.sellers;
                const image = product?.images?.[0] ?? "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop";
                return (
                  <Link key={listing.id} href={`/listings/${listing.id}`} className="group flex flex-col rounded-2xl glass-card overflow-hidden relative cursor-pointer">
                    {listing.featured_plan !== "FREE" && (
                      <span className="absolute top-3 left-3 z-10 rounded-lg bg-accent-gold px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-background shadow-md uppercase">
                        💎 PREMIUM
                      </span>
                    )}
                    <FavoriteButton listingId={listing.id} />
                    <div className="h-44 w-full bg-card-bg overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={product?.name ?? "Producto"}
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase">
                        <span>{product?.categories?.name ?? "Sin categoría"}</span>
                        <span className={`px-1.5 py-0.5 rounded ${listing.condition === "NEW" ? "bg-accent-green/10 text-accent-green" : "bg-text-muted/10 text-text-muted"}`}>
                          {listing.condition === "NEW" ? "NUEVO" : "USADO"}
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-sm text-foreground group-hover:text-accent-gold transition-colors line-clamp-1">
                        {product?.name ?? "Sin nombre"}
                      </h3>
                      <p className="text-xs text-text-muted line-clamp-2 -mt-1 leading-relaxed">
                        {product?.description}
                      </p>

                      <div className="flex items-baseline gap-1 mt-auto">
                        <span className="text-xs font-semibold text-accent-gold">$</span>
                        <span className="text-lg font-extrabold text-foreground">
                          {Number(listing.price).toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="border-t border-card-border/50 pt-3 mt-1 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-foreground leading-none">{seller?.name ?? "Vendedor"}</span>
                          <span className="text-[8px] text-text-muted mt-0.5 uppercase">Reputación: {seller?.tier ?? "-"}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-xs text-accent-gold font-bold">
                          <span>★</span>
                          <span className="text-[10px]">{((seller?.score ?? 0) / 10).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
