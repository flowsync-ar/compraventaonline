"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface FavoriteItem {
  id: string;
  listing_id: string | null;
  created_at: string;
  listings: {
    id: string;
    price: number;
    condition: "NEW" | "USED";
    stock: number;
    status: string;
    image_url: string | null;
    products: {
      name: string;
      brand: string;
      description: string;
      images: string[] | null;
      categories: {
        name: string;
      } | null;
    } | null;
    sellers: {
      id: string;
      name: string;
    } | null;
    currencies: {
      symbol: string;
      code: string;
    } | null;
  } | null;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  // Mount + auth check
  useEffect(() => {
    setMounted(true);
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Resolve the seller row (favorites.seller_id references sellers.id, not the auth user id)
  useEffect(() => {
    if (!userId) return;

    async function resolveSeller() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", userId!)
        .single();
      setSellerId(data?.id ?? null);
    }

    resolveSeller();
  }, [userId]);

  // Fetch favorites once sellerId is available
  useEffect(() => {
    if (!sellerId) return;

    async function fetchFavorites() {
      const supabase = getSupabase();
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("favorites")
          .select(`
            id,
            listing_id,
            created_at,
            listings (
              id,
              price,
              condition,
              stock,
              status,
              image_url,
              products (
                name,
                brand,
                description,
                images,
                categories ( name )
              ),
              sellers (
                id,
                name
              ),
              currencies (
                symbol,
                code
              )
            )
          `)
          .eq("seller_id", sellerId!)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setFavorites((data ?? []) as unknown as FavoriteItem[]);
      } catch (err: any) {
        console.error("Error al cargar la lista de favoritos:", err);
        setErrorMsg("Ocurrió un error al cargar la lista.");
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [sellerId]);

  const handleRemoveFavorite = async (favId: string) => {
    const supabase = getSupabase();
    try {
      setErrorMsg("");
      setSuccessMsg("");

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favId);

      if (error) throw error;

      setFavorites((prev) => prev.filter((item) => item.id !== favId));
      setSuccessMsg("Quitado de tus favoritos correctamente.");
    } catch (err: any) {
      console.error("Error al eliminar favorito:", err);
      setErrorMsg("Error al eliminar el favorito.");
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-blue border-t-transparent"></div>
          <span className="text-sm font-semibold text-text-muted">Cargando tus favoritos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-card-border pb-6">
        <h1 className="font-heading text-3xl font-extrabold text-foreground flex items-center gap-2.5">
          <span className="text-red-500">❤️</span> Mis Favoritos
        </h1>
        <p className="text-text-muted text-sm">
          Guardá los artículos que te interesan para seguir de cerca su stock y precio.
        </p>
      </div>

      {/* Mensajes de Alerta */}
      {successMsg && (
        <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-xl p-4 text-xs font-semibold animate-in fade-in duration-200">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 text-xs font-semibold animate-in fade-in duration-200">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Favorites List */}
      {favorites.length === 0 ? (
        <div className="rounded-2xl glass-panel p-16 text-center flex flex-col items-center justify-center gap-4">
          <span className="text-5xl animate-pulse">🌾</span>
          <h2 className="font-heading text-xl font-bold text-foreground">Tu lista de favoritos está vacía</h2>
          <p className="text-xs text-text-muted max-w-sm leading-relaxed">
            Explorá el catálogo pampeano y marcá con un corazón los productos que más te gusten para tenerlos a mano.
          </p>
          <Link
            href="/search"
            className="mt-2 rounded-xl bg-accent-blue hover:opacity-95 text-background font-extrabold text-xs px-6 py-3 shadow-md transition-all cursor-pointer active:scale-95"
          >
            Buscar Productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {favorites.map((item) => {
            const listing = item.listings;
            const isAvailable = listing !== null && listing.status === "APPROVED";
            const product = listing?.products;
            const title = product?.name ?? "Producto no disponible";
            const image =
              listing?.image_url ??
              product?.images?.[0] ??
              "/sinimagen.png";
            const price = listing?.price ?? null;
            const currencySymbol = listing?.currencies?.symbol ?? "$";
            const condition = listing?.condition === "NEW" ? "Nuevo" : listing?.condition === "USED" ? "Usado" : null;
            const brand = product?.brand ?? null;
            const sellerName = listing?.sellers?.name ?? null;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border border-card-border overflow-hidden flex flex-col justify-between transition-all group hover:-translate-y-1 shadow-sm ${
                  isAvailable
                    ? "bg-card-bg hover:border-accent-blue/30"
                    : "bg-card-bg-solid/50 border-dashed opacity-80"
                }`}
              >
                {/* Product Image */}
                <div className="relative aspect-video w-full overflow-hidden bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={title}
                    className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 ${
                      !isAvailable ? "grayscale contrast-75 brightness-75" : ""
                    }`}
                  />
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
                      <span className="bg-red-500 text-background text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider text-center">
                        No Disponible
                      </span>
                    </div>
                  )}
                  {isAvailable && (
                    <button
                      onClick={() => handleRemoveFavorite(item.id)}
                      className="absolute top-3 right-3 bg-black/60 hover:bg-red-500 text-white rounded-full p-2 hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center"
                      title="Quitar de favoritos"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex flex-col flex-1 gap-3 justify-between">
                  <div className="flex flex-col gap-2">
                    {isAvailable && (
                      <div className="flex items-center gap-2 text-[10px] font-extrabold text-text-muted">
                        <span className="uppercase tracking-wider">{brand}</span>
                        {condition && (
                          <>
                            <span>•</span>
                            <span className="bg-card-border px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">{condition}</span>
                          </>
                        )}
                      </div>
                    )}

                    <h3 className="font-heading text-sm font-bold text-foreground line-clamp-2">
                      {isAvailable ? (
                        <Link href={`/listings/${item.listing_id}`} className="hover:text-accent-blue transition-colors">
                          {title}
                        </Link>
                      ) : (
                        <span className="text-text-muted/70">{title}</span>
                      )}
                    </h3>
                  </div>

                  {/* Pricing / Delete Warning */}
                  <div className="pt-2 border-t border-card-border/50 flex flex-col gap-3">
                    {isAvailable ? (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-text-muted font-bold">Precio</span>
                          <span className="text-base font-extrabold text-foreground">
                            {currencySymbol} {Number(price).toLocaleString("es-AR")}
                          </span>
                        </div>
                        <Link
                          href={`/listings/${item.listing_id}`}
                          className="bg-card-bg-solid hover:bg-accent-blue/5 border border-card-border hover:border-accent-blue/40 text-foreground hover:text-accent-blue rounded-lg px-3.5 py-1.5 text-[10px] font-extrabold transition-all active:scale-95"
                        >
                          Ver Detalle
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <p className="text-[10px] leading-relaxed text-red-500 font-semibold bg-red-500/5 border border-red-500/10 rounded-lg p-2 flex items-start gap-1.5">
                          <span>⚠️</span> Este producto ya no está más disponible para la venta.
                        </p>
                        <button
                          onClick={() => handleRemoveFavorite(item.id)}
                          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg py-2 text-[10px] font-extrabold tracking-wider transition-all cursor-pointer text-center uppercase"
                        >
                          Quitar de Favoritos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
