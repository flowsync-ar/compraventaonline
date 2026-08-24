import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

type HighlightRow = {
  id: string;
  listings: {
    id: string;
    price: number;
    condition: string;
    featured_plan: string;
    status: string;
    products: {
      name: string;
      brand: string;
      description: string;
      images: string[] | null;
      categories: { name: string } | null;
    } | null;
    sellers: {
      id: string;
      name: string;
      score: number;
      tier: string;
    } | null;
    currencies: { symbol: string } | null;
  } | null;
};

function tierEmoji(tier: string): string {
  switch (tier.toUpperCase()) {
    case "PREMIUM": return "💎";
    case "GOLD":
    case "ORO": return "🥇";
    case "PLATA":
    case "SILVER": return "🥈";
    default: return "🥉";
  }
}

async function getHighlightedListings(): Promise<HighlightRow[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("highlighted_products")
      .select(`
        id,
        listings (
          id,
          price,
          condition,
          featured_plan,
          status,
          products (
            name,
            brand,
            description,
            images,
            categories ( name )
          ),
          sellers (
            id,
            name,
            score,
            tier
          ),
          currencies ( symbol )
        )
      `)
      .gt("end_date", now);

    if (error) {
      console.error("[destacados] Error fetching highlights:", error.message);
      return [];
    }
    if (!data) return [];

    // highlighted_products has no idea if the underlying listing sold out
    // or got paused/removed since it was featured — filter those out here,
    // same purchasable set as PURCHASABLE_STATUSES in api/orders/route.ts.
    const purchasable = (data as unknown as HighlightRow[]).filter(
      (h) => h.listings?.status === "APPROVED" || h.listings?.status === "ACTIVE"
    );

    // Sort: PREMIUM first, then FEATURED. The plan lives on
    // listings.featured_plan, not on highlighted_products (that table only
    // tracks the highlight's validity window).
    const sorted = purchasable.sort((a, b) => {
      const aPremium = a.listings?.featured_plan === "PREMIUM";
      const bPremium = b.listings?.featured_plan === "PREMIUM";
      if (aPremium && !bPremium) return -1;
      if (!aPremium && bPremium) return 1;
      return 0;
    });

    return sorted;
  } catch (err) {
    console.error("[destacados] Unexpected error fetching highlights:", err);
    return [];
  }
}

// Sellers with at least one PAID order — used to avoid showing the default
// score/tier (DB default: score 80, tier BRONCE) as if it were an earned
// reputation for sellers who never actually sold anything.
// Uses the admin client: `orders` RLS only lets the buyer/seller read their
// own rows, but this page is public and needs the full picture.
async function getSellersWithSales(): Promise<Set<string>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select("seller_id")
      .eq("status", "PAID");

    if (error) {
      console.error("[destacados] Error fetching sellers with sales:", error.message);
      return new Set();
    }
    return new Set((data ?? []).map((o) => o.seller_id));
  } catch (err) {
    console.error("[destacados] Unexpected error fetching sellers with sales:", err);
    return new Set();
  }
}

export default async function DestacadosPage() {
  const [highlights, sellersWithSales] = await Promise.all([
    getHighlightedListings(),
    getSellersWithSales(),
  ]);

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
          Descubrí los mejores productos y ofertas destacadas por los comercios y vendedores de La Pampa.
        </p>
      </div>

      {/* Criterio de Rotación Informativo */}
      <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/5 p-4 flex gap-3 items-start text-xs text-text-muted leading-relaxed">
        <span className="text-accent-gold text-lg select-none">🔄</span>
        <div>
          <p className="font-bold text-foreground mb-1">Rotación Equitativa para Vendedores</p>
          Para asegurar que todos nuestros clientes y anunciantes tengan las mismas oportunidades, las publicaciones dentro de un mismo plan destacado se ordenan de manera completamente aleatoria cada vez que se ingresa a la página. Esto garantiza que todos los productos se visualicen por igual sin importar la fecha de contratación del servicio.
        </div>
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
            const seller = item.sellers;
            const image = product?.images?.[0] ?? "/sinimagen.png";

            return (
              <Link
                href={`/listings/${item.id}`}
                key={highlight.id}
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
                    <p className="text-text-muted text-[11px] line-clamp-3 leading-relaxed">
                      {product?.description}
                    </p>
                  </div>

                  {/* Seller & Reputation details */}
                  <div className="flex items-center justify-between border-t border-card-border/30 pt-3 text-[10px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-text-muted">Vendedor</span>
                      <span className="font-bold text-foreground max-w-[150px] truncate">
                        {seller?.name ?? "Vendedor"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-text-muted">Reputación</span>
                      {seller?.id && sellersWithSales.has(seller.id) ? (
                        <span className="font-extrabold text-accent-green">
                          {tierEmoji(seller.tier)} {seller.score} pts
                        </span>
                      ) : (
                        <span className="font-bold text-text-muted italic">🌱 Nuevo, sin ventas</span>
                      )}
                    </div>
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
