import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { fetchFeaturedListingCards, type FeaturedListingCard } from "@/lib/featuredListings";
import { stripRichText } from "@/lib/richText";

async function getHighlightedListings(): Promise<FeaturedListingCard[]> {
  try {
    const supabase = await createClient();
    return await fetchFeaturedListingCards(supabase);
  } catch (err) {
    console.error("[destacados] Unexpected error fetching highlights:", err);
    return [];
  }
}

export default async function DestacadosPage() {
  const highlights = await getHighlightedListings();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col gap-10">

      {/* Title Header */}
      <div className="border-b border-card-border pb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl">⭐</span>
          <h1 className="font-heading text-3xl font-extrabold text-foreground">
            Publicaciones Destacadas
          </h1>
        </div>
        <p className="text-text-muted text-xs mt-2 leading-relaxed max-w-2xl">
          Avisos en vitrina: aparecen en la portada y acá, con más visibilidad que el resto del catálogo.
        </p>
      </div>

      {highlights.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-card-border rounded-3xl flex flex-col items-center gap-2">
          <span className="text-4xl">📭</span>
          <h3 className="font-heading text-sm font-bold text-foreground mt-2">No hay publicaciones destacadas activas</h3>
          <p className="text-text-muted text-xs">
            ¡Sé el primero en destacar un producto desde tu panel de vendedor!
          </p>
          <Link
            href="/dashboard?tab=publish"
            className="mt-4 rounded-xl bg-accent-gold px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:opacity-90 transition-all"
          >
            Destacar Artículo
          </Link>
        </div>
      ) : (
        /* Listings Gallery Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((highlight) => {
            const item = highlight.listings;
            if (!item) return null;
            const isPremium = item.featured_plan === "PREMIUM";
            const product = item.products;
            const image = product?.images?.[0] ?? "/sinimagen.webp";
            const descriptionPreview = product?.description ? stripRichText(product.description) : "";

            return (
              <Link
                href={`/listings/${item.id}`}
                key={highlight.id}
                prefetch={false}
                className={`relative rounded-3xl border bg-card-bg-solid overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  isPremium
                    ? "border-accent-gold/40 shadow-[0_0_15px_rgba(217,119,6,0.06)] hover:border-accent-gold"
                    : "border-card-border hover:border-accent-green/50"
                }`}
              >
                {/* Visual Image Container */}
                <div className="aspect-[4/3] w-full overflow-hidden bg-card-border/30 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={product?.name ?? "Producto"}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Category Badge */}
                  <span className="absolute top-4 left-4 bg-background/80 backdrop-blur-md text-[9px] font-bold text-foreground px-2.5 py-1 rounded-full uppercase tracking-wider border border-card-border/30 shadow-sm">
                    {product?.categories?.name ?? "Clasificado"}
                  </span>

                  {/* Plan Badge */}
                  <span className={`absolute top-4 right-4 text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border shadow-md flex items-center gap-1 ${
                    isPremium
                      ? "bg-accent-gold text-white border-accent-gold animate-pulse"
                      : "bg-accent-green text-white border-accent-green"
                  }`}>
                    {isPremium ? "👑 Premium" : "⭐ Destacado"}
                  </span>
                </div>

                {/* Listing Details */}
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                      {product?.brand}
                    </span>
                    <h3 className="font-heading text-sm font-bold text-foreground group-hover:text-accent-gold transition-colors line-clamp-2">
                      {product?.name ?? "Sin nombre"}
                    </h3>
                    {descriptionPreview && (
                      <p className="text-text-muted text-[11px] line-clamp-3 leading-relaxed">
                        {descriptionPreview}
                      </p>
                    )}
                  </div>

                  {/* Bottom CTA & Price */}
                  <div className="flex items-center justify-between border-t border-card-border/30 pt-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-text-muted uppercase font-semibold">Precio</span>
                      <span className="font-heading text-lg font-extrabold text-foreground">
                        {item.currencies?.symbol ?? "$"}{item.price.toLocaleString("es-AR")}
                      </span>
                    </div>
                    <span
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        isPremium
                          ? "bg-gradient-to-r from-accent-gold to-accent-gold-hover text-white shadow-md hover:scale-[1.02] active:scale-[0.98]"
                          : "bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40"
                      }`}
                    >
                      Ver Detalle
                    </span>
                  </div>
                </div>

              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
