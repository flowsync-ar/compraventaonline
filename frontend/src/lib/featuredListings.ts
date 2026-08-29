import { createClient } from "@/lib/supabase/server";

export type FeaturedListingCard = {
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
      username: string | null;
      score: number;
      tier: string;
    } | null;
    currencies: { symbol: string } | null;
  } | null;
};

const LISTING_SELECT = `
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
    username,
    score,
    tier
  ),
  currencies ( symbol )
`;

function isPurchasable(status: string | undefined) {
  return status === "APPROVED" || status === "ACTIVE";
}

const ROTATE_EVERY_MS = 20 * 60 * 1000;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleForTimeWindow<T>(items: T[]): T[] {
  const seed = Math.floor(Date.now() / ROTATE_EVERY_MS);
  const random = mulberry32(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

// Home and /destacados used to only look at highlighted_products (paid /
// reward window). Picking FEATURED on publish only sets listings.featured_plan,
// so those listings never showed. Merge both sources and de-dupe by listing id.
export async function fetchFeaturedListingCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit?: number
): Promise<FeaturedListingCard[]> {
  const now = new Date().toISOString();

  const [highlightsResult, plannedResult] = await Promise.all([
    supabase
      .from("highlighted_products")
      .select(`id, listings ( ${LISTING_SELECT} )`)
      .gt("end_date", now),
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .in("featured_plan", ["FEATURED", "PREMIUM"])
      .in("status", ["APPROVED", "ACTIVE"]),
  ]);

  if (highlightsResult.error) {
    console.error("[featured] highlighted_products:", highlightsResult.error.message);
  }
  if (plannedResult.error) {
    console.error("[featured] listings by plan:", plannedResult.error.message);
  }

  const byListingId = new Map<string, FeaturedListingCard>();

  for (const row of (highlightsResult.data ?? []) as unknown as FeaturedListingCard[]) {
    const listing = row.listings;
    if (!listing || !isPurchasable(listing.status)) continue;
    byListingId.set(listing.id, row);
  }

  for (const listing of (plannedResult.data ?? []) as unknown as NonNullable<FeaturedListingCard["listings"]>[]) {
    if (!listing.id || byListingId.has(listing.id)) continue;
    byListingId.set(listing.id, { id: `plan-${listing.id}`, listings: listing });
  }

  const merged = shuffleForTimeWindow([...byListingId.values()]);
  return typeof limit === "number" ? merged.slice(0, limit) : merged;
}
