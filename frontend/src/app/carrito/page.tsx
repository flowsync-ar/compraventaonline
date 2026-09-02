"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  currencySymbol?: string;
}

interface CartListing {
  id: string;
  price: number;
  stock: number;
  status: string;
  image_url: string | null;
  products: { name: string; images: string[] | null } | null;
  sellers: { id: string; name: string } | null;
  currencies: { symbol: string } | null;
}

interface OrderResult {
  itemId: string;
  name: string;
  ok: boolean;
  error?: string;
}

const PURCHASABLE_STATUSES = ["APPROVED", "ACTIVE"];

export default function CartCheckoutPage() {
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [listings, setListings] = useState<Record<string, CartListing>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<OrderResult[] | null>(null);

  useEffect(() => {
    const supabase = getSupabase();

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        router.push("/login?redirect=" + encodeURIComponent("/carrito"));
        return;
      }

      const { data: seller } = await supabase
        .from("sellers")
        .select("identity_verified")
        .eq("user_id", uid)
        .maybeSingle();
      setIdentityVerified(!!seller?.identity_verified);

      const saved = localStorage.getItem("cart");
      const items: CartItem[] = saved ? JSON.parse(saved) : [];
      setCartItems(items);

      if (items.length > 0) {
        const { data } = await supabase
          .from("listings")
          .select(`
            id, price, stock, status, image_url,
            products ( name, images ),
            sellers ( id, name ),
            currencies ( symbol )
          `)
          .in("id", items.map((i) => i.id));

        const map: Record<string, CartListing> = {};
        (data ?? []).forEach((l) => { map[l.id] = l as unknown as CartListing; });
        setListings(map);
      }

      setLoading(false);
    }

    load().catch((err) => {
      console.error("Error al cargar el carrito:", err);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem("cart", JSON.stringify(items));
    window.dispatchEvent(new Event("cart-change"));
  };

  // Items whose listing is gone/paused/sold since they were added — can't
  // be bought, shown separately so the buyer knows to remove them.
  const unavailableItems = cartItems.filter((item) => {
    const listing = listings[item.id];
    return !listing || !PURCHASABLE_STATUSES.includes(listing.status) || listing.stock <= 0;
  });
  const purchasableItems = cartItems.filter((item) => !unavailableItems.includes(item));

  const total = purchasableItems.reduce((acc, item) => {
    const listing = listings[item.id];
    return acc + (listing?.price ?? item.price) * item.quantity;
  }, 0);
  const totalSymbol = purchasableItems[0] ? listings[purchasableItems[0].id]?.currencies?.symbol ?? "$" : "$";

  const handleRemoveItem = (id: string) => {
    saveCart(cartItems.filter((i) => i.id !== id));
  };

  const handleConfirm = async () => {
    if (!acceptedTerms || purchasableItems.length === 0) return;
    // Identity verification temporarily disabled.
    // if (!identityVerified) {
    //   router.push("/verificar-identidad?next=" + encodeURIComponent("/carrito"));
    //   return;
    // }
    setSubmitting(true);
    const outcomes: OrderResult[] = [];

    for (const item of purchasableItems) {
      for (let unit = 0; unit < item.quantity; unit++) {
        try {
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId: item.id }),
          });
          const data = await res.json();
          outcomes.push({
            itemId: item.id,
            name: item.name,
            ok: res.ok,
            error: res.ok ? undefined : data.error,
          });
        } catch {
          outcomes.push({ itemId: item.id, name: item.name, ok: false, error: "No se pudo procesar la compra." });
        }
      }
    }

    setResults(outcomes);
    // Keep in the cart only the units that failed (so the buyer can retry
    // or drop them), remove everything that succeeded.
    const failedIds = new Set(outcomes.filter((o) => !o.ok).map((o) => o.itemId));
    saveCart(cartItems.filter((i) => unavailableItems.some((u) => u.id === i.id) || failedIds.has(i.id)));
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-gold border-t-transparent"></div>
          <span className="text-sm font-semibold text-text-muted">Cargando tu carrito...</span>
        </div>
      </div>
    );
  }

  if (results) {
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col gap-6">
        <div className="rounded-3xl border border-card-border bg-card-bg-solid p-8 shadow-xl flex flex-col gap-5 text-center items-center">
          <span className="text-3xl">{failed.length === 0 ? "✅" : "⚠️"}</span>
          <h1 className="font-heading text-xl font-extrabold text-foreground">
            {succeeded.length > 0 ? "¡Compra confirmada!" : "No se pudo confirmar la compra"}
          </h1>
          {succeeded.length > 0 && (
            <p className="text-text-muted text-sm leading-relaxed">
              Le avisamos a cada vendedor. Coordiná el pago y la entrega desde <Link href="/compras" className="text-accent-gold hover:underline font-bold">Mis Compras</Link>.
            </p>
          )}
          {failed.length > 0 && (
            <div className="w-full rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-left text-xs text-red-500 flex flex-col gap-1.5">
              {failed.map((f, i) => (
                <p key={i}><strong>{f.name}</strong>: {f.error ?? "No se pudo procesar."}</p>
              ))}
            </div>
          )}
          <div className="flex gap-3 w-full">
            <Link href="/" className="flex-1 rounded-xl border border-card-border py-3 text-xs font-bold text-foreground hover:bg-card-border/20 transition-all text-center">
              Seguir comprando
            </Link>
            <Link href="/compras" className="flex-1 rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 py-3 text-xs font-extrabold text-white shadow-md hover:scale-[1.01] transition-all text-center">
              Ver mis compras
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-card-border pb-6">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Confirmar compra</h1>
        <p className="text-text-muted text-sm">Revisá tu carrito antes de confirmar.</p>
      </div>

      {cartItems.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-card-border rounded-3xl flex flex-col items-center gap-2 bg-card-bg-solid">
          <span className="text-4xl">🛒</span>
          <h3 className="font-heading text-sm font-bold text-foreground mt-2">Tu carrito está vacío</h3>
          <Link href="/search" className="mt-4 rounded-xl bg-accent-gold px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-all">
            Explorar productos
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {purchasableItems.map((item) => {
              const listing = listings[item.id];
              const image = listing?.image_url ?? listing?.products?.images?.[0] ?? null;
              const symbol = listing?.currencies?.symbol ?? item.currencySymbol ?? "$";
              const price = listing?.price ?? item.price;
              return (
                <div key={item.id} className="rounded-2xl border border-card-border bg-card-bg-solid p-4 flex items-center gap-3 text-xs">
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-card-border/20 border border-card-border/30 shrink-0">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                      <span className="h-full w-full flex items-center justify-center text-lg">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-foreground block truncate">{item.name}</span>
                    <span className="text-text-muted text-[10px]">
                      Vendedor: {listing?.sellers?.name ?? "—"} · Cant: {item.quantity}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-foreground block">
                      {symbol}{(price * item.quantity).toLocaleString("es-AR")}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            })}

            {unavailableItems.length > 0 && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex flex-col gap-2 text-xs">
                <span className="font-bold text-red-500">Ya no están disponibles:</span>
                {unavailableItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-text-muted">{item.name}</span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {purchasableItems.length > 0 && (
            <>
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-300 p-4 text-xs leading-relaxed text-left flex flex-col gap-1.5">
                <strong className="font-extrabold flex items-center gap-1 text-[11px] uppercase tracking-wider">⚠️ Importante: Compromiso de Compra</strong>
                <p className="text-[10px] text-text-muted dark:text-slate-300">
                  Al realizar la compra de estos productos asumís un <span className="font-bold text-foreground">compromiso de compra firme</span>. Si comprás y no concretás la operación, el vendedor puede calificarte negativamente, lo que afectará tu perfil como comprador dentro de la plataforma.
                </p>
              </div>

              <label className="flex items-start gap-2.5 text-left cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent-gold cursor-pointer"
                />
                <span className="text-xs text-foreground">Acepto las condiciones</span>
              </label>

              <div className="flex justify-between items-center border-t border-card-border/30 pt-4">
                <span className="text-xs text-text-muted">Total a Pagar:</span>
                <span className="font-heading text-lg font-extrabold text-accent-gold">
                  {totalSymbol}{total.toLocaleString("es-AR")}
                </span>
              </div>

              <button
                onClick={handleConfirm}
                disabled={submitting || !acceptedTerms}
                className="w-full rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 py-4 text-xs font-extrabold text-white shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Procesando..." : "Confirmar Compra"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
