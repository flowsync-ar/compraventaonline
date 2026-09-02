"use client";

import { useEffect, useLayoutEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CustomDropdown from "@/components/CustomDropdown";
import SellerAvatar from "@/components/SellerAvatar";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAncestors, type CategoryNode } from "@/lib/categories";
import { getOrCreateVisitorId } from "@/lib/visitorId";
import RichTextDisplay from "@/components/RichTextDisplay";
import { communityLanguageRejection, flaggedLanguageTerms } from "@/lib/communityLanguage";
import LanguageHighlightField from "@/components/LanguageHighlightField";
import { trackEvent } from "@/lib/analytics";

interface Listing {
  id: string;
  price: number;
  condition: string;
  featured_plan: string;
  status: string;
  stock: number;
  image_url: string | null;
  products: {
    name: string;
    brand: string;
    description: string;
    images: string[] | null;
    categories: { id: string; name: string; slug: string } | null;
  } | null;
  sellers: {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    score: number;
    tier: string;
    type: string;
    bio: string | null;
    location: string | null;
    mercadopago_connected: boolean;
    bank_cbu: string | null;
    bank_alias: string | null;
  } | null;
  currencies: {
    code: string;
    symbol: string;
    name: string;
  } | null;
}

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

  // Next keeps the previous page's scroll (search/home) because this is a
  // client page inside a shared layout. Land at the top of the ficha —
  // photos and title — not halfway down in the description.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id, loading]);

  // Checkout / Payment States
  const [isPaid, setIsPaid] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // Interactive Modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showSellerModal, setShowSellerModal] = useState(false);

  // Contact Form States
  const [contactMsg, setContactMsg] = useState("Hola! Estoy interesado en tu publicación. ¿Sigue disponible?");
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");

  // Questions list state

  // Report Form States
  const [reportReason, setReportReason] = useState("FRAUD");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");
  const [priceRespectLabel, setPriceRespectLabel] = useState<string | null>(null);

  // Cart integration
  const [addedToCart, setAddedToCart] = useState(false);

  // Favorites Integration
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  // Active main image
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Fullscreen image carousel modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  // The seller row of the logged-in user acting as buyer here — favorites,
  // questions and product_reports all key off sellers.id (buyer_id /
  // seller_id / reporter_id), never off the raw auth user id.
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);

  // Seller phone — only fetched (and only fetchable, per RLS) for logged-in users
  const [sellerPhone, setSellerPhone] = useState<string | null>(null);

  // The logged-in buyer's own contact info — shown back to them in the
  // order-confirmed modal so they know exactly what the seller now sees.
  const [buyerContact, setBuyerContact] = useState<{ name: string; phone: string | null; email: string | null } | null>(null);

  // Full category path (root-first, e.g. Alimentos y Bebidas > Bebidas >
  // Vinos y Espumantes) for the breadcrumb — resolved once the listing's
  // own category id is known.
  // Raw category tree (fetched once, in parallel with the listing itself —
  // NOT triggered by listing.products.categories.id resolving, which was
  // causing the breadcrumb to render short ("Inicio / Producto") and then
  // visibly "jump" to the full chain a moment later). categoryPath below is
  // a synchronous derivation from this + the listing, so it only ever
  // renders in its final form, never a partial one.
  const [allCategories, setAllCategories] = useState<CategoryNode[]>([]);

  useEffect(() => {
    const supabase = getSupabase();

    async function resolveSellerId(uid: string, email: string | null) {
      try {
        const { data } = await supabase.from("sellers").select("id, name, phone, identity_verified").eq("user_id", uid).single();
        setSellerId(data?.id ?? null);
        setBuyerContact(data ? { name: data.name, phone: data.phone, email } : null);
        setIdentityVerified(!!data?.identity_verified);
      } catch (err) {
        console.error("Error resolving seller id:", err);
        setSellerId(null);
        setBuyerContact(null);
        setIdentityVerified(false);
      }
    }

    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) resolveSellerId(uid, session?.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        resolveSellerId(uid, session?.user?.email ?? null);
      } else {
        setSellerId(null);
        setBuyerContact(null);
        setIdentityVerified(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Records one "view" for this listing (seller-visibility metric in "Mis
  // Publicaciones"), deduped server-side by visitor+day — see
  // listing_views migration. Fire-and-forget, mirrors SiteChrome's
  // track-visit beacon; a dropped request must never affect the page.
  useEffect(() => {
    if (!id) return;
    fetch(`/api/listings/${id}/track-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: getOrCreateVisitorId() }),
      keepalive: true,
    }).catch(() => {
      // best-effort — a dropped beacon shouldn't surface anywhere
    });
  }, [id]);

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
            status,
            stock,
            image_url,
            products (
              name,
              brand,
              description,
              images,
              categories ( id, name, slug )
            ),
            sellers (
              id,
              name,
              username,
              avatar_url,
              score,
              tier,
              type,
              bio,
              location,
              mercadopago_connected,
              bank_cbu,
              bank_alias
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
          if (error) console.error("[listing] Error fetching listing:", error.message);
          setListing(null);
        } else {
          const row = data as unknown as Listing;
          setListing(row);
          setActiveImage(row.image_url ?? row.products?.images?.[0] ?? null);
          const sellerRowId = row.sellers?.id;
          if (sellerRowId) {
            fetch(`/api/sellers/${sellerRowId}/price-reputation`)
              .then((res) => res.json())
              .then((rep: { label?: string | null }) => {
                setPriceRespectLabel(rep.label ?? null);
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error("[listing] Unexpected error fetching listing:", err);
        setListing(null);
      } finally {
        setLoading(false);
      }
    }

    // Fired alongside fetchListing (not chained after it, not waiting on
    // any piece of listing data) — both requests go out together on mount,
    // so the breadcrumb below only ever renders once, in its final form.
    async function fetchCategories() {
      const supabase = getSupabase();
      try {
        const { data } = await supabase.from("categories").select("id, name, slug, parent_id");
        if (data) setAllCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    }

    fetchListing();
    fetchCategories();
  }, [id]);

  // Full category breadcrumb (root-first) for the product's own category —
  // a synchronous derivation, not its own fetch: both pieces of data it
  // needs (listing, allCategories) come from the parallel fetches above.
  const categoryPath = useMemo<CategoryNode[]>(() => {
    const categoryId = listing?.products?.categories?.id;
    if (!categoryId || allCategories.length === 0) return [];

    const ancestors = getAncestors(allCategories, categoryId);
    const self = allCategories.find((c) => c.id === categoryId);
    return [...ancestors, ...(self ? [self] : [])];
  }, [listing, allCategories]);

  // Buyer clicked "Comprar Ahora" while logged out, got sent to
  // /login?redirect=/listings/[id]?buy=1, and is now back here logged in —
  // reopen the checkout modal instead of making them click it again.
  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("buy") !== "1") return;
    window.history.replaceState({}, "", window.location.pathname);
    setShowCheckoutModal(true);
  }, [userId]);

  // Rehydrate "already committed to buy" from a real order — otherwise
  // isPaid only ever gets set right after confirming in this same session,
  // so a buyer who reopens the page later would keep seeing "Comprar
  // Ahora" despite already having confirmed a purchase.
  // MUST filter by buyer_id: without it, a seller viewing their OWN sold
  // listing also matched this query (RLS lets a seller read their own
  // orders too) and incorrectly saw the buyer-facing "confirmaste tu
  // compra" message on their own product.
  useEffect(() => {
    if (!sellerId || !id) return;

    async function checkExistingOrder() {
      const supabase = getSupabase();
      try {
        const { data } = await supabase
          .from("orders")
          .select("id")
          .eq("listing_id", id)
          .eq("buyer_id", sellerId)
          .neq("status", "CANCELLED")
          .limit(1)
          .maybeSingle();

        if (data) setIsPaid(true);
      } catch (err) {
        console.error("Error checking existing order:", err);
      }
    }

    checkExistingOrder();
  }, [sellerId, id]);

  // Seller viewing their OWN sold listing — fetch who bought it so we can
  // show "felicitaciones, comunicate con el comprador" instead of the
  // buyer-facing messaging.
  const [soldToBuyer, setSoldToBuyer] = useState<{ name: string; phone: string | null } | null>(null);
  const isOwnSoldListing = !!sellerId && listing?.sellers?.id === sellerId && listing?.status === "SOLD";
  useEffect(() => {
    if (!isOwnSoldListing || !id) return;

    async function fetchBuyer() {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, paid_at, buyer:sellers!orders_buyer_id_fkey(name, phone)")
          .eq("listing_id", id)
          .eq("status", "PAID")
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        const buyer = (data as unknown as { buyer: { name: string; phone: string | null } | null } | null)?.buyer;
        if (buyer) setSoldToBuyer(buyer);
      } catch (err) {
        console.error("Error fetching buyer info:", err);
      }
    }

    fetchBuyer();
  }, [isOwnSoldListing, id]);

  // Check if listing is favorited
  useEffect(() => {
    if (!sellerId || !id) return;

    async function checkFavoriteStatus() {
      const supabase = getSupabase();
      try {
        const { data } = await supabase
          .from("favorites")
          .select("id")
          .eq("listing_id", id)
          .eq("seller_id", sellerId!)
          .maybeSingle();

        setIsFavorite(!!data);
      } catch (err) {
        console.error("Error checking favorite status:", err);
      }
    }

    checkFavoriteStatus();
  }, [sellerId, id]);

  // Fetch the seller's real phone — only possible while logged in (RLS
  // revokes SELECT on sellers.phone for anon).
  useEffect(() => {
    // The listing owner's seller id — unrelated to the `sellerId` state
    // above, which is the logged-in buyer's own seller row.
    const listingSellerId = listing?.sellers?.id;
    if (!userId || !listingSellerId) return;

    async function fetchSellerPhone() {
      const supabase = getSupabase();
      try {
        const { data } = await supabase
          .from("sellers")
          .select("phone")
          .eq("id", listingSellerId!)
          .single();

        setSellerPhone(data?.phone ?? null);
      } catch (err) {
        console.error("Error fetching seller phone:", err);
      }
    }

    fetchSellerPhone();
  }, [userId, listing?.sellers?.id]);

  // Keyboard navigation for the image carousel modal
  useEffect(() => {
    if (!showImageModal) return;

    const images = listing?.products?.images ?? [];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowImageModal(false);
      if (e.key === "ArrowRight") setModalImageIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setModalImageIndex((i) => (i - 1 + images.length) % images.length);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showImageModal, listing?.products?.images]);

  const handleToggleFavorite = async () => {
    if (!userId) {
      router.push("/login?redirect=" + encodeURIComponent(`/listings/${id}`));
      return;
    }
    if (!sellerId) return;

    const supabase = getSupabase();
    try {
      setLoadingFavorite(true);
      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("listing_id", id)
          .eq("seller_id", sellerId);
        setIsFavorite(false);
      } else {
        await supabase
          .from("favorites")
          .insert({ listing_id: id, seller_id: sellerId });
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
    let cart: { id: string; name: string; price: number; quantity: number; currencySymbol: string }[] = [];
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
      cart.push({ id: listing.id, name: productName, price: listing.price, quantity: 1, currencySymbol });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-change"));

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleCheckout = async () => {
    if (!listing || !acceptedTerms) return;
    setOrderError("");
    setPaymentLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderError(data.error ?? "No se pudo procesar la compra.");
        return;
      }

      setOrderConfirmed(true);
      setIsPaid(true);
    } catch (err) {
      console.error("[listing] checkout error:", err);
      setOrderError("No se pudo procesar la compra. Intentá de nuevo.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Public "share this listing" — any visitor, not just the seller. Uses
  // the native share sheet on mobile (WhatsApp/Instagram/whatever's
  // installed); desktop browsers mostly don't implement navigator.share,
  // so there it just copies the link with a quick "¡Copiado!" confirmation
  // instead of silently failing.
  const handleShareListing = async () => {
    const url = window.location.href;
    const title = product?.name ?? "Publicación en CompraVentaOnline";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the share sheet — not an error, do nothing.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar el enlace:", err);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) return;
    setContactError("");
    const languageError = communityLanguageRejection(contactMsg);
    if (languageError) {
      setContactError(languageError);
      return;
    }

    const supabase = getSupabase();
    try {
      const { data: inserted, error } = await supabase
        .from("questions")
        .insert({
          listing_id: id,
          question: contactMsg,
          buyer_id: sellerId,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (inserted) {
        fetch(`/api/questions/${inserted.id}/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "asked" }),
        }).catch(() => {});
      }

      setContactSuccess(true);

      setTimeout(() => {
        setContactSuccess(false);
        setShowContactModal(false);
        setContactMsg("Hola! Estoy interesado en tu publicación. ¿Sigue disponible?");
      }, 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hubo un error al enviar la consulta. Por favor intentalo nuevamente.";
      alert(message);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError("");

    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from("product_reports")
        .insert({
          listing_id: id,
          reason: reportReason as "SPAM" | "FRAUD" | "INAPPROPRIATE" | "DUPLICATE" | "OTHER" | "MISLEADING_PRICE",
          details: reportDetails,
          reporter_id: sellerId,
        });

      if (error) {
        if (error.code === "23505") {
          setReportError("Ya reportaste esta publicación.");
          return;
        }
        setReportError("No se pudo enviar el reporte. Intentá de nuevo.");
        return;
      }

      if (reportReason === "MISLEADING_PRICE") {
        trackEvent("price_report_created");
      }

      setReportSuccess(true);
    } catch {
      setReportError("No se pudo enviar el reporte. Intentá de nuevo.");
      return;
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
        <Link href="/search" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-6 py-3 text-xs font-bold text-white shadow-md">
          Volver al buscador
        </Link>
      </div>
    );
  }

  const product = listing.products;
  const seller = listing.sellers;
  // Tier BRONCE is the DB default for 0 pts. Only show a level after they
  // earned points (ratings). Test PAID orders alone used to flip this to Bronce.
  const showReputation = (seller?.score ?? 0) > 0;
  const isOwnListing = !!sellerId && seller?.id === sellerId;
  const images = product?.images ?? [];
  const mainImage = activeImage ?? images[0] ?? "/sinimagen.webp";

  const openImageModal = (img: string) => {
    const idx = images.indexOf(img);
    setModalImageIndex(idx >= 0 ? idx : 0);
    setShowImageModal(true);
  };

  const getTierEmoji = (tier: string) => {
    switch (tier.toUpperCase()) {
      case "PREMIUM": return "💎";
      case "GOLD":
      case "ORO": return "🥇";
      case "PLATA":
      case "SILVER": return "🥈";
      default: return "🥉";
    }
  };

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

  // Same AR-number formatting as above, but for the buyer who bought THIS
  // seller's own sold listing (see isOwnSoldListing).
  const buyerPhoneDigits = soldToBuyer?.phone?.replace(/\D/g, "") ?? "";
  const buyerWhatsAppNumber = buyerPhoneDigits
    ? buyerPhoneDigits.startsWith("549")
      ? buyerPhoneDigits
      : `549${buyerPhoneDigits.replace(/^54/, "")}`
    : null;
  const buyerWhatsAppUrl = buyerWhatsAppNumber
    ? `https://wa.me/${buyerWhatsAppNumber}?text=${encodeURIComponent(
        `Hola ${soldToBuyer?.name ?? ""}, te contacto desde CompraVentaOnline.com.ar por tu compra de "${product?.name}" para coordinar la entrega.`
      )}`
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full [overflow-anchor:none]">
      {/* Breadcrumb Navigation — shows the product's real category path
          (root-first, e.g. Alimentos y Bebidas / Bebidas / Vinos y
          Espumantes) once it resolves, so you can see exactly where this
          listing lives and jump to any level of it. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted mb-8">
        <Link href="/" className="hover:text-accent-gold transition-colors">Inicio</Link>
        {categoryPath.map((cat) => (
          <span key={cat.id} className="flex items-center gap-2">
            <span>/</span>
            <Link href={`/search?category=${cat.slug}`} className="hover:text-accent-gold transition-colors">
              {cat.name}
            </Link>
          </span>
        ))}
        <span>/</span>
        <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-xs">{product?.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Left Column: Image and Info */}
        <div className="lg:col-span-7 flex flex-col gap-8">

          {/* Main Product Image Container */}
          <div
            onClick={() => openImageModal(mainImage)}
            className="rounded-3xl overflow-hidden bg-card-bg border border-card-border p-3 shadow-xl relative aspect-[4/3] flex items-center justify-center group cursor-zoom-in"
          >
            {(listing.featured_plan === "FEATURED" || listing.featured_plan === "PREMIUM") && (
              <span className="absolute top-6 left-6 z-10 rounded-full bg-accent-blue px-3 py-1 text-[10px] font-extrabold tracking-wider text-white shadow-md uppercase">
                ⚡ PRODUCTO DESTACADO
              </span>
            )}
            {images.length > 1 && (
              <span className="absolute bottom-6 right-6 z-10 rounded-lg bg-background/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-foreground shadow-md flex items-center gap-1">
                🔍 Ver {images.length} fotos
              </span>
            )}
            <Image
              src={mainImage}
              alt={product?.name ?? "Producto"}
              fill
              sizes="(max-width: 1024px) 90vw, 700px"
              className="rounded-2xl object-contain p-2 transition-transform duration-500 group-hover:scale-[1.02]"
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
                    className={`relative h-16 w-16 rounded-xl overflow-hidden border-2 bg-card-bg cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 ${
                      isSelected ? "border-accent-gold shadow-md" : "border-card-border hover:border-accent-gold/40"
                    }`}
                  >
                    <Image src={img} alt={`${product?.name} miniatura ${idx + 1}`} fill sizes="64px" className="object-contain" />
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
                {product?.description ? (
                  <RichTextDisplay html={product.description} />
                ) : null}
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
                    {seller?.location && (
                      <span className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                        📍 {seller.location}
                      </span>
                    )}
                  </div>
                  {showReputation ? (
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${getTierBadge(seller?.tier ?? "")}`}>
                      Nivel {seller?.tier}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider bg-accent-green/10 text-accent-green border-accent-green/30">
                      🌱 Nivel Nuevo
                    </span>
                  )}
                </div>

                <div className="border-t border-card-border/50 pt-4 mt-2">
                  {showReputation ? (() => {
                    const points = seller?.score ?? 0;
                    const tierRange = points >= 300 ? null : points >= 150 ? { from: 150, to: 300 } : points >= 50 ? { from: 50, to: 150 } : { from: 0, to: 50 };
                    const pct = tierRange ? Math.round(((points - tierRange.from) / (tierRange.to - tierRange.from)) * 100) : 100;
                    return (
                      <>
                        <div className="flex justify-between items-center text-xs font-bold text-foreground mb-1">
                          <span>{getTierEmoji(seller?.tier ?? "")} Nivel {seller?.tier === "GOLD" ? "ORO" : seller?.tier}</span>
                          <span className="text-accent-gold">{points} pts</span>
                        </div>
                        <div className="w-full bg-card-border h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-accent-gold to-accent-green h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-text-muted mt-2">
                          {tierRange
                            ? `A ${tierRange.to - points} pts del próximo nivel.`
                            : "Nivel máximo alcanzado."}
                        </p>
                      </>
                    );
                  })() : (
                    <p className="text-xs text-text-muted leading-relaxed">
                      Este vendedor todavía no realizó ninguna venta. En cuanto complete su primera, vas a poder ver acá su score de reputación.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Local Advertising Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-accent-gold/10 to-accent-green/10 border border-accent-gold/20 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <span className="text-3xl">🌾</span>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="font-heading text-xs font-extrabold text-accent-gold uppercase tracking-wider">Publicidad Local de La Pampa</h4>
              <p className="text-xs text-foreground font-bold mt-1">¿Querés que tu comercio aparezca acá?</p>
              <p className="text-[10px] text-text-muted mt-0.5">Llegá a miles de pampeanos diariamente. Anunciá con nosotros.</p>
            </div>
            <Link href="/publicidad" className="rounded-xl border border-accent-gold/30 hover:border-accent-gold px-4 py-2 text-[10px] font-extrabold text-accent-gold hover:bg-accent-gold/5 transition-all">
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
              <span className="font-heading text-3xl font-extrabold text-foreground">{currencySymbol}</span>
              <span className="font-heading text-3xl font-extrabold text-foreground">
                {Number(listing.price).toLocaleString("es-AR")}
              </span>
              {listing.currencies?.code === "USD" && (
                <span className="text-xs font-semibold text-text-muted ml-1">(Precio en dólares)</span>
              )}
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
              {orderError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl p-4 text-xs font-medium text-center">
                  {orderError}
                </div>
              )}
              {isOwnSoldListing ? (
                <>
                  <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-2xl p-4 text-xs font-medium text-center animate-in fade-in duration-300">
                    🎉 ¡Felicitaciones, vendiste este producto! Comunicate con el comprador lo antes posible para coordinar la entrega.
                  </div>
                  {buyerWhatsAppUrl ? (
                    <a
                      href={buyerWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full rounded-xl bg-gradient-to-r from-accent-green to-emerald-600 px-6 py-4 text-xs font-extrabold text-white text-center shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>💬 Contactar al comprador</span>
                    </a>
                  ) : (
                    <p className="text-xs text-text-muted text-center">
                      El comprador no cargó un celular de contacto. Coordiná desde &quot;Mis Ventas&quot;.
                    </p>
                  )}
                </>
              ) : isPaid ? (
                <>
                  <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-2xl p-4 text-xs font-medium text-center animate-in fade-in duration-300">
                    ✓ ¡Confirmaste tu compra! Comunicate con el vendedor por WhatsApp para coordinar el pago y el envío.
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
              ) : isOwnListing ? (
                <div className="bg-text-muted/10 border border-card-border text-text-muted rounded-2xl p-4 text-xs font-medium text-center">
                  Esta es tu propia publicación — no podés comprarla.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    className={`rounded-xl px-4 py-4 text-xs font-extrabold text-center shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      addedToCart
                        ? "bg-accent-green text-white border border-accent-green/30"
                        : "bg-gradient-to-r from-accent-gold to-accent-gold-hover text-white"
                    }`}
                  >
                    {addedToCart ? <><span>✓</span> ¡Agregado!</> : <><span>🛒</span> Agregar al Carrito</>}
                  </button>
                  <button
                    onClick={() => {
                      if (!userId) {
                        router.push("/login?redirect=" + encodeURIComponent(`/listings/${id}?buy=1`));
                      // Identity verification temporarily disabled.
                      // } else if (!identityVerified) {
                      //   router.push("/verificar-identidad?next=" + encodeURIComponent(`/listings/${id}?buy=1`));
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

              {!isOwnListing && (
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
              )}
            </div>

            <div className="border-t border-card-border pt-5 flex justify-center items-center gap-6 text-xs sm:text-sm text-text-muted font-semibold">
              <button
                onClick={handleShareListing}
                className="flex items-center gap-1.5 text-foreground hover:text-accent-gold transition-all cursor-pointer whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                {linkCopied ? "✓ ¡Enlace copiado!" : "Compartir publicación"}
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="text-red-500 hover:underline transition-all cursor-pointer whitespace-nowrap"
              >
                🚩 Denunciar publicación
              </button>
            </div>

          </div>

          {/* Seller Trust Box — clickable to see the seller's profile
              photo/logo and bio without leaving the listing. The "Más
              artículos" link sits outside the modal-opening <button> on
              purpose: a <Link> can't be nested inside a <button> (invalid
              HTML — two interactive elements fighting over the click). */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">Publicado por</span>
            <div className="w-full rounded-2xl bg-card-bg border border-card-border p-6 shadow-md flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowSellerModal(true)}
                  className="flex items-center gap-4 flex-1 text-left cursor-pointer group"
                >
                  <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden shadow-lg">
                    <SellerAvatar src={seller?.avatar_url} alt={seller?.name ?? "Vendedor"} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-foreground group-hover:text-accent-gold transition-colors">
                      {seller?.username ? `@${seller.username}` : seller?.name}
                    </h4>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {showReputation ? `Vendedor nivel ${seller?.tier}` : "🌱 Recién se suma a la comunidad"}
                    </span>
                  </div>
                </button>
                <div className="text-right shrink-0">
                  {showReputation ? (
                    <>
                      <span className="text-sm font-extrabold text-accent-gold block">{getTierEmoji(seller?.tier ?? "")} {seller?.score ?? 0} pts</span>
                      <span className="text-[8px] text-text-muted block uppercase">Puntaje pampeano</span>
                    </>
                  ) : (
                    <span className="text-[9px] font-bold text-text-muted italic">Sin ventas aún</span>
                  )}
                </div>
              </div>
              {seller?.id && (
                <Link
                  href={`/search?seller=${seller.id}`}
                  className="text-xs font-bold text-accent-gold hover:underline"
                >
                  Más artículos de este vendedor →
                </Link>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: PERFIL DEL VENDEDOR (foto/logo + bio) */}
      {showSellerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-card-bg border border-card-border p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowSellerModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-foreground text-lg cursor-pointer">✕</button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative h-40 w-40 shrink-0 rounded-2xl overflow-hidden">
                <SellerAvatar
                  src={seller?.avatar_url}
                  alt={seller?.name ?? "Vendedor"}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">{seller?.name}</h3>
                <span className="text-[10px] text-text-muted block mt-1">
                  {seller?.type === "BUSINESS_SELLER" ? "Comercio / Empresa" : "Vendedor particular"}
                </span>
                {seller?.location && (
                  <span className="text-[10px] text-text-muted block mt-0.5">📍 {seller.location}</span>
                )}
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {seller?.bio?.trim() ? seller.bio : "Este vendedor todavía no agregó una descripción."}
              </p>

              {/* Reputación dentro de la plataforma — mismo criterio que la
                  Seller Trust Box: sin ventas pagas todavía, no mostramos
                  un puntaje/tier que en verdad es solo el default de alta. */}
              <div className="w-full border-t border-card-border/50 pt-4">
                {showReputation ? (
                  <>
                    <span className="text-xl font-extrabold text-accent-gold block">{getTierEmoji(seller?.tier ?? "")} {seller?.score ?? 0} pts</span>
                    <span className="text-[9px] text-text-muted block uppercase mt-0.5">Nivel {seller?.tier === "GOLD" ? "ORO" : seller?.tier}</span>
                    {priceRespectLabel && (
                      <span className="text-[11px] text-foreground block mt-2">{priceRespectLabel}</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-text-muted italic">Sin ventas aún en la plataforma</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <LanguageHighlightField
                    as="textarea"
                    rows={3}
                    required
                    value={contactMsg}
                    onChange={setContactMsg}
                    terms={flaggedLanguageTerms(contactMsg)}
                    placeholder="Escribí tu pregunta sobre este producto..."
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground resize-none"
                  />
                </div>
                {contactError && (
                  <p className="text-xs font-bold text-red-500">
                    {contactError.split(/(«[^»]+»)/).map((part, index) =>
                      part.startsWith("«") ? (
                        <mark key={index} className="community-word-flag mx-0.5">
                          {part.slice(1, -1)}
                        </mark>
                      ) : (
                        part
                      ),
                    )}
                  </p>
                )}
                <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-4 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition-all mt-2 cursor-pointer">
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
                      { name: "Precio engañoso / no respeta el precio publicado", value: "MISLEADING_PRICE" },
                      { name: "Contenido inapropiado", value: "INAPPROPRIATE" },
                      { name: "Spam", value: "SPAM" },
                      { name: "Publicación duplicada", value: "DUPLICATE" },
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
            <button
              onClick={() => {
                setShowCheckoutModal(false);
                setOrderError("");
                setAcceptedTerms(false);
                setOrderConfirmed(false);
              }}
              className="absolute top-4 right-4 text-text-muted hover:text-foreground text-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="text-left">
              <h3 className="font-heading text-lg font-extrabold text-foreground">
                {orderConfirmed ? "¡Compra Confirmada!" : "Completar Compra"}
              </h3>
              {!orderConfirmed && (
                <p className="text-text-muted text-xs mt-1">Confirmá tu compromiso de compra con el vendedor.</p>
              )}
            </div>

            {orderConfirmed ? (
              <>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Le avisamos al vendedor que confirmaste la compra. Coordiná el pago y la entrega directamente con él/ella por WhatsApp.
                </p>

                <div className="rounded-2xl bg-background border border-card-border p-4 flex flex-col gap-2 text-xs text-left">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Le compartimos al vendedor tus datos de contacto</span>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Nombre</span>
                    <span className="font-bold text-foreground">{buyerContact?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Teléfono</span>
                    <span className="font-bold text-foreground">{buyerContact?.phone ?? "No cargado"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Email</span>
                    <span className="font-bold text-foreground">{buyerContact?.email ?? "—"}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setOrderConfirmed(false);
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 py-4 text-xs font-extrabold text-white shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                >
                  Entendido
                </button>
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-background border border-card-border p-4 flex items-center gap-3 text-xs">
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-card-border shrink-0">
                    <Image src={mainImage} alt={product?.name ?? "Producto"} fill sizes="48px" className="object-contain" />
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
                    Al realizar la compra de este producto asumís un <span className="font-bold text-foreground">compromiso de compra firme</span>. Si comprás y no concretás la operación, el vendedor puede calificarte negativamente, lo que afectará tu perfil como comprador dentro de la plataforma.
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

                <div className="flex flex-col gap-4 text-left">
                  {orderError && <p className="text-xs text-red-500 font-bold">{orderError}</p>}

                  <div className="flex justify-between items-center border-t border-card-border/30 pt-4 mt-2">
                    <span className="text-xs text-text-muted">Total a Pagar:</span>
                    <span className="font-heading text-lg font-extrabold text-accent-gold">
                      {currencySymbol}{Number(listing.price).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={paymentLoading || !acceptedTerms}
                  className="w-full rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 py-4 text-xs font-extrabold text-white shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {paymentLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </>
                  ) : (
                    "Confirmar Compra"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: CARRUSEL DE IMÁGENES */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-5 right-5 z-10 text-white/80 hover:text-white text-2xl cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>

          {images.length > 1 && (
            <span className="absolute top-5 left-5 z-10 rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white">
              {modalImageIndex + 1} / {images.length}
            </span>
          )}

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalImageIndex((i) => (i - 1 + images.length) % images.length);
              }}
              className="absolute left-3 sm:left-6 z-10 h-11 w-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl cursor-pointer transition-all"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[modalImageIndex] ?? mainImage}
            alt={`${product?.name ?? "Producto"} — foto ${modalImageIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
          />

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalImageIndex((i) => (i + 1) % images.length);
              }}
              className="absolute right-3 sm:right-6 z-10 h-11 w-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl cursor-pointer transition-all"
              aria-label="Imagen siguiente"
            >
              ›
            </button>
          )}

          {images.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-2"
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setModalImageIndex(idx)}
                  className={`relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    idx === modalImageIndex ? "border-accent-gold" : "border-white/20 hover:border-white/50"
                  }`}
                >
                  <Image src={img} alt={`Miniatura ${idx + 1}`} fill sizes="48px" className="object-contain bg-white/5" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
