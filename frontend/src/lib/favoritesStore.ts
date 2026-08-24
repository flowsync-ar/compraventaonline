"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Every <FavoriteButton> on a results grid used to run its own "resolve
// seller_id" + "check this one listing_id" queries on mount — a page with
// 23 cards fired ~46 requests just to paint heart icons. This module is a
// page-lifetime singleton cache shared by every button instance: the
// seller_id lookup and the full favorited-listing-ids set are each fetched
// at most once (in-flight requests are deduped via the cached promise),
// and every button just reads from the shared Set instead of asking the
// server about its own listing_id.
type Listener = () => void;

let sellerIdPromise: Promise<string | null> | null = null;
let favoriteIdsPromise: Promise<Set<string>> | null = null;
let favoriteIds: Set<string> | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeFavorites(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Call on sign-out / sign-in-as-different-user — the cached seller_id and
// favorites set belong to whoever was signed in when they were fetched.
export function resetFavoritesStore(): void {
  sellerIdPromise = null;
  favoriteIdsPromise = null;
  favoriteIds = null;
  notify();
}

function resolveSellerId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  if (!sellerIdPromise) {
    sellerIdPromise = (async () => {
      const { data } = await supabase.from("sellers").select("id").eq("user_id", userId).single();
      return data?.id ?? null;
    })();
  }
  return sellerIdPromise;
}

export function getFavoriteIds(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  if (favoriteIds) return Promise.resolve(favoriteIds);
  if (!favoriteIdsPromise) {
    favoriteIdsPromise = (async () => {
      const sellerId = await resolveSellerId(supabase, userId);
      if (!sellerId) return new Set<string>();
      const { data } = await supabase.from("favorites").select("listing_id").eq("seller_id", sellerId);
      favoriteIds = new Set((data ?? []).map((f) => f.listing_id as string));
      return favoriteIds;
    })();
  }
  return favoriteIdsPromise;
}

export async function toggleFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string
): Promise<boolean> {
  const sellerId = await resolveSellerId(supabase, userId);
  if (!sellerId) throw new Error("No se pudo resolver el vendedor");

  const set = await getFavoriteIds(supabase, userId);
  const wasFavorite = set.has(listingId);

  if (wasFavorite) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("listing_id", listingId)
      .eq("seller_id", sellerId);
    if (error) throw error;
    set.delete(listingId);
  } else {
    const { error } = await supabase.from("favorites").insert({ listing_id: listingId, seller_id: sellerId });
    if (error) throw error;
    set.add(listingId);
  }

  notify();
  return !wasFavorite;
}
