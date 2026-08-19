"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Real order statuses (see 022_escrow_payments.sql):
// PENDING     -> checkout started, not paid yet
// PAID        -> bank-transfer order, seller self-confirmed receipt (no
//                escrow involved — money never touched the platform)
// EN_CUSTODIA -> Mercado Pago approved, funds held by the platform
// LIBERADO    -> buyer confirmed (or window lapsed) — seller gets paid
// DISPUTADO   -> buyer flagged a problem, admin is reviewing
// REEMBOLSADO -> admin sided with the buyer, payment refunded
// CANCELLED   -> checkout abandoned/failed
type OrderStatus = "PENDING" | "PAID" | "EN_CUSTODIA" | "LIBERADO" | "DISPUTADO" | "REEMBOLSADO" | "CANCELLED";

interface Order {
  id: string;
  amount: number;
  status: OrderStatus;
  payment_method: "MERCADOPAGO" | "TRANSFER";
  created_at: string;
  release_deadline: string | null;
  dispute_reason: string | null;
  currencies: { symbol: string } | null;
  listings: {
    id: string;
    image_url: string | null;
    products: { name: string; brand: string | null; images: string[] | null } | null;
    sellers: { name: string; phone: string | null } | null;
  } | null;
}

const STATUS_LABEL: Record<OrderStatus, { text: string; className: string }> = {
  PENDING: { text: "Pendiente de pago", className: "bg-text-muted/10 text-text-muted" },
  PAID: { text: "Pagado (transferencia)", className: "bg-accent-green/10 text-accent-green" },
  EN_CUSTODIA: { text: "Pago retenido — a resguardo", className: "bg-accent-gold/10 text-accent-gold" },
  LIBERADO: { text: "Liberado al vendedor", className: "bg-accent-green/10 text-accent-green" },
  DISPUTADO: { text: "En revisión por soporte", className: "bg-red-500/10 text-red-500" },
  REEMBOLSADO: { text: "Reembolsado", className: "bg-accent-blue/10 text-accent-blue" },
  CANCELLED: { text: "Cancelado", className: "bg-red-500/10 text-red-500" },
};

export default function PurchasesPage() {
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  useEffect(() => {
    async function loadOrders() {
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
            id, amount, status, payment_method, created_at, release_deadline, dispute_reason,
            currencies ( symbol ),
            listings (
              id, image_url,
              products ( name, brand, images ),
              sellers ( name, phone )
            )
          `)
          .eq("buyer_id", seller.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setOrders((data ?? []) as unknown as Order[]);
      } catch (err) {
        console.error("Error al cargar tus compras:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    const product = order.listings?.products;
    return (
      !q ||
      (product?.name ?? "").toLowerCase().includes(q) ||
      (product?.brand ?? "").toLowerCase().includes(q) ||
      (order.listings?.sellers?.name ?? "").toLowerCase().includes(q)
    );
  });

  const handleConfirmDelivery = async (order: Order) => {
    setConfirmingId(order.id);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm-delivery`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo confirmar la entrega.");
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "LIBERADO" } : o)));
      setSuccessMsg("¡Gracias! Confirmamos que recibiste el producto y liberamos el pago al vendedor.");
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo confirmar la entrega.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSubmitDispute = async () => {
    if (!disputeOrder || !disputeReason.trim()) return;
    setDisputeSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/orders/${disputeOrder.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar el reclamo.");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === disputeOrder.id ? { ...o, status: "DISPUTADO", dispute_reason: disputeReason.trim() } : o
        )
      );
      setSuccessMsg("Reclamo registrado. Nuestro equipo va a revisar el caso.");
      setDisputeOrder(null);
      setDisputeReason("");
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo registrar el reclamo.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col gap-8">

      <div className="flex flex-col gap-2 border-b border-card-border pb-6">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">Mis compras</h1>
        <p className="text-text-muted text-sm">
          Hacé el seguimiento de tus pedidos y confirmá cuando te llegue el producto para liberarle el pago al vendedor.
        </p>
      </div>

      {(successMsg || errorMsg) && (
        <div
          className={`rounded-xl p-4 text-xs font-semibold ${
            successMsg ? "bg-accent-green/10 text-accent-green" : "bg-red-500/10 text-red-500"
          }`}
        >
          {successMsg || errorMsg}
        </div>
      )}

      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-3 flex items-center text-sm text-text-muted select-none">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar compras por producto, marca o vendedor..."
          className="w-full bg-card-bg-solid border border-card-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
        />
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="py-20 text-center text-text-muted text-sm">Cargando tus compras...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-card-border rounded-3xl flex flex-col items-center gap-2 bg-card-bg-solid">
            <span className="text-4xl">🛍️</span>
            <h3 className="font-heading text-sm font-bold text-foreground mt-2">No encontramos compras</h3>
            <p className="text-text-muted text-sm">Todavía no tenés compras registradas.</p>
            <Link
              href="/search"
              className="mt-4 rounded-xl bg-accent-gold px-5 py-2.5 text-sm font-extrabold text-background shadow-md hover:opacity-90 transition-all"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const product = order.listings?.products;
            const seller = order.listings?.sellers;
            const image = order.listings?.image_url ?? product?.images?.[0] ?? null;
            const statusInfo = STATUS_LABEL[order.status];
            const symbol = order.currencies?.symbol ?? "$";

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-card-border bg-card-bg-solid p-5 flex flex-col gap-4 shadow-sm hover:border-card-border/80 transition-colors"
              >
                <div className="flex justify-between items-center border-b border-card-border/30 pb-3 text-xs text-text-muted">
                  <span>Comprado el {new Date(order.created_at).toLocaleDateString("es-AR")}</span>
                  <span className="font-mono">ID Compra: #{order.id.slice(0, 8).toUpperCase()}</span>
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
                        Vendedor: <span className="font-bold text-foreground/80">{seller?.name ?? "—"}</span>
                      </p>
                      {order.status === "EN_CUSTODIA" && order.release_deadline && (
                        <p className="text-[10px] text-text-muted italic">
                          Se libera automáticamente el {new Date(order.release_deadline).toLocaleDateString("es-AR")} si no confirmás ni reclamás antes.
                        </p>
                      )}
                      {order.status === "DISPUTADO" && order.dispute_reason && (
                        <p className="text-[10px] text-red-500 italic">Tu reclamo: &quot;{order.dispute_reason}&quot;</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end shrink-0">
                    <span className="text-xs text-text-muted uppercase font-semibold">Total abonado</span>
                    <span className="font-heading text-lg font-extrabold text-foreground mt-0.5">
                      {symbol} {Number(order.amount).toLocaleString("es-AR")}
                    </span>
                  </div>

                  <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-auto shrink-0 md:min-w-[170px]">
                    {order.status === "EN_CUSTODIA" && (
                      <>
                        <button
                          onClick={() => handleConfirmDelivery(order)}
                          disabled={confirmingId === order.id}
                          className="flex-1 md:w-full rounded-xl bg-gradient-to-r from-accent-green to-accent-green px-4 py-2.5 text-xs font-extrabold text-background shadow-sm hover:opacity-95 transition-all cursor-pointer text-center disabled:opacity-50"
                        >
                          {confirmingId === order.id ? "Confirmando..." : "✓ Recibí el producto"}
                        </button>
                        <button
                          onClick={() => setDisputeOrder(order)}
                          className="flex-1 md:w-full rounded-xl border border-red-500/30 text-red-500 px-4 py-2.5 text-xs font-bold hover:bg-red-500/5 transition-all cursor-pointer text-center"
                        >
                          Tengo un problema
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setSelectedOrder(order); setShowContactModal(true); }}
                      className="flex-1 md:w-full rounded-xl bg-card-bg border border-card-border px-4 py-2.5 text-xs font-bold text-foreground hover:text-accent-gold hover:border-accent-gold/30 transition-all cursor-pointer text-center"
                    >
                      Contactar vendedor
                    </button>
                    {order.listings?.id && (
                      <Link
                        href={`/listings/${order.listings.id}`}
                        className="flex-1 md:w-full rounded-xl border border-card-border px-4 py-2.5 text-xs font-bold text-foreground hover:text-accent-gold hover:border-accent-gold/30 transition-all text-center"
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

      {/* Contact Seller Modal */}
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
              <h3 className="font-heading text-lg font-extrabold text-foreground">Coordinación del Envío y Pago</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Comunicate de forma directa con el vendedor en La Pampa para acordar el lugar de entrega.
              </p>
            </div>
            <div className="rounded-2xl border border-card-border bg-background p-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-card-border/30 pb-2">
                <span className="text-text-muted">Vendedor:</span>
                <strong className="text-foreground">{selectedOrder.listings?.sellers?.name ?? "—"}</strong>
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
              {selectedOrder.listings?.sellers?.phone ? (
                <a
                  href={`https://wa.me/549${selectedOrder.listings.sellers.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hola ${selectedOrder.listings.sellers.name}, te contacto desde CompraVentaOnline por la compra de ${selectedOrder.listings.products?.name ?? "tu publicación"}`
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

      {/* Dispute Modal */}
      {disputeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative rounded-3xl border border-card-border bg-card-bg-solid p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <button
              onClick={() => { setDisputeOrder(null); setDisputeReason(""); }}
              className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              ✕
            </button>
            <div className="flex flex-col gap-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-heading text-lg font-extrabold text-foreground">¿Qué pasó con tu compra?</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                El pago queda congelado y nuestro equipo va a revisar el caso con vos y con el vendedor antes de
                decidir si se libera o se reembolsa.
              </p>
            </div>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              placeholder="Contanos qué pasó: no llegó el producto, llegó dañado, no es lo que compré..."
              className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold resize-none"
            />
            <button
              onClick={handleSubmitDispute}
              disabled={disputeSubmitting || !disputeReason.trim()}
              className="rounded-xl bg-red-500 py-3 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {disputeSubmitting ? "Enviando..." : "Enviar reclamo"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
