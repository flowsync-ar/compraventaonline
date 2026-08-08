"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CustomDropdown from "@/components/CustomDropdown";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Listing {
  id: string;
  price: number;
  condition: string;
  featured_plan: string;
  stock: number;
  image_url: string | null;
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
    type: string;
  } | null;
  currencies: {
    code: string;
    symbol: string;
    name: string;
  } | null;
}

interface Question {
  id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  sellers: { name: string } | null;
}

const mockListings: Record<string, Listing> = {
  l1: {
    id: "l1",
    price: 18500.0,
    condition: "NEW",
    featured_plan: "PREMIUM",
    stock: 25,
    image_url: null,
    products: {
      name: "Miel Orgánica Pura del Caldenal",
      brand: "Pampeana Alta",
      description: "Miel pura de abeja cosechada artesanalmente en la reserva del caldenal pampeano. Textura cremosa, sabor intenso y aroma a jarilla y flores silvestres. 100% natural, sin aditivos ni pasteurización.",
      images: ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=800&auto=format&fit=crop"],
      categories: { name: "Campo / Agro" },
    },
    sellers: { id: "s1", name: "Apicultura La Fusta", score: 98, tier: "PREMIUM", type: "BUSINESS_SELLER" },
    currencies: null,
  },
  l2: {
    id: "l2",
    price: 125000.0,
    condition: "NEW",
    featured_plan: "FEATURED",
    stock: 12,
    image_url: null,
    products: {
      name: "Taladro Percutor Bosch 500W",
      brand: "Bosch",
      description: "Taladro percutor Bosch GSB 13 RE Professional. Potente motor de 500 W, ideal para mampostería, madera y metal.",
      images: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=800&auto=format&fit=crop"],
      categories: { name: "Construcción" },
    },
    sellers: { id: "s2", name: "Ferretería El Pampeano", score: 95, tier: "GOLD", type: "BUSINESS_SELLER" },
    currencies: null,
  },
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"desc" | "seller">("desc");

  // Payment Simulator States
  const [isPaid, setIsPaid] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Interactive Modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Contact Form States
  const [contactMsg, setContactMsg] = useState("Hola! Estoy interesado en tu publicación. ¿Sigue disponible?");
  const [contactSuccess, setContactSuccess] = useState(false);

  // Questions list state
  const [questions, setQuestions] = useState<Question[]>([]);

  // Report Form States
  const [reportReason, setReportReason] = useState("FRAUD");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");

  // Cart integration
  const [addedToCart, setAddedToCart] = useState(false);

  // Favorites Integration
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  // Active main image
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);

  // Seller phone — only fetched (and only fetchable, per RLS) for logged-in users
  const [sellerPhone, setSellerPhone] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();

    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;

    async function fetchListing() {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(`
            id,
            price,
            condition,
            featured_plan,
            stock,
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
              name,
              score,
              tier,
              type
            ),
            currencies (
              code,
              symbol,
              name
            )
          `)
          .eq("id", id)
          .single();

        if (error || !data) {
          const fallback = mockListings[id] || mockListings.l1;
          setListing(fallback);
          setActiveImage(fallback.products?.images?.[0] ?? null);
        } else {
          const row = data as unknown as Listing;
          setListing(row);
          setActiveImage(row.image_url ?? row.products?.images?.[0] ?? null);
        }
      } catch {
        const fallback = mockListings[id] || mockListings.l1;
        setListing(fallback);
        setActiveImage(fallback.products?.images?.[0] ?? null);
      } finally {
        setLoading(false);
      }
    }

    async function fetchQuestions() {
      const supabase = getSupabase();
      try {
        const { data } = await supabase
          .from("questions")
          .select(`
            id,
            question,
            answer,
            answered_at,
            created_at,
            sellers ( name )
          `)
          .eq("listing_id", id)
          .order("created_at", { ascending: true });

        if (data) setQuestions(data as unknown as Question[]);
      } catch (err) {
        console.error("Error fetching questions:", err);
      }
    }

    fetchListing();
    fetchQuestions();
  }, [id]);

  // Check if listing is favorited
  useEffect(() => {
    if (!userId || !id) return;

    async function checkFavoriteStatus() {
      const supabase = getSupabase();
      try {
        const { data } = await supabase
          .from("favorites")
          .select("id")
          .eq("listing_id", id)
          .eq("user_id", userId!)
          .maybeSingle();

        setIsFavorite(!!data);
      } catch (err) {
        console.error("Error checking favorite status:", err);
      }
    }

    checkFavoriteStatus();
  }, [userId, id]);

  // Fetch the seller's real phone — only possible while logged in (RLS
  // revokes SELECT on sellers.phone for anon).
  useEffect(() => {
    const sellerId = listing?.sellers?.id;
    if (!userId || !sellerId) return;

    async function fetchSellerPhone() {
      const supabase = getSupabase();
      try {
        const { data } = await supabase
          .from("sellers")
          .select("phone")
          .eq("id", sellerId!)
          .single();

        setSellerPhone(data?.phone ?? null);
      } catch (err) {
        console.error("Error fetching seller phone:", err);
      }
    }

    fetchSellerPhone();
  }, [userId, listing?.sellers?.id]);

  const handleToggleFavorite = async () => {
    if (!userId) {
      router.push("/login?redirect=" + encodeURIComponent(`/listings/${id}`));
      return;
    }

    const supabase = getSupabase();
    try {
      setLoadingFavorite(true);
      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("listing_id", id)
          .eq("user_id", userId);
        setIsFavorite(false);
      } else {
        await supabase
          .from("favorites")
          .insert({ listing_id: id, user_id: userId });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleAddToCart = () => {
    if (!listing) return;

    const savedCart = localStorage.getItem("cart");
    let cart: { id: string; name: string; price: number; quantity: number }[] = [];
    if (savedCart) {
      try {
        cart = JSON.parse(savedCart);
      } catch (e) {}
    }

    const productName = listing.products?.name ?? "Producto";
    const existingIndex = cart.findIndex((item) => item.id === listing.id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ id: listing.id, name: productName, price: listing.price, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-change"));

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from("questions")
        .insert({
          listing_id: id,
          question: contactMsg,
          user_id: userId,
        });

      if (error) throw error;

      setContactSuccess(true);

      // Refresh questions
      const { data } = await supabase
        .from("questions")
        .select(`id, question, answer, answered_at, created_at, sellers ( name )`)
        .eq("listing_id", id)
        .order("created_at", { ascending: true });

      if (data) setQuestions(data as unknown as Question[]);

      setTimeout(() => {
        setContactSuccess(false);
        setShowContactModal(false);
        setContactMsg("Hola! Estoy interesado en tu publicación. ¿Sigue disponible?");
      }, 2500);
    } catch (err) {
      alert("Hubo un error al enviar la consulta. Por favor intentalo nuevamente.");
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError("");

    const supabase = getSupabase();
    try {
      await supabase
        .from("product_reports")
        .insert({
          listing_id: id,
          reason: reportReason,
          details: reportDetails,
          user_id: userId,
        });

      setReportSuccess(true);
    } catch {
      setReportSuccess(true); // Graceful UX fallback
    }

    setTimeout(() => {
      setReportSuccess(false);
      setShowReportModal(false);
      setReportDetails("");
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-gold border-t-transparent"></div>
          <span className="text-sm font-semibold text-text-muted">Cargando publicación pampeana...</span>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <span className="text-5xl">🌾</span>
        <h2 className="font-heading text-2xl font-bold text-foreground mt-4">Publicación no encontrada</h2>
        <p className="text-text-muted text-sm mt-2">La oferta que estás buscando no existe o ya caducó.</p>
        <Link href="/search" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-6 py-3 text-xs font-bold text-background shadow-md">
          Volver al buscador
        </Link>
      </div>
    );
  }

  const product = listing.products;
  const seller = listing.sellers;
  const images = product?.images ?? [];
  const mainImage = activeImage ?? images[0] ?? "/placeholder.png";

  const getTierBadge = (tier: string) => {
    switch (tier.toUpperCase()) {
      case "PREMIUM":
        return "bg-accent-gold/15 text-accent-gold border-accent-gold/30";
      case "GOLD":
      case "ORO":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "PLATA":
      case "SILVER":
        return "bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/30";
      default:
        return "bg-orange-800/15 text-orange-700 dark:text-orange-300 border-orange-800/30";
    }
  };

  const currencySymbol = listing.currencies?.symbol ?? "$";

  // sellerPhone is whatever the seller typed at registration — strip non-digits
  // and make sure it carries the AR country code that wa.me expects.
  const sellerPhoneDigits = sellerPhone?.replace(/\D/g, "") ?? "";
  const sellerWhatsAppNumber = sellerPhoneDigits
    ? sellerPhoneDigits.startsWith("549")
      ? sellerPhoneDigits
      : `549${sellerPhoneDigits.replace(/^54/, "")}`
    : null;

  const formattedWhatsAppUrl = sellerWhatsAppNumber
    ? `https://wa.me/${sellerWhatsAppNumber}?text=${encodeURIComponent(
        `Hola! Te contacto desde CompraVentaOnline.com.ar por el artículo "${product?.name}" (${currencySymbol}${Number(listing.price).toLocaleString("es-AR")}). Sigue disponible?`
      )}`
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-8">
        <Link href="/" className="hover:text-accent-gold transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/search" className="hover:text-accent-gold transition-colors">Buscar</Link>
        <span>/</span>
        <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-xs">{product?.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Left Column: Image and Info */}
        <div className="lg:col-span-7 flex flex-col gap-8">

          {/* Main Product Image Container */}
          <div className="rounded-3xl overflow-hidden bg-card-bg border border-card-border p-3 shadow-xl relative aspect-[4/3] flex items-center justify-center group">
            {listing.featured_plan === "PREMIUM" && (
              <span className="absolute top-6 left-6 z-10 rounded-xl bg-accent-gold px-3.5 py-1 text-xs font-extrabold tracking-wider text-background shadow-md uppercase">
                💎 Premium Pampeano
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage}
              alt={product?.name ?? "Producto"}
              className="rounded-2xl object-cover h-full w-full max-h-[500px] transition-transform duration-500 group-hover:scale-[1.01]"
            />
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 -mt-4">
              {images.map((img, idx) => {
                const isSelected = activeImage ? activeImage === img : idx === 0;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`h-16 w-16 rounded-xl overflow-hidden border-2 bg-card-bg cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 ${
                      isSelected ? "border-accent-gold shadow-md" : "border-card-border hover:border-accent-gold/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`${product?.name} miniatura ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Interactive Information Tabs */}
          <div className="rounded-2xl bg-card-bg border border-card-border p-6 shadow-md">
            <div className="flex border-b border-card-border pb-4 mb-4 gap-6">
              <button
                onClick={() => setActiveTab("desc")}
                className={`text-xs font-extrabold uppercase tracking-wider pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "desc" ? "border-accent-gold text-accent-gold" : "border-transparent text-text-muted hover:text-foreground"
                }`}
              >
                Descripción
              </button>
              <button
                onClick={() => setActiveTab("seller")}
                className={`text-xs font-extrabold uppercase tracking-wider pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "seller" ? "border-accent-gold text-accent-gold" : "border-transparent text-text-muted hover:text-foreground"
                }`}
              >
                Sobre el Vendedor
              </button>
            </div>

            {activeTab === "desc" ? (
              <div className="text-xs text-foreground/90 leading-relaxed space-y-4">
                <p className="whitespace-pre-line">{product?.description}</p>
                <div className="border-t border-card-border/50 pt-4 mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-text-muted block uppercase">Marca</span>
                    <strong className="text-sm font-semibold">{product?.brand}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block uppercase">Categoría</span>
                    <strong className="text-sm font-semibold">{product?.categories?.name}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{seller?.name}</h4>
                    <span className="text-[10px] text-text-muted mt-0.5 block">
                      Tipo: {seller?.type === "BUSINESS_SELLER" ? "Comercio Registrado" : "Vendedor Particular"}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${getTierBadge(seller?.tier ?? "")}`}>
                    Nivel {seller?.tier}
                  </span>
                </div>

                <div className="border-t border-card-border/50 pt-4 mt-2">
                  <div className="flex justify-between items-center text-xs font-bold text-foreground mb-1">
                    <span>Score de Reputación</span>
                    <span className="text-accent-gold">{seller?.score ?? 0} / 100</span>
                  </div>
                  <div className="w-full bg-card-border h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-accent-gold to-accent-green h-full rounded-full"
                      style={{ width: `${seller?.score ?? 0}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-text-muted mt-2">
                    Las calificaciones se actualizan dinámicamente según la satisfacción del comprador pampeano.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sección de Preguntas y Respuestas */}
          <div className="rounded-3xl bg-card-bg border border-card-border p-6 shadow-xl flex flex-col gap-6 animate-in fade-in duration-200">
            <h3 className="font-heading text-base font-extrabold text-foreground border-b border-card-border pb-3 flex items-center gap-2">
              <span>💬</span> Preguntas y respuestas
            </h3>

            <div className="flex flex-col gap-4">
              {questions.length === 0 ? (
                <p className="text-xs text-text-muted">Aún no se hicieron preguntas en esta publicación. ¡Sé el primero en consultar!</p>
              ) : (
                <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {questions.map((q) => (
                    <div key={q.id} className="flex flex-col gap-2 text-xs border-b border-card-border/50 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-foreground leading-relaxed">
                          <span className="text-text-muted font-bold block mb-1 text-[10px]">{q.sellers?.name ?? "Comprador"}:</span>
                          {q.question}
                        </p>
                        <span className="text-[9px] text-text-muted shrink-0">
                          {new Date(q.created_at).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                      {q.answer ? (
                        <div className="bg-card-bg-solid/40 border-l-2 border-accent-gold pl-3 py-2 rounded-r-xl flex flex-col gap-1 mt-1">
                          <p className="text-text-muted leading-relaxed">
                            <span className="text-accent-gold font-bold block text-[9.5px] uppercase tracking-wider">Respuesta del vendedor:</span>
                            {q.answer}
                          </p>
                          {q.answered_at && (
                            <span className="text-[8px] text-text-muted/80 self-end">
                              {new Date(q.answered_at).toLocaleDateString("es-AR")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] text-yellow-500/80 italic">Aún sin responder</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Local Advertising Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-accent-gold/10 to-accent-green/10 border border-accent-gold/20 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <span className="text-3xl">🌾</span>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="font-heading text-xs font-extrabold text-accent-gold uppercase tracking-wider">Publicidad Local de La Pampa</h4>
              <p className="text-xs text-foreground font-bold mt-1">¿Querés que tu comercio aparezca acá?</p>
              <p className="text-[10px] text-text-muted mt-0.5">Llegá a miles de pampeanos diariamente. Anunciá con nosotros.</p>
            </div>
            <Link href="/dashboard" className="rounded-xl border border-accent-gold/30 hover:border-accent-gold px-4 py-2 text-[10px] font-extrabold text-accent-gold hover:bg-accent-gold/5 transition-all">
              Saber más
            </Link>
          </div>

        </div>

        {/* Right Column: Transaction Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Main Transaction Glass Card */}
          <div className="rounded-3xl bg-card-bg border border-card-border p-8 shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase">
              <span className={`px-2 py-0.5 rounded ${listing.condition === "NEW" ? "bg-accent-green/15 text-accent-green" : "bg-text-muted/15 text-text-muted"}`}>
                {listing.condition === "NEW" ? "Producto Nuevo" : "Producto Usado"}
              </span>
              <span>Stock: {listing.stock} unidades</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <h1 className="font-heading text-2xl font-extrabold text-foreground leading-tight flex-1">
                {product?.name}
              </h1>
              <button
                onClick={handleToggleFavorite}
                disabled={loadingFavorite}
                className={`shrink-0 p-2 rounded-full border transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                  isFavorite
                    ? "bg-red-500/10 border-red-500/20 text-red-500 animate-pulse"
                    : "bg-card-bg border-card-border text-text-muted hover:text-red-500 hover:border-red-500/30"
                }`}
                title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>

            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-sm font-semibold text-accent-gold">{currencySymbol}</span>
              <span className="text-3xl font-extrabold text-foreground">
                {Number(listing.price).toLocaleString("es-AR")}
              </span>
            </div>

            <div className="rounded-xl bg-background/50 border border-card-border p-4 flex gap-3 text-xs leading-relaxed">
              <span className="text-lg">🛡️</span>
              <div>
                <strong className="text-foreground font-semibold block">Trato directo y seguro</strong>
                <span className="text-text-muted block text-[10px] mt-0.5">
                  Coordiná el pago y el retiro personalmente. Te sugerimos encontrarte en puntos públicos.
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 mt-4">
              {isPaid ? (
                <>
                  <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-2xl p-4 text-xs font-medium text-center animate-in fade-in duration-300">
                    ✓ ¡Pago acreditado con éxito! Comunicate con el vendedor por WhatsApp para coordinar el envío.
                  </div>
                  {formattedWhatsAppUrl ? (
                    <a
                      href={formattedWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full rounded-xl bg-gradient-to-r from-accent-green to-emerald-600 px-6 py-4 text-xs font-extrabold text-white text-center shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>💬 Contactar por WhatsApp</span>
                    </a>
                  ) : (
                    <p className="text-xs text-text-muted text-center">
                      El vendedor no cargó un celular de contacto. Usá &quot;Preguntar al Vendedor&quot; para coordinar.
                    </p>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    className={`rounded-xl px-4 py-4 text-xs font-extrabold text-center shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      addedToCart
                        ? "bg-accent-green text-background border border-accent-green/30"
                        : "bg-gradient-to-r from-accent-gold to-accent-gold-hover text-background"
                    }`}
                  >
                    {addedToCart ? <><span>✓</span> ¡Agregado!</> : <><span>🛒</span> Agregar al Carrito</>}
                  </button>
                  <button
                    onClick={() => {
                      if (!userId) {
                        router.push("/login?redirect=" + encodeURIComponent(`/listings/${id}`));
                      } else {
                        setShowCheckoutModal(true);
                      }
                    }}
                    className="rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 px-4 py-4 text-xs font-extrabold text-white text-center shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⚡</span> Comprar Ahora
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  if (!userId) {
                    router.push("/login?redirect=" + encodeURIComponent(`/listings/${id}`));
                  } else {
                    setShowContactModal(true);
                  }
                }}
                className="w-full rounded-xl bg-card-bg border border-card-border px-6 py-4 text-xs font-bold text-foreground text-center shadow-sm hover:scale-[1.01] transition-all cursor-pointer"
              >
                Preguntar al Vendedor
              </button>
            </div>

            <div className="border-t border-card-border pt-5 flex justify-between items-center text-[10px] text-text-muted font-semibold">
              <span>Publicado por {seller?.name}</span>
              <button
                onClick={() => setShowReportModal(true)}
                className="text-red-500 hover:underline transition-all cursor-pointer"
              >
                🚩 Denunciar publicación
              </button>
            </div>

          </div>

          {/* Seller Trust Box */}
          <div className="rounded-2xl bg-card-bg border border-card-border p-6 shadow-md flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-gold to-accent-green flex items-center justify-center text-white text-lg font-bold shadow-lg">
              {(seller?.name ?? "V").charAt(0)}
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-foreground">{seller?.name}</h4>
              <span className="text-[10px] text-text-muted block mt-0.5">Vendedor nivel {seller?.tier}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-accent-gold block">★ {((seller?.score ?? 0) / 10).toFixed(1)}</span>
              <span className="text-[8px] text-text-muted block uppercase">Puntaje pampeano</span>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: PREGUNTAR AL VENDEDOR */}
      {showContactModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-card-bg border border-card-border p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-foreground text-lg cursor-pointer">✕</button>
            <h3 className="font-heading text-lg font-bold text-foreground mb-6">Preguntar al Vendedor</h3>

            {contactSuccess ? (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 text-xs font-medium text-accent-green text-center my-6">
                ¡Pregunta enviada con éxito! El vendedor te responderá a la brevedad.
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Tu Consulta</label>
                  <textarea
                    rows={4}
                    required
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    placeholder="Escribí tu pregunta sobre este producto..."
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold resize-none"
                  />
                </div>
                <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-4 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all mt-2 cursor-pointer">
                  Enviar Pregunta
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: DENUNCIAR PUBLICACIÓN */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-card-bg border border-card-border p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-foreground text-lg cursor-pointer">✕</button>
            <h3 className="font-heading text-lg font-bold text-foreground mb-6">Denunciar Publicación</h3>

            {reportSuccess ? (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 text-xs font-medium text-accent-green text-center my-6">
                ¡Gracias! Tu reporte fue enviado al equipo de moderación comunitaria.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Motivo de la Denuncia</label>
                  <CustomDropdown
                    name="reason"
                    defaultValue={reportReason}
                    onChange={setReportReason}
                    options={[
                      { name: "Sospecha de estafa o fraude", value: "FRAUD" },
                      { name: "Producto prohibido / ilegal", value: "ILLEGAL" },
                      { name: "Contenido ofensivo o violento", value: "OFFENSIVE" },
                      { name: "Artículo falso o engañoso", value: "FAKE" },
                      { name: "Otro motivo", value: "OTHER" },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Detalles adicionales</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Contanos brevemente por qué considerás no permitida esta publicación..."
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold resize-none"
                  />
                </div>
                {reportError && <p className="text-xs text-red-500 font-semibold">{reportError}</p>}
                <button type="submit" className="w-full rounded-xl bg-red-600 hover:bg-red-700 py-4 text-xs font-extrabold text-white shadow-md transition-all mt-2 cursor-pointer">
                  Enviar Denuncia
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: SIMULAR PAGO */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-card-bg border border-card-border p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col gap-6">
            <button onClick={() => setShowCheckoutModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-foreground text-lg cursor-pointer">✕</button>

            <div className="text-left">
              <h3 className="font-heading text-lg font-extrabold text-foreground">Completar Compra</h3>
              <p className="text-text-muted text-xs mt-1">Simulá el pago seguro del producto para habilitar el contacto por WhatsApp.</p>
            </div>

            <div className="rounded-2xl bg-background border border-card-border p-4 flex items-center gap-3 text-xs">
              <div className="h-12 w-12 rounded-lg overflow-hidden border border-card-border shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mainImage} alt={product?.name ?? "Producto"} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="font-bold text-foreground truncate">{product?.name}</h4>
                <span className="text-text-muted text-[10px] block">Vendedor: {seller?.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-extrabold text-foreground">{currencySymbol}{Number(listing.price).toLocaleString("es-AR")}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-300 p-4 text-xs leading-relaxed text-left flex flex-col gap-1.5 animate-in fade-in duration-200">
              <strong className="font-extrabold flex items-center gap-1 text-[11px] uppercase tracking-wider">⚠️ Importante: Compromiso de Compra</strong>
              <p className="text-[10px] text-text-muted dark:text-slate-300">
                Al realizar la compra de este producto asumís un <span className="font-bold text-foreground">compromiso de compra firme</span>.
              </p>
            </div>

            <div className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-foreground">Medio de Pago</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-accent-gold bg-accent-gold/5 rounded-xl p-3 flex flex-col gap-1 cursor-pointer select-none text-xs">
                    <span className="font-bold text-accent-gold">💳 Tarjeta</span>
                    <span className="text-[10px] text-text-muted">Crédito o Débito</span>
                  </div>
                  <div className="border border-card-border hover:border-accent-gold/40 rounded-xl p-3 flex flex-col gap-1 cursor-pointer select-none opacity-50 text-xs">
                    <span className="font-bold text-foreground">🏦 Transferencia</span>
                    <span className="text-[10px] text-text-muted">CBU / Alias</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-foreground">Número de Tarjeta (Simulado)</label>
                <input type="text" disabled value="••••  ••••  ••••  5829" className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 text-xs text-foreground cursor-not-allowed" />
              </div>

              <div className="flex justify-between items-center border-t border-card-border/30 pt-4 mt-2">
                <span className="text-xs text-text-muted">Total a Pagar:</span>
                <span className="font-heading text-lg font-extrabold text-accent-gold">
                  {currencySymbol}{Number(listing.price).toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                setPaymentLoading(true);
                setTimeout(() => {
                  setPaymentLoading(false);
                  setIsPaid(true);
                  setShowCheckoutModal(false);
                }, 1500);
              }}
              disabled={paymentLoading}
              className="w-full rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 py-4 text-xs font-extrabold text-white shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {paymentLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando pago...
                </>
              ) : (
                `Pagar ${currencySymbol}${Number(listing.price).toLocaleString("es-AR")}`
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
