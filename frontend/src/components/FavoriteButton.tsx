"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  useEffect(() => {
    setMounted(true);
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) checkFavoriteStatus(uid, supabase);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        checkFavoriteStatus(uid, supabase);
      } else {
        setIsFavorite(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [listingId]);

  async function checkFavoriteStatus(uid: string, supabase: SupabaseClient) {
    try {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("listing_id", listingId)
        .eq("user_id", uid)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (err) {
      console.error("Error checking favorite status:", err);
    }
  }

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
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("listing_id", listingId)
          .eq("user_id", userId);

        if (!error) {
          setIsFavorite(false);
          window.dispatchEvent(new Event("favorites-updated"));
        }
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ listing_id: listingId, user_id: userId });

        if (!error) {
          setIsFavorite(true);
          window.dispatchEvent(new Event("favorites-updated"));
        }
      }
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
      className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border backdrop-blur-md active:scale-90 disabled:opacity-50 ${
        isFavorite
          ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
          : "bg-background/60 hover:bg-background/80 border-card-border text-white hover:text-red-400 hover:border-red-500/20"
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
