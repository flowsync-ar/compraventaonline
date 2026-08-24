"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFavoriteIds, toggleFavorite, resetFavoritesStore, subscribeFavorites } from "@/lib/favoritesStore";

interface FavoriteButtonProps {
  listingId: string;
}

export default function FavoriteButton({ listingId }: FavoriteButtonProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  // Reads from the shared favoritesStore (one request per page for the
  // whole favorited-ids set, not one per card — see lib/favoritesStore.ts).
  async function syncFromStore(uid: string, supabase: SupabaseClient) {
    try {
      const ids = await getFavoriteIds(supabase, uid);
      setIsFavorite(ids.has(listingId));
    } catch (err) {
      console.error("Error checking favorite status:", err);
    }
  }

  useEffect(() => {
    setMounted(true);
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) syncFromStore(uid, supabase);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (event === "SIGNED_OUT") resetFavoritesStore();
      if (uid) {
        syncFromStore(uid, supabase);
      } else {
        setIsFavorite(false);
      }
    });

    // Other buttons toggling favorites (or this same listing_id appearing
    // in more than one section of the page) update the shared Set — this
    // keeps every mounted button's icon in sync with it.
    const unsubscribe = subscribeFavorites(() => {
      if (userId) syncFromStore(userId, supabase);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribe();
    };
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      const redirectPath = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (loading) return;

    const supabase = getSupabase();
    try {
      setLoading(true);
      const nowFavorite = await toggleFavorite(supabase, userId, listingId);
      setIsFavorite(nowFavorite);
      window.dispatchEvent(new Event("favorites-updated"));
    } catch (err) {
      console.error("Error toggling favorite:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-background/60 border border-card-border" />
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border backdrop-blur-md active:scale-90 disabled:opacity-50 shadow-sm ${
        isFavorite
          ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
          // text-white was invisible against light product photos (white
          // outline on a barely-tinted white circle) — text-foreground/70
          // keeps a visible dark outline in light mode and a light one in
          // dark mode, regardless of what's behind the card.
          : "bg-background/80 hover:bg-background/95 border-card-border text-foreground/70 hover:text-red-400 hover:border-red-500/20"
      }`}
      aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
      title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill={isFavorite ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth="2.2"
        stroke="currentColor"
        className={`w-5 h-5 transition-transform duration-300 ${
          isFavorite ? "scale-110" : "scale-100 hover:scale-110"
        }`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
    </button>
  );
}
