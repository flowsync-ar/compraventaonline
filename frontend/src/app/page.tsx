import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import FavoriteButton from "@/components/FavoriteButton";

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

async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hero_slides")
      .select("id, image_url, eyebrow, title, cta_label, href, dark_overlay, image_fit, show_cta")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[home] Error fetching hero_slides:", error.message);
      return [];
    }
    return (data ?? []).map((slide) => ({
      id: slide.id,
      image: slide.image_url,
      eyebrow: slide.eyebrow,
      title: slide.title,
      cta: slide.cta_label,
      href: slide.href,
      darkOverlay: slide.dark_overlay,
      imageFit: slide.image_fit as "cover" | "contain",
      showCta: slide.show_cta,
    }));
  } catch (err) {
    console.error("[home] Unexpected error fetching hero_slides:", err);
    return [];
  }
}

const HOME_FEATURED_LIMIT = 8;

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
      console.error("[home] Error fetching sellers with sales:", error.message);
      return new Set();
    }
    return new Set((data ?? []).map((o) => o.seller_id));
  } catch (err) {
    console.error("[home] Unexpected error fetching sellers with sales:", err);
    return new Set();
  }
}

async function getFeaturedListings(): Promise<HighlightRow[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Same source of truth as /destacados: highlighted_products with a
    // still-valid end_date. Supabase can't .limit() correctly on a table
    // with a nested relation + a JS-side sort, so we fetch all active
    // highlights and slice after sorting (mirrors /destacados' approach).
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
      console.error("[home] Error fetching highlighted_products:", error.message);
      return [];
    }
    if (!data) return [];

    // highlighted_products has no idea if the underlying listing sold out
    // or got paused/removed since it was featured — filter those out here,
    // same purchasable set as PURCHASABLE_STATUSES in api/orders/route.ts.
    const purchasable = (data as unknown as HighlightRow[]).filter(
      (h) => h.listings?.status === "APPROVED" || h.listings?.status === "ACTIVE"
    );

    // Sort: PREMIUM first, then FEATURED/DESTACADO. The plan lives on
    // listings.featured_plan, not on highlighted_products (that table only
    // tracks the highlight's validity window — see /destacados).
    const sorted = purchasable.sort((a, b) => {
      const aPremium = a.listings?.featured_plan === "PREMIUM";
      const bPremium = b.listings?.featured_plan === "PREMIUM";
      if (aPremium && !bPremium) return -1;
      if (!aPremium && bPremium) return 1;
      return 0;
    });

    return sorted.slice(0, HOME_FEATURED_LIMIT);
  } catch (err) {
    console.error("[home] Unexpected error fetching highlighted_products:", err);
    return [];
  }
}

export default async function HomePage() {
  const [highlights, heroSlides, sellersWithSales] = await Promise.all([
    getFeaturedListings(),
    getHeroSlides(),
    getSellersWithSales(),
  ]);

  return (
    <div className="flex flex-col gap-10 pb-16">

      {/* 1. Carousel + Hero Search */}
      <section className="relative">
        <HeroCarousel slides={heroSlides} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10 -mt-2 pt-2 pb-2 sm:pb-3">

          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-gold/10 px-3 py-1 text-xs font-semibold text-accent-gold border border-accent-gold/20 mb-2 glow-gold">
            🌾 El Primer Marketplace 100% Pampeano
          </span>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-5xl text-foreground max-w-3xl mx-auto leading-[1.1]">
            Encontrá lo que buscas en <span className="bg-gradient-to-r from-accent-gold to-accent-green bg-clip-text text-transparent">La Pampa</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-text-muted max-w-xl mx-auto">
            Comprá y vendé de forma segura y directa. Conectamos usuarios particulares y comercios de toda la provincia.
          </p>

        </div>
      </section>

      {/* 2. Highlighted Listings Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full -mt-2">
        <div className="flex items-end justify-between border-b border-card-border pb-5 mb-8">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">Publicaciones Destacadas</h2>
            <p className="text-sm text-text-muted mt-1">Ofertas destacadas con excelente reputación de vendedor.</p>
          </div>
          <Link href="/destacados" className="text-xs font-bold text-accent-gold hover:text-accent-gold-hover hover:underline transition-all">
            Ver todas las publicaciones →
          </Link>
        </div>

        {highlights.length === 0 ? (
          <div className="text-center py-16 rounded-2xl glass-panel">
            <span className="text-4xl">🌾</span>
            <h3 className="font-heading text-lg font-bold text-foreground mt-4">Todavía no hay publicaciones destacadas</h3>
            <p className="text-text-muted text-xs mt-1">Sé el primero en publicar un artículo en La Pampa.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((highlight) => {
            const listing = highlight.listings;
            if (!listing) return null;
            const product = listing.products;
            const seller = listing.sellers;
            const image = product?.images?.[0] ?? "/sinimagen.png";
            return (
              <Link
                key={highlight.id}
                href={`/listings/${listing.id}`}
                className="group flex flex-col rounded-2xl glass-card overflow-hidden relative cursor-pointer"
              >
                <FavoriteButton listingId={listing.id} />
                {/* Badge Plan */}
                {listing.featured_plan !== "FREE" && (
                  <span className={`absolute top-3 left-3 z-10 rounded-lg px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-background shadow-md uppercase ${
                    listing.featured_plan === "PREMIUM" ? "bg-accent-gold" : "bg-accent-blue"
                  }`}>
                    {listing.featured_plan === "PREMIUM" ? "💎 PREMIUM" : "⚡ DESTACADO"}
                  </span>
                )}

                {/* Image Container */}
                <div className="h-48 w-full bg-card-bg overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={product?.name ?? "Producto"}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Card Body */}
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
                    <span className="font-heading text-lg font-extrabold text-foreground">
                      {listing.currencies?.symbol ?? "$"}
                    </span>
                    <span className="font-heading text-lg font-extrabold text-foreground">
                      {listing.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Seller Bar */}
                  <div className="border-t border-card-border/50 pt-3 mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-foreground leading-none">
                        {seller?.name ?? "Vendedor"}
                      </span>
                      {seller?.id && sellersWithSales.has(seller.id) ? (
                        <span className="text-[8px] text-text-muted mt-0.5 uppercase">
                          Reputación: {seller.tier}
                        </span>
                      ) : (
                        <span className="text-[8px] text-text-muted mt-0.5 uppercase">
                          🌱 Vendedor nuevo
                        </span>
                      )}
                    </div>
                    {seller?.id && sellersWithSales.has(seller.id) ? (
                      <div className="flex items-center gap-0.5 text-xs text-accent-gold font-bold">
                        <span>{tierEmoji(seller.tier)}</span>
                        <span className="text-[10px]">{seller.score} pts</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-text-muted italic">Sin ventas aún</span>
                    )}
                  </div>

                </div>

              </Link>
            );
          })}
        </div>
        )}
      </section>

    </div>
  );
}
