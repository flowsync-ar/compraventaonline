import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import FeaturedListingsCarousel from "@/components/FeaturedListingsCarousel";
import { fetchFeaturedListingCards, type FeaturedListingCard } from "@/lib/featuredListings";

async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hero_slides")
      .select("id, image_url, image_url_mobile, eyebrow, title, cta_label, href, dark_overlay, image_fit, show_cta")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[home] Error fetching hero_slides:", error.message);
      return [];
    }
    return (data ?? []).map((slide) => ({
      id: slide.id,
      image: slide.image_url,
      imageMobile: slide.image_url_mobile,
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

async function getFeaturedListings(): Promise<FeaturedListingCard[]> {
  try {
    const supabase = await createClient();
    return await fetchFeaturedListingCards(supabase, HOME_FEATURED_LIMIT);
  } catch (err) {
    console.error("[home] Unexpected error fetching featured listings:", err);
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
    <div className="flex flex-col gap-3 pb-16">

      <section className="relative">
        <h1 className="sr-only">CompraVentaOnline — marketplace de La Pampa</h1>
        <HeroCarousel slides={heroSlides} />
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between pb-2 mb-3">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">Publicaciones Destacadas</h2>
          </div>
          {highlights.length > 0 && (
            <Link href="/destacados" className="text-xs font-bold text-accent-gold hover:text-accent-gold-hover hover:underline transition-all">
              Ver todas →
            </Link>
          )}
        </div>

        {highlights.length === 0 ? (
          <div className="text-center py-16 rounded-2xl glass-panel">
            <span className="text-4xl">⭐</span>
            <h3 className="font-heading text-lg font-bold text-foreground mt-4">Todavía no hay publicaciones destacadas</h3>
            <p className="text-text-muted text-xs mt-1">Sé el primero en publicar un artículo en La Pampa.</p>
          </div>
        ) : (
          <FeaturedListingsCarousel
            items={highlights}
            sellerIdsWithSales={[...sellersWithSales]}
          />
        )}
      </section>

    </div>
  );
}
