"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

interface Order {
  id: string;
  buyer_id: string;
  amount: number;
  status: OrderStatus;
  payment_method: "MERCADOPAGO" | "TRANSFER";
  created_at: string;
  currencies: { symbol: string } | null;
  listings: {
    id: string;
    image_url: string | null;
    products: { name: string; brand: string | null; images: string[] | null } | null;
  } | null;
  buyer: { name: string; phone: string | null; buyer_score: number; buyer_tier: string } | null;
}

const STATUS_LABEL: Record<OrderStatus, { text: string; className: string }> = {
  PENDING: { text: "Pendiente de confirmar", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  PAID: { text: "Confirmada", className: "bg-accent-green/10 text-accent-green" },
  CANCELLED: { text: "Cancelada", className: "bg-red-500/10 text-red-500" },
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

type RatingValue = "POSITIVA" | "NEUTRAL" | "NEGATIVA";

const RATING_OPTIONS: { value: RatingValue; emoji: string; label: string }[] = [
  { value: "POSITIVA", emoji: "😊", label: "Positiva" },
  { value: "NEUTRAL", emoji: "😐", label: "Neutral" },
  { value: "NEGATIVA", emoji: "😞", label: "Negativa" },
];

export default function SalesPage() {
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const [ratedOrderIds, setRatedOrderIds] = useState<Set<string>>(new Set());
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [ratingValue, setRatingValue] = useState<RatingValue | null>(null);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const loadOrders = async () => {
    const supabase = getSupabase();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: seller } = await supabase.from("sellers").select("id").eq("user_id", uid).single();
      if (!seller) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, buyer_id, amount, status, payment_method, created_at,
          currencies ( symbol ),
          listings (
            id, image_url,
            products ( name, brand, images )
          ),
          buyer:sellers!orders_buyer_id_fkey ( name, phone, buyer_score, buyer_tier )
        `)
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data ?? []) as unknown as Order[]);

      const { data: ratings } = await supabase
        .from("buyer_ratings")
        .select("order_id")
        .eq("seller_id", seller.id);
      setRatedOrderIds(new Set((ratings ?? []).map((r) => r.order_id as string)));
    } catch (err) {
      console.error("Error al cargar tus ventas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmReceived = async (orderId: string) => {
    setConfirmingId(orderId);
    setErrorMsg("");
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "PAID", paid_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw new Error(error.message);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "PAID" } : o)));

      const confirmedOrder = orders.find((o) => o.id === orderId);
      if (confirmedOrder) {
        setRatingValue(null);
        setRatingComment("");
        setRatingOrder({ ...confirmedOrder, status: "PAID" });
      }
    } catch (err) {
      console.error("Error al confirmar la venta:", err);
      setErrorMsg("No se pudo confirmar la venta.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingOrder || !ratingValue) return;
    setRatingSubmitting(true);
    setErrorMsg("");
    const supabase = getSupabase();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      const { data: seller } = await supabase.from("sellers").select("id").eq("user_id", uid).single();
      if (!seller) throw new Error("No se pudo identificar tu cuenta.");

      const { error } = await supabase.from("buyer_ratings").insert({
        order_id: ratingOrder.id,
        seller_id: seller.id,
        buyer_id: ratingOrder.buyer_id,
        rating: ratingValue,
        comment: ratingComment.trim() || null,
      });
      if (error) throw new Error(error.message);

      setRatedOrderIds((prev) => new Set(prev).add(ratingOrder.id));
      setRatingOrder(null);
    } catch (err) {
      console.error("Error al calificar al comprador:", err);
      setErrorMsg("No se pudo registrar la calificación.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-gold border-t-transparent"></div>
          <span className="text-sm font-semibold text-text-muted">Cargando tus ventas...</span>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    const product = order.listings?.products;
    return (
      !q ||
      (product?.name ?? "").toLowerCase().includes(q) ||
      (product?.brand ?? "").toLowerCase().includes(q) ||
      (order.buyer?.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col gap-8">

      <div className="flex flex-col gap-2 border-b border-card-border pb-6">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Mis ventas</h1>
        <p className="text-text-muted text-sm">
          Gestioná los pedidos de tus publicaciones y confirmá cuando recibas el pago.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl p-4 text-xs font-semibold bg-red-500/10 text-red-500">{errorMsg}</div>
      )}

      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-3 flex items-center text-sm text-text-muted select-none">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar ventas por producto, marca o comprador..."
          className="w-full bg-card-bg-solid border border-card-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
        />
      </div>

      <div className="flex flex-col gap-4">
        {filteredOrders.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-card-border rounded-3xl flex flex-col items-center gap-2 bg-card-bg-solid">
            <span className="text-4xl">💰</span>
            <h3 className="font-heading text-sm font-bold text-foreground mt-2">No encontramos ventas</h3>
            <p className="text-text-muted text-sm">Todavía no tenés ventas registradas.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const product = order.listings?.products;
            const buyer = order.buyer;
            const image = order.listings?.image_url ?? product?.images?.[0] ?? null;
            const statusInfo = STATUS_LABEL[order.status];
            const symbol = order.currencies?.symbol ?? "$";

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-card-border bg-card-bg-solid p-5 flex flex-col gap-4 shadow-sm hover:border-card-border/80 transition-colors"
              >
                <div className="flex justify-between items-center border-b border-card-border/30 pb-3 text-xs text-text-muted">
                  <span>Vendido el {new Date(order.created_at).toLocaleDateString("es-AR")}</span>
                  <span className="font-mono">ID Venta: #{order.id.slice(0, 8).toUpperCase()}</span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-card-border/20 border border-card-border/30 shrink-0">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={product?.name ?? "Producto"} className="h-full w-full object-contain" />
                      ) : (
                        <span className="h-full w-full flex items-center justify-center text-lg">📦</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full w-fit ${statusInfo.className}`}
                      >
                        {statusInfo.text}
                      </span>
                      <h3 className="font-heading text-base font-bold text-foreground leading-tight mt-1">
                        {product?.name ?? "Producto"}
                      </h3>
                      {product?.brand && <p className="text-xs text-text-muted">Marca: {product.brand}</p>}
                      <p className="text-xs text-text-muted mt-0.5">
                        Comprador: <span className="font-bold text-foreground/80">{buyer?.name ?? "—"}</span>
                        {buyer && buyer.buyer_score > 0 && (
                          <span className="ml-1.5 text-[10px] text-accent-gold font-bold">
                            {tierEmoji(buyer.buyer_tier)} {buyer.buyer_score} pts
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end shrink-0">
                    <span className="text-xs text-text-muted uppercase font-semibold">Total</span>
                    <span className="font-heading text-lg font-extrabold text-foreground mt-0.5">
                      {symbol} {Number(order.amount).toLocaleString("es-AR")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 md:min-w-[170px]">
                    {order.status === "PENDING" && (
                      <button
                        onClick={() => handleConfirmReceived(order.id)}
                        disabled={confirmingId === order.id}
                        className="w-full rounded-xl bg-gradient-to-r from-accent-green to-accent-green px-4 py-2.5 text-xs font-extrabold text-background shadow-sm hover:opacity-95 transition-all cursor-pointer text-center disabled:opacity-50"
                      >
                        {confirmingId === order.id ? "Confirmando..." : "✓ Confirmar recibido"}
                      </button>
                    )}
                    {order.status === "PAID" && !ratedOrderIds.has(order.id) && (
                      <button
                        onClick={() => { setRatingValue(null); setRatingComment(""); setRatingOrder(order); }}
                        className="w-full rounded-xl bg-accent-gold/10 border border-accent-gold/30 text-accent-gold px-4 py-2.5 text-xs font-bold hover:bg-accent-gold/20 transition-all cursor-pointer text-center"
                      >
                        ⭐ Calificar comprador
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedOrder(order); setShowContactModal(true); }}
                      className="w-full rounded-xl bg-card-bg border border-card-border px-4 py-2.5 text-xs font-bold text-foreground hover:text-accent-gold hover:border-accent-gold/30 transition-all cursor-pointer text-center"
                    >
                      Contactar comprador
                    </button>
                    {order.listings?.id && (
                      <Link
                        href={`/listings/${order.listings.id}`}
                        className="w-full rounded-xl border border-card-border px-4 py-2.5 text-xs font-bold text-foreground hover:text-accent-gold hover:border-accent-gold/30 transition-all text-center"
                      >
                        Ver publicación
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Contact Buyer Modal */}
      {showContactModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative rounded-3xl border border-card-border bg-card-bg-solid p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-6">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              ✕
            </button>
            <div className="text-left flex flex-col gap-2">
              <span className="text-2xl">📞</span>
              <h3 className="font-heading text-lg font-extrabold text-foreground">Coordinación del Pago y Envío</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Comunicate de forma directa con el comprador para acordar el pago y la entrega.
              </p>
            </div>
            <div className="rounded-2xl border border-card-border bg-background p-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-card-border/30 pb-2">
                <span className="text-text-muted">Comprador:</span>
                <strong className="text-foreground">{selectedOrder.buyer?.name ?? "—"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Producto:</span>
                <strong className="text-foreground truncate max-w-[180px]">
                  {selectedOrder.listings?.products?.name ?? "—"}
                </strong>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowContactModal(false)}
                className="rounded-xl border border-card-border py-3 text-xs font-bold text-foreground hover:bg-card-border/20 transition-all cursor-pointer"
              >
                Volver
              </button>
              {selectedOrder.buyer?.phone ? (
                <a
                  href={`https://wa.me/549${selectedOrder.buyer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hola ${selectedOrder.buyer.name}, te contacto desde CompraVentaOnline por tu compra de ${selectedOrder.listings?.products?.name ?? "la publicación"}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-accent-green py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <span>💬</span> WhatsApp
                </a>
              ) : (
                <span className="rounded-xl border border-card-border py-3 text-xs font-bold text-text-muted text-center flex items-center justify-center">
                  Sin teléfono
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rate Buyer Modal */}
      {ratingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative rounded-3xl border border-card-border bg-card-bg-solid p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-5">
            <button
              onClick={() => setRatingOrder(null)}
              className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              ✕
            </button>
            <div className="text-left flex flex-col gap-2">
              <span className="text-2xl">⭐</span>
              <h3 className="font-heading text-lg font-extrabold text-foreground">Calificá a {ratingOrder.buyer?.name ?? "el comprador"}</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                ¿Cómo fue tu experiencia con este comprador? Tu calificación queda registrada en su perfil.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRatingValue(opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                    ratingValue === opt.value
                      ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                      : "border-card-border text-foreground hover:border-accent-gold/40"
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              rows={3}
              placeholder="Comentario opcional..."
              className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold resize-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRatingOrder(null)}
                className="rounded-xl border border-card-border py-3 text-xs font-bold text-foreground hover:bg-card-border/20 transition-all cursor-pointer"
              >
                Omitir por ahora
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={!ratingValue || ratingSubmitting}
                className="rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {ratingSubmitting ? "Enviando..." : "Enviar calificación"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
