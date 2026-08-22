"use client";

import { useState, useEffect, useRef, useMemo, Suspense, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CustomDropdown from "@/components/CustomDropdown";
import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";
import SellerAvatar from "@/components/SellerAvatar";
import { LA_PAMPA_CITIES } from "@/lib/constants/laPampaCities";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionWithBuyer } from "@/lib/supabase/types";

interface Listing {
  id: string;
  price: number;
  condition: string;
  stock: number;
  status: string;
  featured_plan: string;
  currency_id: string;
  image_url?: string | null;
  images?: string[];
  products: {
    id: string;
    name: string;
    brand: string;
    description: string;
    category_id: string;
    images?: string[];
    attributes?: Record<string, any>;
  } | null;
}

// Legacy alias used in the form handlers that reference listing.product.*
// We keep camelCase fields as optional for compatibility with the edit flow
type ListingWithLegacy = Listing & {
  featuredPlan?: string;
  currencyId?: string;
  product?: {
    id: string;
    name: string;
    brand: string;
    description: string;
    categoryId: string;
    images?: string[];
    attributes?: Record<string, any>;
  };
};

interface SellerProfile {
  id: string;
  name: string;
  type: string;
  score: number;
  tier: string;
  plan: string;
  user_id: string;
  phone: string | null;
  location: string | null;
  document_number: string | null;
  bio: string | null;
  avatar_url: string | null;
  username: string | null;
  mercadopago_connected: boolean;
  bank_cbu: string | null;
  bank_alias: string | null;
  identity_verified: boolean;
}

interface PendingTransferOrder {
  id: string;
  amount: number;
  created_at: string;
  listings: { products: { name: string } | null } | null;
  buyer: { name: string } | null;
}

interface BackendCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  attributesSchema?: any;
}

const SOCIAL_PLATFORMS: { key: "INSTAGRAM" | "FACEBOOK" | "TIKTOK"; label: string; icon: string }[] = [
  { key: "INSTAGRAM", label: "Instagram", icon: "📷" },
  { key: "FACEBOOK", label: "Facebook", icon: "📘" },
  { key: "TIKTOK", label: "TikTok", icon: "🎵" },
];

// useSearchParams() (used below to react to the header's "Vender" CTA
// navigating to /dashboard?tab=publish while already on this page) requires
// a Suspense boundary around whatever calls it, or `next build` fails
// prerendering this route entirely — see missing-suspense-with-csr-bailout.
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-sm text-text-muted">Cargando...</div>}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Supabase client (lazy init via ref — safe for prerender)
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Domain states
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  // Whether this seller has at least one PAID order — score/tier default to
  // 80/BRONCE at signup, which would otherwise read as a real reputation
  // for someone who never sold anything.
  const [sellerHasSales, setSellerHasSales] = useState(false);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  // { [listingId]: viewCount } — unique visitors/day, see listing_views
  // migration. Keyed by listing id so the table below can just look up
  // viewCounts[listing.id] ?? 0 per row.
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  // { [listingId]: end_date ISO string } — active paid/reward highlights,
  // used to hide the "Destacar" button and show "Destacado hasta DD/MM"
  // instead. See highlighted_products (034_paid_highlights.sql).
  const [highlightedUntil, setHighlightedUntil] = useState<Record<string, string>>({});
  const [highlightingListingId, setHighlightingListingId] = useState<string | null>(null);
  // Live price/duration for the "Destacar" button label — editable from
  // /admin/configuracion (platform_settings), not hardcoded here.
  const [highlightSettings, setHighlightSettings] = useState({ price: 10000, durationDays: 30 });
  // Buyer + purchase date for listings that sold out (status SOLD) — shown
  // next to the "Vendido" badge in "Mis Publicaciones".
  const [soldOrders, setSoldOrders] = useState<Record<string, { buyerName: string; paidAt: string }>>({});
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "publish" | "inventory" | "questions" | "rewards" | "profile" | "social">("summary");
  const [rewards, setRewards] = useState<any[]>([]);

  // Redes Sociales — NOT real OAuth yet (see 020_social_accounts.sql):
  // "vincular" just records the handle the seller wants associated with
  // their shares, until Meta/TikTok approve real publishing permissions.
  type SocialAccount = { id: string; platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK"; handle: string; connected_at: string };
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [socialAccountsLoaded, setSocialAccountsLoaded] = useState(false);
  const [socialHandleInputs, setSocialHandleInputs] = useState<Record<string, string>>({ INSTAGRAM: "", FACEBOOK: "", TIKTOK: "" });
  const [socialConnecting, setSocialConnecting] = useState<string | null>(null);
  const [socialDisconnecting, setSocialDisconnecting] = useState<string | null>(null);

  // Publicar Artículo: qué redes tildó el vendedor para esta publicación.
  const [shareToSocial, setShareToSocial] = useState<string[]>([]);
  const [shareConsent, setShareConsent] = useState(false);

  // Modal post-publicación: imagen con sello + texto listos para pegar a
  // mano en cada red (hasta que exista el auto-posteo real).
  const [shareModalData, setShareModalData] = useState<{ imageDataUrl: string; caption: string } | null>(null);
  const [shareModalLoading, setShareModalLoading] = useState(false);

  // Consultas — same data/answer/hide logic as the header bell dropdown
  // (HeaderSessionBar.tsx), but rendered as a full tab so a seller can
  // actually track and follow up on everything, not just the last few in
  // a small popover.
  const [questions, setQuestions] = useState<QuestionWithBuyer[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsFilter, setQuestionsFilter] = useState<"all" | "unanswered" | "answered">("all");
  const [replyingToQuestionId, setReplyingToQuestionId] = useState<string | null>(null);
  const [questionReplyText, setQuestionReplyText] = useState("");
  const [selectedRewardToClaim, setSelectedRewardToClaim] = useState<any | null>(null);
  const [selectedListingForReward, setSelectedListingForReward] = useState<string>("");
  
  // Form states
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("NEW");
  const [stock, setStock] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [featuredPlan, setFeaturedPlan] = useState("FREE");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Mis Datos (edición de perfil)
  const [profileName, setProfileName] = useState("");
  const [profileType, setProfileType] = useState<"PERSONAL_SELLER" | "BUSINESS_SELLER">("PERSONAL_SELLER");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [profileDocumentNumber, setProfileDocumentNumber] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");

  // Foto de perfil / logo — se sube apenas se elige el archivo (no espera al
  // submit del resto del form), así el seller no pierde la foto si cierra
  // sin tocar "Guardar Cambios".
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Mis Datos — cobros (Mercado Pago + transferencia)
  const [bankCbu, setBankCbu] = useState("");
  const [bankAlias, setBankAlias] = useState("");
  const [mpDisconnecting, setMpDisconnecting] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [pendingTransferOrders, setPendingTransferOrders] = useState<PendingTransferOrder[]>([]);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  // Estados para edición de publicación
  const [selectedListingToEdit, setSelectedListingToEdit] = useState<Listing | null>(null);

  // Confirm delete modal state
  const [listingIdToDelete, setListingIdToDelete] = useState<string | null>(null);

  // States for publication status
  const [status, setStatus] = useState("APPROVED");
  const [activeStatusDropdownListingId, setActiveStatusDropdownListingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Estados para búsqueda, ordenamiento y paginación de inventario
  const [inventorySearch, setInventorySearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Atributos específicos según categoría
  const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});

  // Estados para subida de fotos de producto
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [isImagesDragging, setIsImagesDragging] = useState(false);

  // Monedas desde la base de datos
  const [currencies, setCurrencies] = useState<{ id: string; code: string; symbol: string; name: string }[]>([]);
  const [currencyId, setCurrencyId] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");



  // Bulk upload states
  const [publishMode, setPublishMode] = useState<"direct" | "bulk">("direct");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // Bulk upload — review step (parsed from the Excel, category assigned
  // via dropdown and photos attached via drag-and-drop right here, before
  // anything actually gets published). null = still on the "pick a file"
  // step; an array (even empty) means the file was parsed and we're
  // showing the review screen.
  type BulkPreviewRow = {
    rowNumber: number;
    valid: boolean;
    reason?: string;
    name?: string;
    brand?: string | null;
    description?: string | null;
    price?: number;
    currencyCode?: "ARS" | "USD";
    condition?: "NEW" | "USED";
    stock?: number;
    attributes?: Record<string, string> | null;
    categoryId: string | null;
    images: string[];
  };
  const [bulkPreviewRows, setBulkPreviewRows] = useState<BulkPreviewRow[] | null>(null);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkUploadingRow, setBulkUploadingRow] = useState<number | null>(null);
  const [bulkRowDragOver, setBulkRowDragOver] = useState<number | null>(null);
  const [bulkDraggingImage, setBulkDraggingImage] = useState<{ row: number; index: number } | null>(null);

  // Bulk category assignment: search by name (e.g. "notebook"), select the
  // matching rows, assign a category to all of them in one shot — instead
  // of opening each row's dropdown one by one when 10+ rows share the
  // same category.
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSelectedRows, setBulkSelectedRows] = useState<Set<number>>(new Set());
  const [bulkAssignCategoryId, setBulkAssignCategoryId] = useState("");
  // Table view: which single row (if any) has its detail panel (category
  // dropdown + photo grid) expanded open below it.
  const [bulkExpandedRow, setBulkExpandedRow] = useState<number | null>(null);
  // Which row's thumbnail (in the "Fotos" table column) is being dragged
  // over — that thumbnail is itself the click/drop target now, no
  // separate "Agregar imágenes" modal anymore.
  const [photoColumnDragOver, setPhotoColumnDragOver] = useState<number | null>(null);

  // Check auth and mount
  useEffect(() => {
    setMounted(true);
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Reset page when tab or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [inventorySearch, activeTab]);

  // Land on a specific tab (e.g. the header's "Vender" CTA links to
  // /dashboard?tab=publish) and surface the Mercado Pago OAuth callback
  // result (redirected here as ?tab=profile&mp=connected|error&mp_msg=...).
  //
  // Keyed on `searchParams` (from next/navigation's useSearchParams, which
  // IS reactive to same-route navigations), not a one-shot read of
  // window.location.search in an empty-deps effect — Next.js doesn't
  // remount this page when only its query string changes (clicking
  // "Vender" while already on /dashboard is a same-route navigation), so a
  // mount-only effect would silently never see the new ?tab= value.
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "publish" || tab === "inventory" || tab === "questions" || tab === "rewards" || tab === "summary" || tab === "profile" || tab === "social") {
      setActiveTab(tab);
    }

    const mp = searchParams.get("mp");
    if (mp === "connected") {
      setSellerProfile((prev) => (prev ? { ...prev, mercadopago_connected: true } : prev));
      setProfileSuccessMsg("¡Cuenta de Mercado Pago vinculada con éxito!");
    } else if (mp === "error") {
      setProfileErrorMsg("No se pudo vincular Mercado Pago. Probá de nuevo.");
    }

    // Back from the "Destacar publicación" Checkout Pro flow — the webhook
    // applies the highlight asynchronously, so "success" here just means the
    // payment went through, not that it's visible in the table yet.
    const highlight = searchParams.get("highlight");
    if (highlight === "success") {
      setSuccessMsg("¡Pago recibido! Tu publicación va a aparecer como destacada en unos minutos.");
    } else if (highlight === "failure") {
      setErrorMsg("El pago no se pudo completar. Podés intentar destacarla de nuevo.");
    } else if (highlight === "pending") {
      setSuccessMsg("Tu pago está pendiente de acreditación. Te avisamos cuando se confirme.");
    }

    if (tab || mp || highlight) {
      router.replace("/dashboard", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load profile and dashboard data once userId is available
  useEffect(() => {
    if (!userId) return;

    async function loadDashboardData() {
      const supabase = getSupabase();
      try {
        // 1. Fetch seller profile for this auth user
        const { data: profileData, error: profileError } = await supabase
          .from("sellers")
          .select("id, name, type, score, tier, user_id, phone, location, document_number, bio, avatar_url, username, mercadopago_connected, bank_cbu, bank_alias, identity_verified")
          .eq("user_id", userId!)
          .single();

        if (profileError || !profileData) {
          throw new Error("No pudimos encontrar tu perfil de vendedor.");
        }

        const profile = profileData as SellerProfile;
        setSellerProfile(profile);
        setProfileName(profile.name ?? "");
        setProfileType(profile.type === "BUSINESS_SELLER" ? "BUSINESS_SELLER" : "PERSONAL_SELLER");
        setProfilePhone(profile.phone ?? "");
        setProfileLocation(profile.location ?? "");
        setProfileDocumentNumber(profile.document_number ?? "");
        setProfileBio(profile.bio ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
        setBankCbu(profile.bank_cbu ?? "");
        setBankAlias(profile.bank_alias ?? "");

        // Has this seller ever completed a sale? RLS lets a seller read
        // their own orders, so this works fine with the browser client.
        const { count: paidOrdersCount } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", profile.id)
          .eq("status", "PAID");
        setSellerHasSales((paidOrdersCount ?? 0) > 0);

        // Pending bank-transfer orders this seller needs to confirm manually.
        const { data: transferOrders } = await supabase
          .from("orders")
          .select("id, amount, created_at, listings(products(name)), buyer:sellers!orders_buyer_id_fkey(name)")
          .eq("seller_id", profile.id)
          .eq("payment_method", "TRANSFER")
          .eq("status", "PENDING")
          .order("created_at", { ascending: false });

        if (transferOrders) {
          setPendingTransferOrders(transferOrders as unknown as PendingTransferOrder[]);
        }

        // 2. Fetch Categories (flat list, subcategories carry parentId)
        const { data: catData } = await supabase
          .from("categories")
          .select("id, name, slug, parent_id")
          .order("name", { ascending: true });

        if (catData && catData.length > 0) {
          const flatCategories: BackendCategory[] = catData.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            parentId: c.parent_id,
          }));
          setCategories(flatCategories);
        }

        // 3. Fetch this seller's listings
        const { data: listingsData } = await supabase
          .from("listings")
          .select(`
            id, price, condition, stock, status, featured_plan, currency_id, image_url,
            products ( id, name, brand, description, category_id, images, attributes )
          `)
          .eq("seller_id", profileData.id)
          .order("created_at", { ascending: false });

        if (listingsData) {
          setMyListings(listingsData as unknown as Listing[]);
        }

        // 4. Fetch seller rewards
        const { data: rewardsData } = await supabase
          .from("seller_rewards")
          .select("*")
          .eq("seller_id", profileData.id)
          .order("created_at", { ascending: false });

        if (rewardsData) setRewards(rewardsData);

        // 5. Fetch currencies
        const { data: currData } = await supabase
          .from("currencies")
          .select("id, code, symbol, name")
          .order("code", { ascending: true });

        if (currData && currData.length > 0) {
          setCurrencies(currData);
          const pesos = currData.find((c) => c.code === "ARS");
          setCurrencyId(pesos ? pesos.id : currData[0].id);
        }
      } catch (err: any) {
        console.error("Error al cargar los datos del panel:", err);
        setErrorMsg("Error al cargar los datos del panel.");
      } finally {
        setPageLoading(false);
      }
    }

    loadDashboardData();
  }, [userId]);

  const downloadExcelTemplate = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Publicaciones");

    sheet.columns = [
      { header: "Nombre", key: "name", width: 32 },
      { header: "Marca", key: "brand", width: 20 },
      { header: "Descripción", key: "description", width: 45 },
      { header: "Moneda", key: "currencyCode", width: 12 },
      { header: "Precio", key: "price", width: 12 },
      { header: "Condición", key: "condition", width: 12 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Atributos", key: "attributes", width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };

    // Ni categoría ni fotos van en la planilla — se asignan producto por
    // producto en la pantalla de revisión, después de subir el Excel
    // (dropdown de categoría + arrastrar y soltar imágenes).
    sheet.addRow({
      name: "iPhone 13",
      brand: "Apple",
      description: "Excelente celular usado impecable",
      currencyCode: "ARS",
      price: 750000,
      condition: "USED",
      stock: 2,
      attributes: "ram=4GB;storage=128GB",
    });
    sheet.addRow({
      name: "Mesa de Madera Rústica",
      brand: "Muebles Pampeanos",
      description: "Mesa de comedor de caldén macizo",
      currencyCode: "ARS",
      price: 350000,
      condition: "NEW",
      stock: 5,
      attributes: "",
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_publicaciones_masivas.xlsx");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvFileSelect = (file: File) => {
    setCsvFile(file);
    setBulkErrors([]);
    setBulkPreviewRows(null);
    setSuccessMsg("");
    setErrorMsg("");
  };

  // Step 1 -> Step 2: parses + validates the Excel's fields server-side,
  // but doesn't publish anything yet — category (dropdown) and photos
  // (drag-and-drop) still need to be attached per row below.
  const handleBulkPreview = async () => {
    if (!csvFile) return;
    setBulkPreviewLoading(true);
    setErrorMsg("");
    setBulkErrors([]);

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await fetch("/api/listings/bulk/preview", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No pudimos leer el archivo.");
      }
      setBulkPreviewRows(
        (data.rows as Omit<BulkPreviewRow, "categoryId" | "images">[]).map((r) => ({
          ...r,
          categoryId: null,
          images: [],
        }))
      );
    } catch (err: any) {
      console.error("Error al previsualizar la subida masiva:", err);
      setErrorMsg(err.message || "No pudimos leer el archivo.");
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const handleBulkReset = () => {
    setBulkPreviewRows(null);
    setCsvFile(null);
    setBulkErrors([]);
    setBulkSearch("");
    setBulkSelectedRows(new Set());
    setBulkAssignCategoryId("");
  };

  const handleBulkRowCategoryChange = (rowNumber: number, categoryId: string) => {
    setBulkPreviewRows((prev) =>
      prev ? prev.map((r) => (r.rowNumber === rowNumber ? { ...r, categoryId } : r)) : prev
    );
  };

  // Same upload mechanics as handleImageFiles (single-listing flow) —
  // Supabase Storage, "listings" bucket — just scoped to one bulk row's
  // own image array instead of the shared productImages state.
  const handleBulkRowImageFiles = async (rowNumber: number, files: FileList) => {
    const supabase = getSupabase();
    const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (fileArray.length === 0) return;

    const sellerId = sellerProfile?.id ?? userId ?? "unknown";
    setBulkUploadingRow(rowNumber);
    try {
      const uploadedUrls: string[] = [];
      for (const file of fileArray) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `${sellerId}/bulk-${rowNumber}/${filename}`;
        const { error } = await supabase.storage.from("listings").upload(path, file, { upsert: false });
        if (!error) {
          const { data: urlData } = supabase.storage.from("listings").getPublicUrl(path);
          if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
        }
      }
      setBulkPreviewRows((prev) =>
        prev
          ? prev.map((r) => (r.rowNumber === rowNumber ? { ...r, images: [...r.images, ...uploadedUrls] } : r))
          : prev
      );
    } finally {
      setBulkUploadingRow(null);
    }
  };

  const handleBulkRemoveImage = (rowNumber: number, imgIndex: number) => {
    setBulkPreviewRows((prev) =>
      prev
        ? prev.map((r) =>
            r.rowNumber === rowNumber ? { ...r, images: r.images.filter((_, i) => i !== imgIndex) } : r
          )
        : prev
    );
  };

  // Native HTML5 drag reorder, same pattern as the single-listing photo
  // grid (handleImageDragStart/Drop) — index 0 is always the cover.
  const handleBulkImageDragStart = (rowNumber: number, index: number) => {
    setBulkDraggingImage({ row: rowNumber, index });
  };

  const handleBulkImageDrop = (rowNumber: number, index: number) => {
    if (!bulkDraggingImage || bulkDraggingImage.row !== rowNumber) {
      setBulkDraggingImage(null);
      return;
    }
    setBulkPreviewRows((prev) =>
      prev
        ? prev.map((r) => {
            if (r.rowNumber !== rowNumber) return r;
            const reordered = [...r.images];
            const [removed] = reordered.splice(bulkDraggingImage.index, 1);
            reordered.splice(index, 0, removed);
            return { ...r, images: reordered };
          })
        : prev
    );
    setBulkDraggingImage(null);
  };

  // Step 2 -> actually publish: only rows with valid fields AND an
  // assigned category go out; the rest stay listed above as "pendiente".
  const handleConfirmBulkPublish = async () => {
    if (!bulkPreviewRows) return;
    const readyRows = bulkPreviewRows.filter((r) => r.valid && r.categoryId);
    if (readyRows.length === 0) return;

    setBulkConfirming(true);
    setSuccessMsg("");
    setErrorMsg("");
    setBulkErrors([]);

    try {
      const res = await fetch("/api/listings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: readyRows.map((r) => ({
            name: r.name,
            brand: r.brand,
            description: r.description,
            price: r.price,
            currencyCode: r.currencyCode,
            condition: r.condition,
            stock: r.stock,
            attributes: r.attributes,
            categoryId: r.categoryId,
            images: r.images,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al publicar los productos.");
      }

      const failedRows: { row: number; reason: string }[] = data.failed ?? [];
      if (failedRows.length > 0) {
        setBulkErrors(failedRows.map((f) => `Fila ${f.row}: ${f.reason}`));
      }

      if (data.inserted > 0) {
        setSuccessMsg(
          failedRows.length > 0
            ? `Se crearon ${data.inserted} publicaciones. ${failedRows.length} tuvieron errores (ver detalle abajo).`
            : `¡Subida masiva exitosa! Se crearon ${data.inserted} publicaciones.`
        );
        handleBulkReset();
      } else {
        throw new Error("Ninguna fila pudo publicarse. Revisá los errores abajo.");
      }
      await refreshListings();
    } catch (err: any) {
      console.error("Error al confirmar la subida masiva:", err);
      setErrorMsg(err.message || "Error al publicar los productos.");
    } finally {
      setBulkConfirming(false);
    }
  };

  // Same options shape as the single-listing "Categoría" dropdown (root +
  // first-level children, grouped) — built once and reused across every
  // row's dropdown in the bulk review screen instead of rebuilding it N
  // times per render.
  const bulkCategoryOptions = useMemo(
    () => [
      { name: "Seleccioná una categoría", value: "" },
      ...categories
        .filter((cat) => !cat.parentId)
        .flatMap((root) => [
          { name: root.name, value: root.id },
          ...categories
            .filter((cat) => cat.parentId === root.id)
            .map((sub) => ({ name: sub.name, value: sub.id, groupLabel: root.name })),
        ]),
    ],
    [categories]
  );

  // Rows visible after the "notebook"-style name search — case/accent
  // insensitive, same normalize() trick as the public /search page.
  const bulkFilteredRows = useMemo(() => {
    if (!bulkPreviewRows) return [];
    const q = bulkSearch.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!q) return bulkPreviewRows;
    return bulkPreviewRows.filter((r) =>
      (r.name ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)
    );
  }, [bulkPreviewRows, bulkSearch]);

  const bulkSelectableRowNumbers = useMemo(
    () => bulkFilteredRows.filter((r) => r.valid).map((r) => r.rowNumber),
    [bulkFilteredRows]
  );

  const toggleBulkRowSelected = (rowNumber: number) => {
    setBulkSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const handleToggleSelectAllFilteredRows = () => {
    const allSelected =
      bulkSelectableRowNumbers.length > 0 && bulkSelectableRowNumbers.every((n) => bulkSelectedRows.has(n));
    setBulkSelectedRows(allSelected ? new Set() : new Set(bulkSelectableRowNumbers));
  };

  // The actual "cargador masivo de categoría": one dropdown pick applied
  // to every selected row at once.
  const handleBulkAssignCategory = () => {
    if (!bulkAssignCategoryId || bulkSelectedRows.size === 0) return;
    setBulkPreviewRows((prev) =>
      prev ? prev.map((r) => (bulkSelectedRows.has(r.rowNumber) ? { ...r, categoryId: bulkAssignCategoryId } : r)) : prev
    );
    setBulkSelectedRows(new Set());
    setBulkAssignCategoryId("");
  };

  // Saca las filas seleccionadas de la pre-carga por completo — para
  // productos del Excel que en realidad no querés publicar (no toca la
  // base, esto todavía es solo la revisión previa a "Confirmar y Publicar").
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const handleBulkDeleteSelected = () => {
    setBulkPreviewRows((prev) => (prev ? prev.filter((r) => !bulkSelectedRows.has(r.rowNumber)) : prev));
    setBulkSelectedRows(new Set());
    setShowBulkDeleteConfirm(false);
  };

  // Funciones para la gestión de imágenes
  // Uploads files to Supabase Storage bucket "listings" and stores public URLs
  const handleImageFiles = async (files: FileList) => {
    const supabase = getSupabase();
    const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));

    if (fileArray.length === 0) return;

    const sellerId = sellerProfile?.id ?? userId ?? "unknown";
    // Use a temporary listing ID placeholder during creation; will be replaced on publish
    const tempListingId = selectedListingToEdit?.id ?? `tmp-${Date.now()}`;

    setIsUploadingImages(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of fileArray) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `${sellerId}/${tempListingId}/${filename}`;

        const { error } = await supabase.storage
          .from("listings")
          .upload(path, file, { upsert: false });

        if (!error) {
          const { data: urlData } = supabase.storage
            .from("listings")
            .getPublicUrl(path);

          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
          }
        } else {
          // Fallback: read as base64 for preview when storage is not yet configured
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          uploadedUrls.push(base64);
        }
      }

      setProductImages((prev) => [...prev, ...uploadedUrls]);
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Drag and Drop (reordenamiento nativo)
  const handleImageDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleImageDrop = (index: number) => {
    if (draggingIndex === null) return;
    const reordered = [...productImages];
    const [removed] = reordered.splice(draggingIndex, 1);
    reordered.splice(index, 0, removed);
    setProductImages(reordered);
    setDraggingIndex(null);
  };

  // Borrado y selección
  const toggleSelectImage = (img: string) => {
    if (selectedImages.includes(img)) {
      setSelectedImages(selectedImages.filter(x => x !== img));
    } else {
      setSelectedImages([...selectedImages, img]);
    }
  };

  const handleSelectAllImages = () => {
    if (selectedImages.length === productImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages([...productImages]);
    }
  };

  const handleDeleteSelectedImages = () => {
    const filtered = productImages.filter(img => !selectedImages.includes(img));
    setProductImages(filtered);
    setSelectedImages([]);
  };

  const handleDeleteSingleImage = (index: number) => {
    const imgToDelete = productImages[index];
    setProductImages(productImages.filter((_, idx) => idx !== index));
    setSelectedImages(selectedImages.filter(x => x !== imgToDelete));
  };

  // Formatear precio reactivamente cuando cambia la moneda o el precio
  useEffect(() => {
    if (price) {
      const activeCurrency = currencies.find(c => c.id === currencyId);
      const symbol = activeCurrency ? activeCurrency.symbol : "$";
      const cleanVal = price.replace(/[^0-9]/g, "");
      if (cleanVal) {
        const formatted = parseInt(cleanVal, 10).toLocaleString("es-AR");
        setPriceDisplay(`${symbol} ${formatted}`);
      } else {
        setPriceDisplay("");
      }
    } else {
      setPriceDisplay("");
    }
  }, [currencyId, price, currencies]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const cleanVal = inputVal.replace(/[^0-9]/g, "");
    setPrice(cleanVal);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (!categoryId) {
      setErrorMsg("Seleccioná una categoría para tu publicación.");
      setLoading(false);
      return;
    }

    // Obtener la categoría seleccionada
    const selectedCategory = categories.find((cat) => cat.id === categoryId);

    // Validar atributos obligatorios antes de enviar
    if (selectedCategory?.attributesSchema?.required) {
      for (const reqField of selectedCategory.attributesSchema.required) {
        if (reqField === 'brand') continue; // Sincronizado dinámicamente con el input de marca
        const value = dynamicAttributes[reqField];
        if (value === undefined || value === null || value === '') {
          setErrorMsg(`El atributo '${reqField}' es obligatorio para la categoría '${selectedCategory.name.replace("↳ ", "")}'.`);
          setLoading(false);
          return;
        }
      }
    }

    try {
      // Sincronizar brand de primer nivel en los atributos
      const productAttributes = { ...dynamicAttributes };
      if (brand) {
        productAttributes.brand = brand;
      }

      const supabase = getSupabase();
      const defaultImage = "/sinimagen.png";
      const imageList = productImages.length > 0 ? productImages : [defaultImage];

      if (selectedListingToEdit) {
        // Mode: EDIT — update product + listing via Supabase
        const productId = selectedListingToEdit.products?.id;

        if (productId) {
          const { error: productError } = await supabase
            .from("products")
            .update({
              name: productName,
              brand,
              description,
              category_id: categoryId || null,
              images: imageList,
              attributes: productAttributes,
            })
            .eq("id", productId);

          if (productError) throw new Error(productError.message);
        }

        const { error: listingError } = await supabase
          .from("listings")
          .update({
            price: parseFloat(price),
            stock: parseInt(stock),
            condition,
            featured_plan: featuredPlan,
            currency_id: currencyId || null,
            image_url: imageList[0] ?? null,
            status,
          })
          .eq("id", selectedListingToEdit.id);

        if (listingError) throw new Error(listingError.message);

        setSuccessMsg("¡Publicación actualizada con éxito!");

        // Reset form & exit edit mode
        setSelectedListingToEdit(null);
        setProductName("");
        setBrand("");
        setDescription("");
        setPrice("");
        setStock("1");
        setProductImages([]);
        setSelectedImages([]);
        setCategoryId("");
        setFeaturedPlan("FREE");
        setDynamicAttributes({});
        setStatus("APPROVED");

        await refreshListings();
        setActiveTab("inventory");
      } else {
        // Mode: CREATE
        // Step 1: Create product
        const { data: productData, error: productError } = await supabase
          .from("products")
          .insert({
            name: productName,
            brand,
            description,
            category_id: categoryId || null,
            images: imageList,
            attributes: productAttributes,
          })
          .select("id")
          .single();

        if (productError || !productData) {
          throw new Error(productError?.message || "Error al registrar el producto.");
        }

        // Step 2: Create listing
        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .insert({
            product_id: productData.id,
            seller_id: sellerProfile!.id,
            price: parseFloat(price),
            condition,
            stock: parseInt(stock),
            featured_plan: featuredPlan,
            currency_id: currencyId || null,
            image_url: imageList[0] ?? null,
            status: "APPROVED",
          })
          .select(`
            id, price, condition, stock, status, featured_plan, currency_id, image_url,
            products ( id, name, brand, description, category_id, images, attributes )
          `)
          .single();

        if (listingError) throw new Error(listingError.message);

        setMyListings([listingData as unknown as Listing, ...myListings]);
        setSuccessMsg("¡Publicación creada con éxito! Ya se encuentra activa.");

        // Si tildó compartir en redes, generamos ya la imagen con sello +
        // texto listo para pegar (ver comentario en handlePublishAndShare
        // más abajo sobre por qué esto no es un auto-posteo real todavía).
        if (shareConsent && shareToSocial.length > 0) {
          handleGenerateSocialShareAssets(listingData.id, shareToSocial);
        }

        // Reset form
        setProductName("");
        setBrand("");
        setDescription("");
        setPrice("");
        setStock("1");
        setProductImages([]);
        setSelectedImages([]);
        setCategoryId("");
        setFeaturedPlan("FREE");
        setDynamicAttributes({});
        setShareToSocial([]);
        setShareConsent(false);
      }
    } catch (err: any) {
      console.error("Error al procesar la publicación:", err);
      setErrorMsg("Ocurrió un error al procesar tu publicación.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (id: string, amount: number) => {
    const listing = myListings.find((l) => l.id === id);
    if (!listing) return;

    const newStock = Math.max(0, listing.stock + amount);
    const supabase = getSupabase();

    try {
      const { error } = await supabase
        .from("listings")
        .update({ stock: newStock })
        .eq("id", id);

      if (error) throw new Error(error.message);

      setMyListings(myListings.map((l) => (l.id === id ? { ...l, stock: newStock } : l)));
    } catch (err: any) {
      console.error("Error al actualizar stock:", err);
      alert("Error al actualizar stock.");
    }
  };

  const refreshListings = async () => {
    if (!sellerProfile) return;
    const supabase = getSupabase();
    try {
      const { data } = await supabase
        .from("listings")
        .select(`
          id, price, condition, stock, status, featured_plan, currency_id, image_url,
          products ( id, name, brand, description, category_id, images, attributes )
        `)
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false });

      if (data) setMyListings(data as unknown as Listing[]);
    } catch (err) {
      console.error("Error refreshing listings:", err);
    }
  };

  const handleCloneListing = async (id: string) => {
    if (!sellerProfile) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    const supabase = getSupabase();
    try {
      // Fetch original listing
      const { data: original, error } = await supabase
        .from("listings")
        .select("price, condition, stock, featured_plan, currency_id, image_url, product_id")
        .eq("id", id)
        .single();

      if (error || !original) throw new Error("No se pudo obtener la publicación original.");

      const { error: cloneError } = await supabase
        .from("listings")
        .insert({
          product_id: original.product_id,
          seller_id: sellerProfile.id,
          price: original.price,
          condition: original.condition,
          stock: original.stock,
          featured_plan: "FREE",
          currency_id: original.currency_id,
          image_url: original.image_url,
          status: "APPROVED",
        });

      if (cloneError) throw new Error(cloneError.message);

      setSuccessMsg("¡Publicación clonada con éxito!");
      await refreshListings();
    } catch (err: any) {
      console.error("Error al clonar la publicación:", err);
      setErrorMsg("Error al clonar la publicación.");
    } finally {
      setLoading(false);
    }
  };

  const AVATAR_EXT_BY_MIME: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sellerProfile) return;

    setAvatarError("");
    const ext = AVATAR_EXT_BY_MIME[file.type];
    if (!ext) {
      setAvatarError("Formato no soportado. Usá PNG, JPG, WEBP o GIF.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("La imagen no puede superar los 3MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const supabase = getSupabase();
      const path = `${sellerProfile.user_id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust: same path every time (upsert), so without this the
      // <img> would keep showing the browser-cached old photo.
      const freshUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from("sellers")
        .update({ avatar_url: freshUrl })
        .eq("id", sellerProfile.id);
      if (dbError) throw dbError;

      setAvatarUrl(freshUrl);
      setSellerProfile((prev) => (prev ? { ...prev, avatar_url: freshUrl } : prev));
      // The header loads the profile once on mount/auth-change — without
      // this it keeps showing the old avatar until a full page reload.
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.error("Error al subir la foto de perfil:", err);
      setAvatarError("No se pudo subir la imagen. Intentá de nuevo.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerProfile) return;
    setProfileSaving(true);
    setProfileSuccessMsg("");
    setProfileErrorMsg("");

    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from("sellers")
        .update({
          name: profileName,
          type: profileType,
          phone: profilePhone,
          location: profileLocation || null,
          document_number: profileDocumentNumber || null,
          bio: profileBio || null,
          bank_cbu: bankCbu.trim() || null,
          bank_alias: bankAlias.trim() || null,
        })
        .eq("id", sellerProfile.id);

      if (error) throw new Error(error.message);

      setSellerProfile({
        ...sellerProfile,
        name: profileName,
        type: profileType,
        phone: profilePhone,
        location: profileLocation || null,
        document_number: profileDocumentNumber || null,
        bio: profileBio || null,
        bank_cbu: bankCbu.trim() || null,
        bank_alias: bankAlias.trim() || null,
      });
      setProfileSuccessMsg("¡Datos actualizados con éxito!");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      console.error("Error al guardar el perfil:", err);
      setProfileErrorMsg("No se pudieron guardar los cambios.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Load every question across all of this seller's listings when the
  // "Consultas" tab is opened — mirrors HeaderSessionBar's fetchNotifications
  // query shape exactly (same table, same embedded relations).
  useEffect(() => {
    if (activeTab !== "questions" || !sellerProfile) return;

    const fetchQuestions = async () => {
      if (myListings.length === 0) {
        setQuestions([]);
        return;
      }
      setQuestionsLoading(true);
      const supabase = getSupabase();
      try {
        const { data } = await supabase
          .from("questions")
          .select(`
            *,
            buyer:sellers!questions_buyer_id_fkey ( * ),
            listing:listings!questions_listing_id_fkey (
              id,
              product:products ( name )
            )
          `)
          .in("listing_id", myListings.map((l) => l.id))
          .order("created_at", { ascending: false });

        setQuestions((data ?? []) as unknown as QuestionWithBuyer[]);
      } catch (err) {
        console.error("Error al cargar las consultas:", err);
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, [activeTab, sellerProfile, myListings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loads per-listing view counts (unique visitors/day, see listing_views
  // migration) for the "Visitas" column in "Mis Publicaciones". Only fired
  // when that tab is open — no point tracking it while browsing other tabs.
  useEffect(() => {
    if (activeTab !== "inventory" || myListings.length === 0) return;

    const fetchViewCounts = async () => {
      try {
        const ids = myListings.map((l) => l.id).join(",");
        const res = await fetch(`/api/listings/views?ids=${encodeURIComponent(ids)}`);
        if (!res.ok) return;
        const counts = await res.json();
        setViewCounts(counts);
      } catch (err) {
        console.error("Error al cargar las visitas:", err);
      }
    };

    fetchViewCounts();
  }, [activeTab, myListings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Which listings currently have an active highlight (paid or
  // reward-earned) and until when — drives the "Destacar" button vs.
  // "Destacado hasta DD/MM" badge in "Mis Publicaciones".
  useEffect(() => {
    if (activeTab !== "inventory" || myListings.length === 0) return;

    const fetchHighlights = async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("highlighted_products")
          .select("listing_id, end_date")
          .in("listing_id", myListings.map((l) => l.id))
          .gt("end_date", new Date().toISOString());

        const map: Record<string, string> = {};
        (data ?? []).forEach((h) => { map[h.listing_id] = h.end_date; });
        setHighlightedUntil(map);
      } catch (err) {
        console.error("Error al cargar destacados activos:", err);
      }
    };

    fetchHighlights();
  }, [activeTab, myListings]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "inventory") return;

    const fetchHighlightSettings = async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("platform_settings")
        .select("highlight_price, highlight_duration_days")
        .eq("id", true)
        .single();
      if (data) {
        setHighlightSettings({ price: data.highlight_price, durationDays: data.highlight_duration_days });
      }
    };

    fetchHighlightSettings();
  }, [activeTab]);

  const handleHighlightListing = async (listingId: string) => {
    setHighlightingListingId(listingId);
    setErrorMsg("");
    try {
      const res = await fetch("/api/highlights/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo iniciar el pago");
      }
      window.location.href = data.url;
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo iniciar el pago del destacado.");
      setHighlightingListingId(null);
    }
  };

  // Buyer + purchase date for sold-out listings (status SOLD), shown next
  // to the "Vendido" badge — same table/relation "Mis Ventas" already uses.
  useEffect(() => {
    if (activeTab !== "inventory") return;
    const soldIds = myListings.filter((l) => l.status === "SOLD").map((l) => l.id);
    if (soldIds.length === 0) return;

    const fetchSoldOrders = async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("orders")
          .select("listing_id, paid_at, buyer:sellers!orders_buyer_id_fkey(name)")
          .in("listing_id", soldIds)
          .eq("status", "PAID");

        const map: Record<string, { buyerName: string; paidAt: string }> = {};
        (data ?? []).forEach((o: any) => {
          if (o.paid_at) map[o.listing_id] = { buyerName: o.buyer?.name ?? "—", paidAt: o.paid_at };
        });
        setSoldOrders(map);
      } catch (err) {
        console.error("Error al cargar los datos de venta:", err);
      }
    };

    fetchSoldOrders();
  }, [activeTab, myListings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loaded once (not per-tab): both the "Redes Sociales" tab AND the
  // "Compartir en redes sociales" checkboxes on the publish form need to
  // know which platforms are already connected.
  useEffect(() => {
    if (!userId || socialAccountsLoaded) return;

    const fetchSocialAccounts = async () => {
      try {
        const res = await fetch("/api/sellers/social-accounts");
        if (!res.ok) return;
        const data = await res.json();
        setSocialAccounts(data.accounts ?? []);
      } catch (err) {
        console.error("Error al cargar las redes sociales:", err);
      } finally {
        setSocialAccountsLoaded(true);
      }
    };

    fetchSocialAccounts();
  }, [userId, socialAccountsLoaded]);

  // "Vincular" hoy es manual (guardamos el handle), no OAuth real — ver
  // 020_social_accounts.sql para por qué (aprobación pendiente de
  // Meta/TikTok). Deja la cuenta lista para cuando sí exista OAuth.
  const handleConnectSocial = async (platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK") => {
    const handle = socialHandleInputs[platform]?.trim();
    if (!handle) return;

    setSocialConnecting(platform);
    try {
      const res = await fetch("/api/sellers/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo vincular la cuenta.");

      setSocialAccounts((prev) => [...prev.filter((a) => a.platform !== platform), data.account]);
      setSocialHandleInputs((prev) => ({ ...prev, [platform]: "" }));
    } catch (err: any) {
      console.error("Error al vincular red social:", err);
      setErrorMsg(err.message || "No se pudo vincular la cuenta.");
    } finally {
      setSocialConnecting(null);
    }
  };

  const handleDisconnectSocial = async (platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK") => {
    setSocialDisconnecting(platform);
    try {
      const res = await fetch(`/api/sellers/social-accounts/${platform}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo desvincular la cuenta.");
      setSocialAccounts((prev) => prev.filter((a) => a.platform !== platform));
      setShareToSocial((prev) => prev.filter((p) => p !== platform));
    } catch (err: any) {
      console.error("Error al desvincular red social:", err);
      setErrorMsg(err.message || "No se pudo desvincular la cuenta.");
    } finally {
      setSocialDisconnecting(null);
    }
  };

  const toggleShareToSocial = (platform: string) => {
    setShareToSocial((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  // Genera la imagen con el sello de Compraventa Online + el texto listo
  // para pegar, y los muestra en un modal — hasta que exista el
  // auto-posteo real (OAuth aprobado), esto es lo que le da valor HOY al
  // vendedor: nosotros armamos el material, él lo pega a mano.
  const handleGenerateSocialShareAssets = async (listingId: string, platforms: string[]) => {
    setShareModalLoading(true);
    setShareModalData(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/social-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el material para compartir.");
      setShareModalData({ imageDataUrl: data.imageDataUrl, caption: data.caption });
    } catch (err: any) {
      console.error("Error al generar el material para redes:", err);
      setErrorMsg(err.message || "No se pudo generar el material para compartir.");
    } finally {
      setShareModalLoading(false);
    }
  };

  // Turns the watermarked data URL into a real File — required by
  // navigator.share({ files }), which is what lets the OS share sheet
  // hand the actual image (not just a link) to Instagram/WhatsApp.
  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
  };

  // macOS Safari/Chrome also implement navigator.share/canShare for files,
  // but the OS share sheet they pop has no Instagram target (there's no
  // native Mac app) — only Mail/Messages/AirDrop/etc. So feature-detecting
  // navigator.share isn't enough to decide the desktop fallback; we need to
  // know it's an actual mobile device first.
  const isMobileDevice = (): boolean => {
    if (typeof navigator === "undefined") return false;
    const uaData = (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData;
    if (uaData && typeof uaData.mobile === "boolean") return uaData.mobile;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  };

  // Mobile (Chrome Android / Safari iOS 15+): navigator.share with an
  // actual image file pops the native OS share sheet with the photo
  // already attached — the user taps Instagram/WhatsApp there and the
  // official app opens ready to post, nothing more for them to configure.
  // Desktop has no equivalent (no browser can force-open a native app with
  // content preloaded), so there we fall back to copying the caption and
  // opening the platform's own site — same tradeoff every browser-based
  // "share to social" flow makes, not something we can code around.
  const shareImageNatively = async (caption: string, imageDataUrl: string): Promise<boolean> => {
    if (!isMobileDevice()) return false;
    if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
    try {
      const file = await dataUrlToFile(imageDataUrl, "compraventaonline.png");
      if (!navigator.canShare({ files: [file] })) return false;
      await navigator.share({ files: [file], text: caption });
      return true;
    } catch (err) {
      // AbortError = user cancelled the share sheet, not a real failure.
      if ((err as Error)?.name !== "AbortError") {
        console.error("Error al compartir de forma nativa:", err);
      }
      return true; // sheet did open — don't also run the desktop fallback
    }
  };

  const handleShareToInstagram = async () => {
    if (!shareModalData) return;
    const shared = await shareImageNatively(shareModalData.caption, shareModalData.imageDataUrl);
    if (shared) return;

    // Desktop: Instagram's web version doesn't accept a prefilled post via
    // URL, so the fastest honest path is "copiá el texto, te dejamos la
    // pestaña de Instagram abierta, pegá la foto que ya descargaste".
    try {
      await navigator.clipboard.writeText(shareModalData.caption);
    } catch (err) {
      console.error("Error al copiar el texto:", err);
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const handleShareToWhatsAppStatus = async () => {
    if (!shareModalData) return;
    const shared = await shareImageNatively(shareModalData.caption, shareModalData.imageDataUrl);
    if (shared) return;

    // Desktop: there's no web-triggerable way into WhatsApp's Status
    // composer specifically (only WhatsApp's own mobile UI has that) —
    // wa.me opens WhatsApp Web's chat compose instead, which is the
    // closest real equivalent from a desktop browser.
    window.open(`https://wa.me/?text=${encodeURIComponent(shareModalData.caption)}`, "_blank", "noopener,noreferrer");
  };

  const handleReplyToQuestion = async (questionId: string) => {
    if (!questionReplyText.trim()) return;
    const supabase = getSupabase();
    const { error } = await supabase
      .from("questions")
      .update({ answer: questionReplyText, status: "ANSWERED", is_read_by_buyer: false })
      .eq("id", questionId);

    if (error) {
      alert("Error al enviar la respuesta.");
      return;
    }

    setReplyingToQuestionId(null);
    setQuestionReplyText("");
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, answer: questionReplyText, status: "ANSWERED" } : q))
    );
  };

  const handleToggleQuestionHidden = async (questionId: string, currentlyHidden: boolean) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("questions")
      .update({ hidden_by_seller: !currentlyHidden })
      .eq("id", questionId);

    if (error) {
      alert("No se pudo actualizar la visibilidad de la consulta.");
      return;
    }

    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, hidden_by_seller: !currentlyHidden } : q))
    );
  };

  const handleDisconnectMercadoPago = async () => {
    setMpDisconnecting(true);
    try {
      const res = await fetch("/api/mercadopago/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("No se pudo desvincular la cuenta.");
      setSellerProfile((prev) => (prev ? { ...prev, mercadopago_connected: false } : prev));
      setProfileSuccessMsg("Cuenta de Mercado Pago desvinculada.");
    } catch (err: any) {
      console.error("Error al desvincular Mercado Pago:", err);
      setProfileErrorMsg("No se pudo desvincular la cuenta.");
    } finally {
      setMpDisconnecting(false);
    }
  };

  const handleStartKyc = async () => {
    setKycLoading(true);
    setProfileErrorMsg("");
    try {
      const res = await fetch("/api/kyc/session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar la verificación.");
      window.location.href = data.url;
    } catch (err: any) {
      console.error("Error al iniciar la verificación de identidad:", err);
      setProfileErrorMsg(err.message || "No se pudo iniciar la verificación de identidad.");
      setKycLoading(false);
    }
  };

  const handleConfirmTransfer = async (orderId: string) => {
    setConfirmingOrderId(orderId);
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "PAID", paid_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw new Error(error.message);
      setPendingTransferOrders((prev) => prev.filter((o) => o.id !== orderId));
      setProfileSuccessMsg("Pago confirmado. ¡Ya podés coordinar la entrega!");
    } catch (err: any) {
      console.error("Error al confirmar el pago:", err);
      setProfileErrorMsg("No se pudo confirmar el pago.");
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!sellerProfile) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id)
        .eq("seller_id", sellerProfile.id);

      if (error) throw new Error(error.message);

      setSuccessMsg("¡Publicación eliminada con éxito!");
      await refreshListings();
    } catch (err: any) {
      console.error("Error al eliminar la publicación:", err);
      setErrorMsg("Error al eliminar la publicación.");
    } finally {
      setLoading(false);
      setListingIdToDelete(null);
    }
  };

  const handleUpdateStatusDirectly = async (listingId: string, newStatus: string) => {
    setActiveStatusDropdownListingId(null);
    setStatusUpdating(true);
    setErrorMsg("");
    setSuccessMsg("");
    const supabase = getSupabase();
    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: newStatus })
        .eq("id", listingId);

      if (error) throw new Error(error.message);

      setSuccessMsg("¡Estado de publicación actualizado!");
      await refreshListings();
    } catch (err: any) {
      console.error("Error al actualizar el estado de la publicación:", err);
      setErrorMsg("Error al actualizar el estado.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleOpenEditModal = (listing: Listing) => {
    setSelectedListingToEdit(listing);
    const product = listing.products;
    setProductName(product?.name ?? "");
    setBrand(product?.brand ?? "");
    setDescription(product?.description ?? "");
    setPrice(listing.price.toString());
    setCondition(listing.condition);
    setStock(listing.stock.toString());
    setCategoryId(product?.category_id ?? "");
    setFeaturedPlan(listing.featured_plan ?? "FREE");
    setCurrencyId(listing.currency_id ?? "");
    setStatus(listing.status);

    // Set images (prefer the full product images array; image_url is just the cover shot)
    const images = product?.images && product.images.length > 0
      ? product.images
      : (listing.image_url ? [listing.image_url] : []);
    setProductImages(images);
    setSelectedImages([]);

    // Set dynamic attributes
    setDynamicAttributes(product?.attributes ?? {});

    setSuccessMsg("");
    setErrorMsg("");
    setActiveTab("publish");
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleClaimReward = async (rewardId: string, listingId: string) => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    const supabase = getSupabase();
    try {
      // Mark reward as claimed
      const { error: rewardError } = await supabase
        .from("seller_rewards")
        .update({ claimed: true, claimed_at: new Date().toISOString() })
        .eq("id", rewardId);

      if (rewardError) throw new Error(rewardError.message);

      // Highlight the chosen listing
      const reward = rewards.find((r) => r.id === rewardId);
      if (reward) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (reward.duration_days ?? 30));

        await supabase.from("highlighted_products").insert({
          listing_id: listingId,
          seller_id: sellerProfile!.id,
          plan: reward.plan ?? "FEATURED",
          end_date: endDate.toISOString(),
        });

        // Also update listing featured_plan
        await supabase
          .from("listings")
          .update({ featured_plan: reward.plan ?? "FEATURED" })
          .eq("id", listingId);
      }

      setSuccessMsg("¡Recompensa canjeada con éxito! Tu publicación ahora está destacada.");
      setSelectedRewardToClaim(null);
      setSelectedListingForReward("");
      setRewards(rewards.map((r) => r.id === rewardId ? { ...r, claimed: true, claimed_at: new Date().toISOString() } : r));
      await refreshListings();
    } catch (err: any) {
      console.error("Error al canjear la recompensa:", err);
      setErrorMsg("Ocurrió un error al canjear la recompensa.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    // Hard redirect on purpose — see the same handler in HeaderSessionBar.tsx.
    window.location.href = "/";
  };

  if (!mounted || pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-gold border-t-transparent"></div>
          <span className="text-sm font-semibold text-text-muted">Cargando panel de control pampeano...</span>
        </div>
      </div>
    );
  }

  if (!sellerProfile) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-16 text-center">
        <span className="text-5xl">🌾</span>
        <h2 className="font-heading text-2xl font-bold text-foreground mt-4">Perfil no encontrado</h2>
        <p className="text-text-muted text-sm mt-2">No pudimos vincular un perfil comercial con esta cuenta de usuario.</p>
        <button 
          onClick={handleLogout} 
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-6 py-3 text-xs font-bold text-background shadow-md cursor-pointer"
        >
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full relative">
      <div className="fixed top-32 right-6 z-[100] flex flex-col gap-3 max-w-sm pointer-events-none">
        {errorMsg && <Toast type="error" message={errorMsg} onClose={() => setErrorMsg("")} />}
        {successMsg && <Toast type="success" message={successMsg} onClose={() => setSuccessMsg("")} />}
        {profileErrorMsg && <Toast type="error" message={profileErrorMsg} onClose={() => setProfileErrorMsg("")} />}
        {profileSuccessMsg && <Toast type="success" message={profileSuccessMsg} onClose={() => setProfileSuccessMsg("")} />}
      </div>

      {/* Badge flotante llamativo — desaparece solo una vez que vinculó
          al menos una red, para no seguir insistiendo después de eso. */}
      {socialAccountsLoaded && socialAccounts.length === 0 && activeTab !== "social" && (
        <button
          type="button"
          onClick={() => { setActiveTab("social"); setSuccessMsg(""); setErrorMsg(""); }}
          className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-gold to-accent-gold-hover text-background pl-4 pr-5 py-3 text-xs font-extrabold shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer animate-bounce"
        >
          <span className="text-base">📱</span>
          Publicá también en tus redes sociales
        </button>
      )}

      {/* Modal "compartir" post-publicación: imagen con sello + texto
          listo para pegar en cada red, hasta que exista el auto-posteo
          real (ver 020_social_accounts.sql). */}
      {(shareModalLoading || shareModalData) && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card-bg-solid border border-card-border rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl p-6 gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">¡Listo para compartir!</h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Descargá la imagen y copiá el texto para pegarlo en tus redes.
                </p>
              </div>
              <button
                onClick={() => setShareModalData(null)}
                className="text-text-muted hover:text-foreground text-lg cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {shareModalLoading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent"></div>
                <span className="text-xs font-bold text-text-muted">Armando la imagen con el sello...</span>
              </div>
            ) : shareModalData && (
              <>
                <div className="rounded-xl overflow-hidden border border-card-border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shareModalData.imageDataUrl} alt="Imagen para compartir" className="w-full h-auto" />
                </div>

                {/* En el celular esto abre la bandeja nativa de compartir
                    con la foto ya adjunta — el usuario solo elige la app y
                    presiona publicar. En computadora no hay forma de
                    precargar una app nativa, así que copiamos el texto y
                    abrimos la web de la plataforma para pegar la foto a
                    mano (ver comentario en shareImageNatively). */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShareToInstagram}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-400 py-3 text-xs font-extrabold text-white shadow-md hover:opacity-90 transition-all cursor-pointer"
                  >
                    📸 Instagram
                  </button>
                  <button
                    type="button"
                    onClick={handleShareToWhatsAppStatus}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-accent-green py-3 text-xs font-extrabold text-background shadow-md hover:opacity-90 transition-all cursor-pointer"
                  >
                    💬 Estado de WhatsApp
                  </button>
                </div>

                <a
                  href={shareModalData.imageDataUrl}
                  download="compraventaonline-publicacion.png"
                  className="text-center rounded-xl border border-card-border py-2.5 text-xs font-bold text-foreground hover:border-accent-gold hover:text-accent-gold transition-all"
                >
                  📥 Descargar imagen
                </a>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-foreground">Texto para la publicación</span>
                  <textarea
                    readOnly
                    value={shareModalData.caption}
                    rows={6}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(shareModalData.caption)}
                    className="rounded-xl border border-card-border py-2.5 text-xs font-bold text-foreground hover:border-accent-gold hover:text-accent-gold transition-all cursor-pointer"
                  >
                    📋 Copiar texto
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {statusUpdating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3 bg-card-bg border border-card-border p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-blue border-t-transparent"></div>
            <span className="text-sm font-semibold text-foreground">Actualizando estado...</span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-5 border-b border-card-border pb-6 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground">Panel de Vendedor</h1>
          <p className="text-text-muted text-sm mt-1">
            Gestioná tus publicaciones, controlá tu stock y consultá tus métricas comerciales.
          </p>
        </div>

        {/* Navigation Tabs — own full-width row, not squeezed next to the
            title anymore (that's what was forcing "Mis Datos" onto a
            second line even with whitespace-nowrap: not enough room). */}
        <div className="flex flex-wrap w-full bg-card-bg border border-card-border p-1 rounded-xl gap-y-1">
            <button
              onClick={() => {
                setActiveTab("summary");
                setSuccessMsg("");
                setErrorMsg("");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "summary" ? "bg-accent-blue text-background shadow-md" : "text-foreground/80 hover:text-accent-blue"
              }`}
            >
              Resumen
            </button>
            <button 
              onClick={() => {
                if (selectedListingToEdit) {
                  setSelectedListingToEdit(null);
                  setProductName("");
                  setBrand("");
                  setDescription("");
                  setPrice("");
                  setStock("1");
                  setProductImages([]);
                  setSelectedImages([]);
                  setCategoryId("");
                  setFeaturedPlan("FREE");
                  setDynamicAttributes({});
                  setStatus("APPROVED");
                }
                setActiveTab("publish");
                setSuccessMsg("");
                setErrorMsg("");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "publish" ? "bg-accent-blue text-background shadow-md" : "text-foreground/80 hover:text-accent-blue"
              }`}
            >
              Publicar Artículo
            </button>
            <button 
              onClick={() => {
                if (selectedListingToEdit) {
                  setSelectedListingToEdit(null);
                  setProductName("");
                  setBrand("");
                  setDescription("");
                  setPrice("");
                  setStock("1");
                  setProductImages([]);
                  setSelectedImages([]);
                  setCategoryId("");
                  setFeaturedPlan("FREE");
                  setDynamicAttributes({});
                  setStatus("APPROVED");
                }
                setActiveTab("inventory");
                setSuccessMsg("");
                setErrorMsg("");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "inventory" ? "bg-accent-blue text-background shadow-md" : "text-foreground/80 hover:text-accent-blue"
              }`}
            >
              Mis Publicaciones ({myListings.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("questions");
                setSuccessMsg("");
                setErrorMsg("");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "questions" ? "bg-accent-blue text-background shadow-md" : "text-foreground/80 hover:text-accent-blue"
              }`}
            >
              Consultas
              {questions.filter((q) => !q.is_read_by_seller).length > 0 &&
                ` (${questions.filter((q) => !q.is_read_by_seller).length})`}
            </button>
            <button
              onClick={() => {
                if (selectedListingToEdit) {
                  setSelectedListingToEdit(null);
                  setProductName("");
                  setBrand("");
                  setDescription("");
                  setPrice("");
                  setStock("1");
                  setProductImages([]);
                  setSelectedImages([]);
                  setCategoryId("");
                  setFeaturedPlan("FREE");
                  setDynamicAttributes({});
                  setStatus("APPROVED");
                }
                setActiveTab("rewards");
                setSuccessMsg("");
                setErrorMsg("");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "rewards" ? "bg-accent-blue text-background shadow-md" : "text-foreground/80 hover:text-accent-blue"
              }`}
            >
              Mis Premios ({rewards.filter(r => !r.claimed).length})
            </button>
            <button
              onClick={() => {
                setActiveTab("social");
                setSuccessMsg("");
                setErrorMsg("");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "social" ? "bg-accent-blue text-background shadow-md" : "text-foreground/80 hover:text-accent-blue"
              }`}
            >
              Redes Sociales
            </button>
            <button
              onClick={() => {
                setActiveTab("profile");
                setProfileSuccessMsg("");
                setProfileErrorMsg("");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "profile" ? "bg-accent-blue text-background shadow-md" : "text-foreground/80 hover:text-accent-blue"
              }`}
            >
              Mis Datos
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* TAB 1: Summary */}
        {activeTab === "summary" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Seller profile card */}
            <div className="col-span-1 md:col-span-2 rounded-2xl glass-panel p-6 flex flex-col gap-4">
              <h3 className="font-heading text-sm font-extrabold text-foreground uppercase tracking-wider">Perfil Comercial</h3>
              <div>
                <h4 className="text-xl font-bold text-foreground">{sellerProfile.name}</h4>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-green/10 px-2.5 py-0.5 text-xs font-semibold text-accent-green border border-accent-green/20 mt-2">
                  Cuenta: {sellerProfile.type === "BUSINESS_SELLER" ? "Comercio / Empresa" : "Particular"}
                </span>
              </div>
              <div className="border-t border-card-border/50 pt-4 flex justify-between text-xs text-text-muted">
                <span>Plan Actual: <strong className="text-foreground">{sellerProfile.plan}</strong></span>
                {sellerHasSales ? (
                  <span>Tier de Venta: <strong className="text-accent-gold">{sellerProfile.tier}</strong></span>
                ) : (
                  <span className="italic">🌱 Sin ventas todavía</span>
                )}
              </div>
            </div>

            {/* Reputacion score */}
            <div className="rounded-2xl glass-panel p-6 flex flex-col items-center justify-center text-center">
              <h3 className="font-heading text-xs font-extrabold text-text-muted uppercase tracking-wider mb-2">Score del Vendedor</h3>
              {sellerHasSales ? (
                <>
                  <div className="relative flex items-center justify-center">
                    <span className="text-5xl font-extrabold text-accent-gold font-heading">{sellerProfile.score}</span>
                    <span className="text-lg text-text-muted mt-4">/100</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-3">Reputación excelente basada en tus últimas calificaciones pampeanas.</p>
                </>
              ) : (
                <>
                  <span className="text-4xl">🌱</span>
                  <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
                    Todavía no realizaste ninguna venta. Cuando completes la primera, vas a empezar a construir tu reputación acá.
                  </p>
                </>
              )}
            </div>

            {/* Active listings summary */}
            <div className="rounded-2xl glass-panel p-6 flex flex-col items-center justify-center text-center">
              <h3 className="font-heading text-xs font-extrabold text-text-muted uppercase tracking-wider mb-2">Publicaciones Activas</h3>
              <span className="text-5xl font-extrabold text-foreground font-heading">{myListings.length}</span>
              <p className="text-[10px] text-text-muted mt-4">Límite disponible: {sellerProfile.type === "BUSINESS_SELLER" ? "Ilimitado" : `${5 - myListings.length} de 5 libres`}</p>
            </div>

            {/* Rewards summary card */}
            <div className="col-span-1 md:col-span-4 rounded-2xl glass-panel p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>🎁</span> Premios y Beneficios del Vendedor
                </h4>
                <p className="text-xs text-text-muted mt-1">
                  Tenés beneficios por tu reputación para destacar tus artículos de forma gratuita.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("rewards")}
                className="bg-accent-gold hover:bg-accent-gold-hover text-background text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                Ver mis premios ({rewards.filter(r => !r.claimed).length} disponibles)
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: Publish Form */}
        {activeTab === "publish" && (
          // La carga individual se queda angosta (max-w-3xl) porque es un
          // formulario de un solo producto — pero la subida masiva
          // necesita todo el ancho disponible para que la tabla de
          // revisión no quede apretada con 8 columnas.
          <div className={`${publishMode === "bulk" ? "max-w-none" : "max-w-3xl"} mx-auto w-full rounded-2xl glass-panel p-8`}>
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">
              {selectedListingToEdit ? "Editar Publicación" : "Publicación de Artículos"}
            </h2>
            
            {/* Mode selector */}
            {!selectedListingToEdit && (
              <div className="flex border-b border-card-border mb-6">
                <button
                  onClick={() => {
                    setPublishMode("direct");
                    setSuccessMsg("");
                    setErrorMsg("");
                    setBulkErrors([]);
                  }}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    publishMode === "direct" ? "border-accent-gold text-foreground font-extrabold" : "border-transparent text-text-muted hover:text-foreground"
                  }`}
                >
                  Individual
                </button>
                <button
                  onClick={() => {
                    setPublishMode("bulk");
                    setSuccessMsg("");
                    setErrorMsg("");
                    setBulkErrors([]);
                  }}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    publishMode === "bulk" ? "border-accent-gold text-foreground font-extrabold" : "border-transparent text-text-muted hover:text-foreground"
                  }`}
                >
                  Subida Masiva (Excel)
                </button>
              </div>
            )}

            {publishMode === "direct" ? (
              <form onSubmit={handlePublish} className="flex flex-col gap-6">
                
                {/* 1. Categoría primero */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Categoría</label>
                  <CustomDropdown
                    name="categoryId"
                    defaultValue={categoryId}
                    onChange={(val) => {
                      setCategoryId(val);
                      setDynamicAttributes({});
                    }}
                    options={[
                      // Real placeholder, not just an empty defaultValue —
                      // without this CustomDropdown falls back to options[0]
                      // (whatever category sorts first alphabetically) both
                      // visually AND as the value it actually submits.
                      { name: "Seleccioná una categoría", value: "" },
                      ...categories
                        .filter((cat) => !cat.parentId)
                        .flatMap((root) => [
                          { name: root.name, value: root.id },
                          ...categories
                            .filter((cat) => cat.parentId === root.id)
                            .map((sub) => ({ name: sub.name, value: sub.id, groupLabel: root.name })),
                        ]),
                    ]}
                    showSearch={true}
                    placeholder="Buscar categoría..."
                  />
                </div>

                {/* 2. Atributos específicos de la categoría seleccionada (ej. Autos) */}
                {(() => {
                  const selectedCategory = categories.find((cat) => cat.id === categoryId);
                  const reqFields = selectedCategory?.attributesSchema?.required;
                  const hasFields = reqFields && Array.isArray(reqFields) && reqFields.filter(f => f !== 'brand').length > 0;
                  if (!hasFields) return null;

                  return (
                    <div className="border border-accent-gold/20 bg-accent-gold/[0.02] p-5 rounded-2xl flex flex-col gap-4 animate-in fade-in duration-200">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-accent-gold flex items-center gap-1.5">
                        <span>🔧</span> Atributos específicos para {selectedCategory.name.replace("↳ ", "")}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {reqFields.map((reqField: string) => {
                          if (reqField === 'brand') return null; // Marca ya se maneja en el formulario general

                          const prop = selectedCategory.attributesSchema.properties?.[reqField];
                          const label = reqField === 'ram' ? 'Memoria RAM' : 
                                        reqField === 'storage' ? 'Almacenamiento' : 
                                        reqField === 'processor' ? 'Procesador' : 
                                        reqField === 'storage_type' ? 'Tipo de Almacenamiento' : 
                                        reqField === 'year' ? 'Año' : 
                                        reqField === 'kilometers' ? 'Kilómetros' : 
                                        reqField === 'transmission' ? 'Transmisión' : 
                                        reqField === 'engine_displacement' ? 'Cilindrada' : reqField;

                          if (prop?.enum) {
                            return (
                              <div key={reqField} className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-foreground">{label}</label>
                                <CustomDropdown
                                  name={reqField}
                                  defaultValue={dynamicAttributes[reqField] || ""}
                                  onChange={(value) => setDynamicAttributes(prev => ({ ...prev, [reqField]: value }))}
                                  options={[
                                    { name: "Seleccionar...", value: "" },
                                    ...prop.enum.map((opt: string) => ({ name: opt, value: opt }))
                                  ]}
                                />
                              </div>
                            );
                          }

                          return (
                            <div key={reqField} className="flex flex-col gap-2">
                              <label className="text-xs font-bold text-foreground">{label}</label>
                              <input 
                                type={prop?.type === 'number' ? 'number' : 'text'}
                                required
                                value={dynamicAttributes[reqField] || ""}
                                onChange={(e) => {
                                  const val = prop?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                                  setDynamicAttributes(prev => ({ ...prev, [reqField]: val }));
                                }}
                                placeholder={`Ej. ${prop?.type === 'number' ? '2024' : '150cc'}`}
                                className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <hr className="border-card-border/30 my-1" />

                {/* 3. Datos Generales del Producto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-foreground">Nombre del Producto</label>
                    <input 
                      type="text" 
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Ej. Miel de Caldén o Amoladora Industrial" 
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-foreground">Marca</label>
                    <input 
                      type="text" 
                      required
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ej. Estancia La Pampa" 
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Descripción Técnica (opcional)</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalla las características del artículo..." 
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold resize-none"
                  />
                </div>

                {/* 4. Precio, Moneda y Estado de la Publicación */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-foreground">Moneda</label>
                    <CustomDropdown
                      name="currencyId"
                      defaultValue={currencyId}
                      onChange={setCurrencyId}
                      options={currencies.map((curr) => ({ name: `${curr.name} (${curr.symbol})`, value: curr.id }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-foreground">Precio</label>
                    <input 
                      type="text" 
                      required
                      value={priceDisplay}
                      onChange={handlePriceChange}
                      placeholder="Ej. $ 125.000" 
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-foreground">Condición</label>
                    <CustomDropdown
                      name="condition"
                      defaultValue={condition}
                      onChange={setCondition}
                      options={[
                        { name: "Nuevo", value: "NEW" },
                        { name: "Usado", value: "USED" },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-foreground">Stock Inicial</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="Ej. 5" 
                      className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Plan de Destacado (Monetización)</label>
                  <CustomDropdown
                    name="featuredPlan"
                    defaultValue={featuredPlan}
                    onChange={setFeaturedPlan}
                    options={[
                      { name: "Plan Gratuito (FREE)", value: "FREE" },
                      { name: "Plan Destacado (FEATURED)", value: "FEATURED" },
                      { name: "Plan Premium (PREMIUM)", value: "PREMIUM" },
                    ]}
                  />
                </div>

                {selectedListingToEdit && (
                  <div className="flex flex-col gap-2 mt-2 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-foreground">Estado de la Publicación</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setStatus("APPROVED")}
                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          status === "APPROVED"
                            ? "bg-accent-green/10 border-accent-green text-accent-green shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                            : "border-card-border hover:bg-card-bg/25 text-text-muted"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
                        PUBLICADO
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus("PAUSED")}
                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          status === "PAUSED"
                            ? "bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.15)]"
                            : "border-card-border hover:bg-card-bg/25 text-text-muted"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                        PAUSADO
                      </button>
                    </div>
                  </div>
                )}

                {/* Sección de carga de fotos */}
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-bold text-foreground">Imágenes del Producto</label>
                  
                  {/* Zona de Drop para Fotos */}
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all ${
                      isImagesDragging 
                        ? "border-accent-gold bg-accent-gold/5 shadow-inner scale-[0.99]" 
                        : "border-card-border hover:border-accent-gold/50 bg-card-bg/25"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsImagesDragging(true); }}
                    onDragLeave={() => setIsImagesDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsImagesDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleImageFiles(e.dataTransfer.files);
                      }
                    }}
                  >
                    {isUploadingImages ? (
                      <>
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent"></div>
                        <p className="text-xs font-bold text-foreground">Subiendo imágenes, esperá un momento...</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl animate-bounce duration-1000">📸</span>
                        <div>
                          <p className="text-xs font-bold text-foreground">Arrastrá tus imágenes aquí o hacé clic para buscar</p>
                          <p className="text-[10px] text-text-muted mt-1">Podés subir múltiples archivos (.png, .jpg, .webp). La primera foto será la portada.</p>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploadingImages}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleImageFiles(e.target.files);
                        }
                      }}
                      className="hidden"
                      id="product-images-input"
                    />
                    <label
                      htmlFor="product-images-input"
                      className="inline-flex items-center rounded-lg bg-card-bg border border-card-border hover:border-accent-gold px-4 py-2 text-[11px] font-bold text-foreground cursor-pointer transition-all mt-1 shadow-sm active:scale-95"
                    >
                      Seleccionar Imágenes
                    </label>
                  </div>

                  {/* Acciones Masivas y Miniaturas */}
                  {productImages.length > 0 && (
                    <div className="mt-4 flex flex-col gap-4">
                      {/* Barra de Acciones Masivas */}
                      <div className="flex items-center justify-between bg-card-bg-solid border border-card-border p-3.5 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={selectedImages.length === productImages.length}
                            onChange={handleSelectAllImages}
                            className="h-4 w-4 rounded border-card-border text-accent-gold focus:ring-accent-gold cursor-pointer"
                            id="select-all-images"
                          />
                          <label htmlFor="select-all-images" className="text-xs font-bold text-foreground cursor-pointer select-none">
                            Seleccionar todas ({productImages.length})
                          </label>
                        </div>
                        {selectedImages.length > 0 && (
                          <button
                            type="button"
                            onClick={handleDeleteSelectedImages}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-[10px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                            Eliminar seleccionadas ({selectedImages.length})
                          </button>
                        )}
                      </div>

                      {/* Grilla de Miniaturas */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {productImages.map((img, index) => {
                          const isSelected = selectedImages.includes(img);
                          const isCover = index === 0;
                          return (
                            <div 
                              key={index}
                              draggable
                              onDragStart={() => handleImageDragStart(index)}
                              onDragOver={(e) => handleImageDragOver(e, index)}
                              onDrop={() => handleImageDrop(index)}
                              onDragEnd={() => setDraggingIndex(null)}
                              className={`relative aspect-square rounded-xl overflow-hidden bg-background border transition-all cursor-grab active:cursor-grabbing select-none group shadow-sm ${
                                isSelected ? "border-accent-gold ring-2 ring-accent-gold/30" : "border-card-border hover:border-accent-gold/40"
                              } ${draggingIndex === index ? "opacity-30 scale-95" : ""}`}
                              title="Arrastrá para reordenar"
                            >
                              {/* Imagen */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={img} 
                                alt={`Producto ${index + 1}`} 
                                className="w-full h-full object-contain pointer-events-none"
                                onClick={() => setActiveCarouselIndex(index)}
                              />

                              {/* Badge Portada */}
                              {isCover && (
                                <span className="absolute bottom-1.5 left-1.5 bg-accent-gold text-background text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md pointer-events-none uppercase tracking-wider">
                                  Portada
                                </span>
                              )}

                              {/* Checkbox de Selección */}
                              <div className="absolute top-1.5 left-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectImage(img)}
                                  className="h-3.5 w-3.5 rounded border-card-border text-accent-gold focus:ring-accent-gold bg-card-bg-solid shadow-sm cursor-pointer"
                                />
                              </div>

                              {/* Botón Borrado Individual */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleImage(index)}
                                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-600 text-white p-1 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all shadow-md cursor-pointer flex items-center justify-center h-5 w-5 hover:scale-105 active:scale-95"
                                title="Eliminar imagen"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Compartir en redes sociales — solo al crear (no al
                    editar) y solo si hay al menos una cuenta vinculada. */}
                {!selectedListingToEdit && (
                  <div className="rounded-xl border border-card-border bg-card-bg/40 p-4 flex flex-col gap-3 mt-2">
                    <span className="text-xs font-bold text-foreground">📱 Compartir en redes sociales</span>
                    {socialAccounts.length === 0 ? (
                      <p className="text-[11px] text-text-muted">
                        Todavía no vinculaste ninguna red.{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("social")}
                          className="text-accent-gold font-bold hover:underline cursor-pointer"
                        >
                          Vincular ahora
                        </button>
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-3">
                          {socialAccounts.map((account) => {
                            const platformInfo = SOCIAL_PLATFORMS.find((p) => p.key === account.platform);
                            return (
                              <label key={account.platform} className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={shareToSocial.includes(account.platform)}
                                  onChange={() => toggleShareToSocial(account.platform)}
                                  className="h-4 w-4 rounded border-card-border text-accent-gold focus:ring-accent-gold cursor-pointer"
                                />
                                {platformInfo?.icon} {platformInfo?.label} (@{account.handle})
                              </label>
                            );
                          })}
                        </div>
                        {shareToSocial.length > 0 && (
                          <label className="flex items-start gap-2 text-[11px] text-text-muted cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={shareConsent}
                              onChange={(e) => setShareConsent(e.target.checked)}
                              className="h-4 w-4 mt-0.5 rounded border-card-border text-accent-gold focus:ring-accent-gold cursor-pointer shrink-0"
                            />
                            Autorizo publicar la descripción de este artículo y el link a esta
                            publicación en las redes sociales que tildé arriba.
                          </label>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  {selectedListingToEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        // Cancel editing and clear state
                        setSelectedListingToEdit(null);
                        setProductName("");
                        setBrand("");
                        setDescription("");
                        setPrice("");
                        setStock("1");
                        setProductImages([]);
                        setSelectedImages([]);
                        setCategoryId("");
                        setFeaturedPlan("FREE");
                        setDynamicAttributes({});
                        setStatus("APPROVED");
                        setActiveTab("inventory");
                      }}
                      className="flex-1 rounded-xl border border-card-border hover:bg-card-bg/25 py-4 text-xs font-bold text-foreground transition-all cursor-pointer text-center"
                    >
                      Cancelar Edición
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading || isUploadingImages}
                    className="flex-1 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-4 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isUploadingImages
                      ? "Subiendo imágenes..."
                      : loading
                        ? (selectedListingToEdit ? "Guardando Cambios..." : "Publicando en el Catálogo...")
                        : (selectedListingToEdit ? "Guardar Cambios" : "Confirmar Publicación")}
                  </button>
                </div>

              </form>
            ) : !bulkPreviewRows ? (
              // Paso 1: elegir el archivo
              <div className="flex flex-col gap-6">
                <div className="bg-card-bg border border-card-border p-4 rounded-xl text-xs text-text-muted flex flex-col gap-2">
                  <h4 className="font-bold text-foreground">Instrucciones de Subida Masiva:</h4>
                  <p>1. Descargá nuestra plantilla Excel e ingresá los detalles de tus productos.</p>
                  <p>2. Columnas requeridas: <strong>Nombre, Precio</strong>.</p>
                  <p>3. Columnas opcionales:
                    <br />• <strong>Marca</strong>, <strong>Descripción</strong>, <strong>Moneda</strong> (ARS o USD, por defecto ARS), <strong>Condición</strong> (NEW o USED), <strong>Stock</strong>.
                    <br />• <strong>Atributos</strong>: separados por punto y coma en formato <code>clave=valor;clave=valor</code> (ej: <code>ram=8GB;storage=256GB</code>).
                  </p>
                  <p>4. Subí el archivo. Después de leerlo vas a poder elegir la categoría y arrastrarle las fotos a cada producto antes de publicar nada.</p>

                  <button
                    onClick={downloadExcelTemplate}
                    className="self-start mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent-gold/30 hover:border-accent-gold text-accent-gold px-3 py-2 text-[11px] font-bold transition-all cursor-pointer bg-accent-gold/5"
                  >
                    📥 Descargar Plantilla Excel de Ejemplo
                  </button>
                </div>

                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors ${
                    isDragging
                      ? "border-accent-gold bg-accent-gold/5"
                      : csvFile
                        ? "border-accent-green/40 bg-accent-green/5"
                        : "border-card-border hover:border-accent-gold/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleCsvFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  {csvFile ? (
                    <>
                      <span className="h-10 w-10 rounded-full bg-accent-green/15 text-accent-green flex items-center justify-center text-xl">✓</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">{csvFile.name}</p>
                        <p className="text-[10px] text-text-muted mt-1">{(csvFile.size / 1024).toFixed(1)} KB — listo para revisar</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl">📄</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">Arrastrá tu archivo Excel aquí o hacé clic para buscar</p>
                        <p className="text-[10px] text-text-muted mt-1">Solo archivos .xlsx de hasta 5MB</p>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCsvFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="inline-flex items-center rounded-lg bg-card-bg border border-card-border hover:border-accent-gold px-4 py-2 text-[11px] font-bold text-foreground cursor-pointer transition-all mt-1"
                  >
                    {csvFile ? "Seleccionar otro archivo" : "Seleccionar Archivo"}
                  </label>
                </div>

                <button
                  onClick={handleBulkPreview}
                  disabled={bulkPreviewLoading || !csvFile}
                  className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-4 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all mt-2 disabled:opacity-50 cursor-pointer"
                >
                  {bulkPreviewLoading ? "Leyendo archivo..." : "Continuar y Revisar"}
                </button>
              </div>
            ) : (
              // Paso 2: revisión en tabla — la categoría y las fotos se
              // asignan por acción masiva (seleccionar filas + aplicar),
              // o abriendo el detalle de una sola fila con el botón ▼.
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Revisá antes de publicar</h4>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {bulkPreviewRows.filter((r) => r.valid && r.categoryId).length} de {bulkPreviewRows.length} filas listas para publicar.
                    </p>
                  </div>
                  <button
                    onClick={handleBulkReset}
                    className="text-[11px] font-bold text-text-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
                  >
                    ◀ Elegir otro archivo
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card-bg-solid border border-card-border rounded-xl p-3.5">
                  <input
                    type="text"
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    placeholder="Buscar por nombre (ej: notebook)..."
                    className="flex-1 bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                  />
                  {bulkSelectableRowNumbers.length > 0 && (
                    <label className="flex items-center gap-2 text-[11px] font-bold text-foreground cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={bulkSelectableRowNumbers.every((n) => bulkSelectedRows.has(n))}
                        onChange={handleToggleSelectAllFilteredRows}
                        className="h-4 w-4 rounded border-card-border text-accent-gold focus:ring-accent-gold cursor-pointer"
                      />
                      Seleccionar {bulkSearch.trim() ? "los filtrados" : "todos"} ({bulkSelectableRowNumbers.length})
                    </label>
                  )}
                </div>

                {/* Acción masiva: buscá (ej. "notebook"), tildá las filas
                    que matchean y aplicales categoría y/o fotos a todas
                    juntas — sin entrar fila por fila. */}
                {bulkSelectedRows.size > 0 && (
                  <div className="flex flex-col gap-3 bg-accent-gold/5 border border-accent-gold/30 rounded-xl p-3.5">
                    <span className="text-[11px] font-bold text-foreground">
                      {bulkSelectedRows.size} fila{bulkSelectedRows.size === 1 ? "" : "s"} seleccionada{bulkSelectedRows.size === 1 ? "" : "s"} — acción masiva:
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 max-w-xs">
                        <CustomDropdown
                          name="bulk-assign-category"
                          defaultValue={bulkAssignCategoryId}
                          onChange={setBulkAssignCategoryId}
                          options={bulkCategoryOptions}
                          showSearch
                          placeholder="Buscar categoría..."
                        />
                      </div>
                      <button
                        onClick={handleBulkAssignCategory}
                        disabled={!bulkAssignCategoryId}
                        className="rounded-lg bg-accent-gold text-background px-4 py-2 text-[11px] font-extrabold hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        Cambiar categoría
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/5 px-4 py-2 text-[11px] font-extrabold transition-all cursor-pointer shrink-0"
                      >
                        🗑 Eliminar
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-card-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-card-border bg-card-bg-solid text-[10px] font-bold text-text-muted uppercase tracking-wide">
                        <th className="p-3 text-left w-8"></th>
                        <th className="p-3 text-left">Producto</th>
                        <th className="p-3 text-left">Categoría</th>
                        <th className="p-3 text-right">Precio</th>
                        <th className="p-3 text-center">Cond. / Stock</th>
                        <th className="p-3 text-center">Fotos</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/50">
                      {bulkFilteredRows.map((row) => {
                        const categoryName = row.categoryId
                          ? categories.find((c) => c.id === row.categoryId)?.name
                          : null;
                        const isExpanded = bulkExpandedRow === row.rowNumber;
                        return (
                          <Fragment key={row.rowNumber}>
                            <tr className={!row.valid ? "bg-red-500/5" : "hover:bg-card-bg/40 transition-colors"}>
                              <td className="p-3 align-top">
                                {row.valid && (
                                  <input
                                    type="checkbox"
                                    checked={bulkSelectedRows.has(row.rowNumber)}
                                    onChange={() => toggleBulkRowSelected(row.rowNumber)}
                                    className="h-4 w-4 rounded border-card-border text-accent-gold focus:ring-accent-gold cursor-pointer"
                                  />
                                )}
                              </td>
                              <td className="p-3 align-top">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 rounded-lg overflow-hidden bg-background border border-card-border shrink-0 flex items-center justify-center">
                                    {row.images[0] ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={row.images[0]} alt="" className="h-full w-full object-contain" />
                                    ) : (
                                      <span className="text-text-muted text-xs">📦</span>
                                    )}
                                  </div>
                                  {row.valid ? (
                                    <div>
                                      <span className="font-bold text-foreground block">{row.name}</span>
                                      {row.brand && <span className="text-[10px] text-text-muted">{row.brand}</span>}
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-bold text-red-500 block">Fila {row.rowNumber}</span>
                                      <span className="text-[10px] text-red-500/80">{row.reason}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                {row.valid ? (
                                  <button
                                    type="button"
                                    onClick={() => setBulkExpandedRow(isExpanded ? null : row.rowNumber)}
                                    className={`font-semibold hover:underline cursor-pointer ${
                                      categoryName ? "text-foreground" : "text-yellow-600 dark:text-yellow-400"
                                    }`}
                                  >
                                    {categoryName ?? "Sin categoría"}
                                  </button>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="p-3 align-top text-right font-extrabold text-foreground whitespace-nowrap">
                                {row.valid
                                  ? `${row.currencyCode === "USD" ? "US$" : "$"} ${Number(row.price).toLocaleString("es-AR")}`
                                  : "—"}
                              </td>
                              <td className="p-3 align-top text-center text-text-muted whitespace-nowrap">
                                {row.valid ? `${row.condition === "NEW" ? "Nuevo" : "Usado"} · ${row.stock}` : "—"}
                              </td>
                              <td className="p-3 align-top text-center">
                                {row.valid ? (
                                  <label
                                    htmlFor={`row-photo-${row.rowNumber}`}
                                    title={row.images.length > 0 ? `${row.images.length} foto(s) — clic para agregar más` : "Sin foto — clic o arrastrá para subir"}
                                    className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border overflow-hidden cursor-pointer transition-colors ${
                                      photoColumnDragOver === row.rowNumber
                                        ? "border-accent-gold bg-accent-gold/10"
                                        : "border-card-border bg-background hover:border-accent-gold/50"
                                    }`}
                                    onDragOver={(e) => { e.preventDefault(); setPhotoColumnDragOver(row.rowNumber); }}
                                    onDragLeave={() => setPhotoColumnDragOver(null)}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setPhotoColumnDragOver(null);
                                      if (e.dataTransfer.files?.length) handleBulkRowImageFiles(row.rowNumber, e.dataTransfer.files);
                                    }}
                                  >
                                    {bulkUploadingRow === row.rowNumber ? (
                                      <span className="text-[7px] font-bold text-text-muted leading-tight">...</span>
                                    ) : row.images[0] ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={row.images[0]} alt="" className="h-full w-full object-contain pointer-events-none" />
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src="/sinimagen.png" alt="Sin imagen" className="h-full w-full object-cover pointer-events-none" />
                                    )}
                                    {row.images.length > 0 && (
                                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent-green text-background text-[8px] font-extrabold flex items-center justify-center pointer-events-none">
                                        {row.images.length}
                                      </span>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      id={`row-photo-${row.rowNumber}`}
                                      disabled={bulkUploadingRow === row.rowNumber}
                                      onChange={(e) => {
                                        if (e.target.files?.length) handleBulkRowImageFiles(row.rowNumber, e.target.files);
                                      }}
                                    />
                                  </label>
                                ) : (
                                  <span className="text-text-muted">—</span>
                                )}
                              </td>
                              <td className="p-3 align-top text-center">
                                {!row.valid ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-red-500/10 text-red-500 uppercase whitespace-nowrap">
                                    Error
                                  </span>
                                ) : row.categoryId ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-accent-green/10 text-accent-green uppercase whitespace-nowrap">
                                    Lista
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 uppercase whitespace-nowrap">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                              <td className="p-3 align-top text-center">
                                {row.valid && (
                                  <button
                                    type="button"
                                    onClick={() => setBulkExpandedRow(isExpanded ? null : row.rowNumber)}
                                    className="text-text-muted hover:text-accent-gold transition-colors cursor-pointer"
                                    title="Ver detalle"
                                  >
                                    {isExpanded ? "▲" : "▼"}
                                  </button>
                                )}
                              </td>
                            </tr>

                            {isExpanded && row.valid && (
                              <tr>
                                <td colSpan={8} className="p-4 bg-background">
                                  <div className="flex flex-col gap-3">
                                    <div className="max-w-xs">
                                      <CustomDropdown
                                        name={`bulk-category-${row.rowNumber}`}
                                        defaultValue={row.categoryId ?? ""}
                                        onChange={(val) => handleBulkRowCategoryChange(row.rowNumber, val)}
                                        options={bulkCategoryOptions}
                                        showSearch
                                        placeholder="Buscar categoría..."
                                      />
                                    </div>

                                    {/* Drag-and-drop de fotos, mismo patrón
                                        que la publicación individual — la
                                        primera es la portada, se reordena
                                        arrastrando. */}
                                    <div
                                      className={`border-2 border-dashed rounded-xl p-4 text-center flex flex-col items-center justify-center gap-1.5 transition-colors ${
                                        bulkRowDragOver === row.rowNumber
                                          ? "border-accent-gold bg-accent-gold/5"
                                          : "border-card-border hover:border-accent-gold/50"
                                      }`}
                                      onDragOver={(e) => { e.preventDefault(); setBulkRowDragOver(row.rowNumber); }}
                                      onDragLeave={() => setBulkRowDragOver(null)}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        setBulkRowDragOver(null);
                                        if (e.dataTransfer.files?.length) {
                                          handleBulkRowImageFiles(row.rowNumber, e.dataTransfer.files);
                                        }
                                      }}
                                    >
                                      {bulkUploadingRow === row.rowNumber ? (
                                        <p className="text-[11px] font-bold text-foreground">Subiendo fotos...</p>
                                      ) : (
                                        <>
                                          <span className="text-lg">📸</span>
                                          <p className="text-[11px] font-bold text-foreground">Arrastrá las fotos de este producto acá</p>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            id={`bulk-row-images-${row.rowNumber}`}
                                            onChange={(e) => {
                                              if (e.target.files?.length) handleBulkRowImageFiles(row.rowNumber, e.target.files);
                                            }}
                                          />
                                          <label
                                            htmlFor={`bulk-row-images-${row.rowNumber}`}
                                            className="text-[10px] font-bold text-accent-gold hover:underline cursor-pointer"
                                          >
                                            o hacé clic para elegirlas
                                          </label>
                                        </>
                                      )}
                                    </div>

                                    {row.images.length > 0 && (
                                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                        {row.images.map((img, idx) => (
                                          <div
                                            key={idx}
                                            draggable
                                            onDragStart={() => handleBulkImageDragStart(row.rowNumber, idx)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => handleBulkImageDrop(row.rowNumber, idx)}
                                            onDragEnd={() => setBulkDraggingImage(null)}
                                            className={`relative aspect-square rounded-lg overflow-hidden bg-card-bg border cursor-grab active:cursor-grabbing group select-none ${
                                              bulkDraggingImage?.row === row.rowNumber && bulkDraggingImage.index === idx
                                                ? "opacity-30 scale-95"
                                                : "border-card-border hover:border-accent-gold/40"
                                            }`}
                                            title="Arrastrá para reordenar"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={img}
                                              alt={`Foto ${idx + 1} de ${row.name}`}
                                              className="w-full h-full object-contain pointer-events-none"
                                            />
                                            {idx === 0 && (
                                              <span className="absolute bottom-1 left-1 bg-accent-gold text-background text-[8px] font-extrabold px-1 py-0.5 rounded uppercase pointer-events-none">
                                                Portada
                                              </span>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => handleBulkRemoveImage(row.rowNumber, idx)}
                                              className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/60 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {bulkErrors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 flex flex-col gap-2">
                    <h4 className="font-bold text-xs flex items-center gap-1.5">
                      <span>⚠️</span> Se encontraron {bulkErrors.length} errores al publicar:
                    </h4>
                    <div className="max-h-60 overflow-y-auto divide-y divide-red-500/10 text-[11px]">
                      {bulkErrors.map((err, idx) => (
                        <div key={idx} className="py-2 first:pt-0 last:pb-0">
                          {err}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConfirmBulkPublish}
                  disabled={bulkConfirming || bulkPreviewRows.filter((r) => r.valid && r.categoryId).length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-4 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all mt-2 disabled:opacity-50 cursor-pointer"
                >
                  {bulkConfirming
                    ? "Publicando..."
                    : `Confirmar y Publicar (${bulkPreviewRows.filter((r) => r.valid && r.categoryId).length} productos)`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Inventory List */}
        {activeTab === "inventory" && (() => {
          const filteredAndSortedListings = myListings
            .filter((listing) => {
              const query = inventorySearch.toLowerCase();
              return (
                (listing.products?.name ?? "").toLowerCase().includes(query) ||
                (listing.products?.brand ?? "").toLowerCase().includes(query)
              );
            })
            .sort((a, b) => {
              if (!sortColumn) return 0;
              let valA: any = "";
              let valB: any = "";
              if (sortColumn === "name") {
                valA = (a.products?.name ?? "").toLowerCase();
                valB = (b.products?.name ?? "").toLowerCase();
              } else if (sortColumn === "brand") {
                valA = (a.products?.brand ?? "").toLowerCase();
                valB = (b.products?.brand ?? "").toLowerCase();
              } else if (sortColumn === "condition") {
                valA = a.condition;
                valB = b.condition;
              } else if (sortColumn === "price") {
                valA = Number(a.price);
                valB = Number(b.price);
              } else if (sortColumn === "stock") {
                valA = a.stock;
                valB = b.stock;
              } else if (sortColumn === "status") {
                valA = a.status;
                valB = b.status;
              }
              if (valA < valB) return sortDirection === "asc" ? -1 : 1;
              if (valA > valB) return sortDirection === "asc" ? 1 : -1;
              return 0;
            });

          const itemsPerPage = 10;
          const totalPages = Math.ceil(filteredAndSortedListings.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedListings = filteredAndSortedListings.slice(startIndex, endIndex);

          const renderSortIndicator = (col: string) => {
            if (sortColumn !== col) return <span className="text-text-muted/30 ml-1">↕</span>;
            return sortDirection === "asc" ? (
              <span className="text-accent-gold ml-1">▲</span>
            ) : (
              <span className="text-accent-gold ml-1">▼</span>
            );
          };

          return (
            <div className="w-full rounded-2xl glass-panel p-6 overflow-visible">
              <h3 className="font-heading text-sm font-extrabold text-foreground uppercase tracking-wider mb-6">Listado de Artículos</h3>
              
              {/* Buscador */}
              <div className="mb-6 max-w-md relative">
                <input
                  type="text"
                  placeholder="Buscar por artículo o marca..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                />
                {inventorySearch && (
                  <button
                    type="button"
                    onClick={() => setInventorySearch("")}
                    className="absolute right-3.5 top-3 text-text-muted hover:text-foreground text-[10px] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="hidden md:block overflow-x-auto md:overflow-x-visible">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-card-border text-text-muted font-bold select-none">
                      <th className="pb-3 pr-4">Foto</th>
                      <th
                        onClick={() => handleSort("name")}
                        className="pb-3 pr-4 cursor-pointer hover:text-accent-gold transition-colors"
                      >
                        Artículo {renderSortIndicator("name")}
                      </th>
                      <th 
                        onClick={() => handleSort("brand")}
                        className="pb-3 px-4 cursor-pointer hover:text-accent-gold transition-colors"
                      >
                        Marca {renderSortIndicator("brand")}
                      </th>
                      <th 
                        onClick={() => handleSort("condition")}
                        className="pb-3 px-4 text-center cursor-pointer hover:text-accent-gold transition-colors"
                      >
                        Condición {renderSortIndicator("condition")}
                      </th>
                      <th 
                        onClick={() => handleSort("price")}
                        className="pb-3 px-4 text-right cursor-pointer hover:text-accent-gold transition-colors"
                      >
                        Precio {renderSortIndicator("price")}
                      </th>
                      <th 
                        onClick={() => handleSort("stock")}
                        className="pb-3 px-4 text-center cursor-pointer hover:text-accent-gold transition-colors"
                      >
                        Stock {renderSortIndicator("stock")}
                      </th>
                      <th className="pb-3 px-4 text-center" title="Visitantes únicos por día — no cuenta refrescos ni tus propias visitas">
                        Visitas
                      </th>
                      <th
                        onClick={() => handleSort("status")}
                        className="pb-3 px-4 text-center cursor-pointer hover:text-accent-gold transition-colors"
                      >
                        Estado {renderSortIndicator("status")}
                      </th>
                      <th className="pb-3 pl-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/30">
                    {filteredAndSortedListings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-text-muted">
                          No se encontraron artículos
                        </td>
                      </tr>
                    ) : (
                      paginatedListings.map((listing, index) => {
                        const thumbnail = listing.image_url ?? listing.products?.images?.[0] ?? null;
                        return (
                        <tr key={listing.id} className="hover:bg-card-bg/30 transition-colors">
                          <td className="py-4 pr-4">
                            <Link href={`/listings/${listing.id}`} className="block h-12 w-12 rounded-lg overflow-hidden border border-card-border bg-card-bg shrink-0">
                              {thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumbnail} alt={listing.products?.name ?? "Producto"} className="h-full w-full object-contain" />
                              ) : (
                                <span className="h-full w-full flex items-center justify-center text-text-muted text-lg">📦</span>
                              )}
                            </Link>
                          </td>
                          <td className="py-4 pr-4 font-bold text-foreground">
                            <Link href={`/listings/${listing.id}`} className="hover:text-accent-gold transition-colors">
                              {listing.products?.name ?? "Sin nombre"}
                            </Link>
                          </td>
                          <td className="py-4 px-4 text-text-muted">{listing.products?.brand ?? "-"}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              listing.condition === "NEW" ? "bg-accent-green/10 text-accent-green" : "bg-text-muted/10 text-text-muted"
                            }`}>
                              {listing.condition === "NEW" ? "NUEVO" : "USADO"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-extrabold text-foreground">
                            {currencies.find((c) => c.id === listing.currency_id)?.symbol ?? "$"}
                            {Number(listing.price).toLocaleString("es-AR")}
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-foreground">{listing.stock}</td>
                          <td className="py-4 px-4 text-center text-text-muted">
                            ({viewCounts[listing.id] ?? 0})
                          </td>
                          <td className="py-4 px-4 text-center relative">
                            {listing.status === "SOLD" ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold bg-text-muted/10 text-text-muted border border-card-border/60 uppercase tracking-wider">
                                  ⚫ VENDIDO
                                </span>
                                {soldOrders[listing.id] && (
                                  <span className="text-[9px] text-text-muted">
                                    a {soldOrders[listing.id].buyerName} · {new Date(soldOrders[listing.id].paidAt).toLocaleDateString("es-AR")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStatusDropdownListingId(
                                    activeStatusDropdownListingId === listing.id ? null : listing.id
                                  );
                                }}
                                disabled={loading}
                                className="focus:outline-none cursor-pointer hover:scale-105 active:scale-95 transition-all inline-block"
                              >
                                {listing.status === "APPROVED" && (
                                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold bg-accent-green/10 text-accent-green border border-accent-green/20 uppercase tracking-wider">
                                    🟢 PUBLICADO
                                  </span>
                                )}
                                {listing.status === "PAUSED" && (
                                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 uppercase tracking-wider">
                                    🟡 PAUSADO
                                  </span>
                                )}
                              </button>
                            )}

                            {/* Dropdown Menu */}
                            {activeStatusDropdownListingId === listing.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40 cursor-default" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStatusDropdownListingId(null);
                                  }}
                                />
                                <div className={`absolute left-1/2 -translate-x-1/2 w-36 rounded-xl bg-card-bg-solid border border-card-border p-1.5 shadow-2xl z-50 flex flex-col gap-1 text-left animate-in fade-in duration-150 ${
                                  index >= paginatedListings.length - 2 && paginatedListings.length > 2
                                    ? "bottom-full mb-2.5 slide-in-from-bottom-2"
                                    : "top-full mt-1 slide-in-from-top-2"
                                }`}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatusDirectly(listing.id, "APPROVED");
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold hover:bg-card-bg transition-colors flex items-center gap-1.5 text-accent-green cursor-pointer"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
                                    PUBLICADO
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatusDirectly(listing.id, "PAUSED");
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold hover:bg-card-bg transition-colors flex items-center gap-1.5 text-yellow-500 cursor-pointer"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                    PAUSADO
                                  </button>
                                </div>
                              </>
                            )}
                          </td>
                          <td className="py-4 pl-4 text-right">
                            <div className="inline-flex gap-2">
                              {/* Botón Clonar */}
                              <div className="relative group">
                                <button 
                                  onClick={() => handleCloneListing(listing.id)}
                                  disabled={loading}
                                  className="bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />
                                  </svg>
                                </button>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                                  Clonar
                                </span>
                              </div>

                              {/* Botón Editar */}
                              <div className="relative group">
                                <button 
                                  onClick={() => handleOpenEditModal(listing)}
                                  disabled={loading}
                                  className="bg-card-bg border border-card-border text-foreground hover:text-accent-blue hover:border-accent-blue/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                  </svg>
                                </button>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                                  Editar
                                </span>
                              </div>

                              {/* Botón Destacar — solo para publicaciones activas sin destacado vigente */}
                              {(listing.status === "APPROVED" || listing.status === "ACTIVE") && (
                                <div className="relative group">
                                  {highlightedUntil[listing.id] ? (
                                    <span
                                      className="h-8 px-2 rounded-lg flex items-center justify-center text-[9px] font-extrabold bg-accent-gold/10 text-accent-gold border border-accent-gold/30 whitespace-nowrap"
                                      title={`Destacado hasta ${new Date(highlightedUntil[listing.id]).toLocaleDateString("es-AR")}`}
                                    >
                                      ⭐ hasta {new Date(highlightedUntil[listing.id]).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleHighlightListing(listing.id)}
                                      disabled={loading || highlightingListingId === listing.id}
                                      className="bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                    >
                                      {highlightingListingId === listing.id ? (
                                        <span className="w-3.5 h-3.5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <span className="text-sm">⭐</span>
                                      )}
                                    </button>
                                  )}
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                                    {highlightedUntil[listing.id] ? "Ya está destacada" : `Destacar por $${highlightSettings.price.toLocaleString("es-AR")} (${highlightSettings.durationDays} días)`}
                                  </span>
                                </div>
                              )}

                              {/* Botón Eliminar */}
                              <div className="relative group">
                                <button 
                                  onClick={() => setListingIdToDelete(listing.id)}
                                  disabled={loading}
                                  className="bg-card-bg border border-card-border text-foreground hover:text-red-500 hover:border-red-500/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m9.96-3.08c.18.04.36.08.54.13M15 3.57a48.008 48.008 0 0 0-6 0M4.5 6.08c.18-.05.36-.09.54-.13M18 6.08a48.108 48.108 0 0 0-12 0M6.25 6.08l.81 12.35c.04.83.69 1.5 1.52 1.5H15.4c.83 0 1.48-.67 1.52-1.5l.81-12.35m-9.96 0h12" />
                                  </svg>
                                </button>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-card-bg-solid border border-card-border px-2 py-1 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-xl z-30">
                                  Eliminar
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list — the table above is unreadable squeezed
                  into a phone width, so <md gets its own compact layout
                  instead of relying on horizontal scroll. */}
              <div className="flex flex-col gap-3 md:hidden">
                {filteredAndSortedListings.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-xs">No se encontraron artículos</div>
                ) : (
                  paginatedListings.map((listing, index) => {
                    const thumbnail = listing.image_url ?? listing.products?.images?.[0] ?? null;
                    return (
                      <div key={listing.id} className="rounded-2xl border border-card-border bg-card-bg-solid p-3 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <Link href={`/listings/${listing.id}`} className="h-14 w-14 rounded-lg overflow-hidden border border-card-border bg-card-bg shrink-0">
                            {thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbnail} alt={listing.products?.name ?? "Producto"} className="h-full w-full object-contain" />
                            ) : (
                              <span className="h-full w-full flex items-center justify-center text-text-muted text-lg">📦</span>
                            )}
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/listings/${listing.id}`} className="font-bold text-foreground text-sm block truncate hover:text-accent-gold transition-colors">
                              {listing.products?.name ?? "Sin nombre"}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-text-muted">{listing.products?.brand ?? "-"}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                listing.condition === "NEW" ? "bg-accent-green/10 text-accent-green" : "bg-text-muted/10 text-text-muted"
                              }`}>
                                {listing.condition === "NEW" ? "NUEVO" : "USADO"}
                              </span>
                            </div>
                          </div>
                          <div className="relative shrink-0">
                            {listing.status === "SOLD" ? (
                              <span className="px-2 py-1 rounded-xl text-[9px] font-extrabold bg-text-muted/10 text-text-muted border border-card-border/60 uppercase tracking-wider whitespace-nowrap">
                                ⚫ VENDIDO
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStatusDropdownListingId(
                                    activeStatusDropdownListingId === listing.id ? null : listing.id
                                  );
                                }}
                                disabled={loading}
                                className="focus:outline-none cursor-pointer active:scale-95 transition-all inline-block"
                              >
                                {listing.status === "APPROVED" && (
                                  <span className="px-2 py-1 rounded-xl text-[9px] font-extrabold bg-accent-green/10 text-accent-green border border-accent-green/20 uppercase tracking-wider whitespace-nowrap">
                                    🟢 PUBLICADO
                                  </span>
                                )}
                                {listing.status === "PAUSED" && (
                                  <span className="px-2 py-1 rounded-xl text-[9px] font-extrabold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 uppercase tracking-wider whitespace-nowrap">
                                    🟡 PAUSADO
                                  </span>
                                )}
                              </button>
                            )}

                            {activeStatusDropdownListingId === listing.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40 cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStatusDropdownListingId(null);
                                  }}
                                />
                                <div className={`absolute right-0 w-32 rounded-xl bg-card-bg-solid border border-card-border p-1.5 shadow-2xl z-50 flex flex-col gap-1 text-left animate-in fade-in duration-150 ${
                                  index >= paginatedListings.length - 2 && paginatedListings.length > 2
                                    ? "bottom-full mb-2 slide-in-from-bottom-2"
                                    : "top-full mt-1 slide-in-from-top-2"
                                }`}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatusDirectly(listing.id, "APPROVED");
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold hover:bg-card-bg transition-colors flex items-center gap-1.5 text-accent-green cursor-pointer"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
                                    PUBLICADO
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatusDirectly(listing.id, "PAUSED");
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold hover:bg-card-bg transition-colors flex items-center gap-1.5 text-yellow-500 cursor-pointer"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                    PAUSADO
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {listing.status === "SOLD" && soldOrders[listing.id] && (
                          <p className="text-[10px] text-text-muted -mt-2">
                            Vendido a {soldOrders[listing.id].buyerName} · {new Date(soldOrders[listing.id].paidAt).toLocaleDateString("es-AR")}
                          </p>
                        )}

                        <div className="flex items-center justify-between border-t border-card-border/30 pt-3">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-text-muted uppercase font-semibold">Precio</span>
                            <span className="font-extrabold text-foreground text-sm">
                              {currencies.find((c) => c.id === listing.currency_id)?.symbol ?? "$"}
                              {Number(listing.price).toLocaleString("es-AR")}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-text-muted uppercase font-semibold">Stock</span>
                            <span className="font-bold text-foreground text-sm">{listing.stock}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-text-muted uppercase font-semibold">Visitas</span>
                            <span className="font-bold text-foreground text-sm">({viewCounts[listing.id] ?? 0})</span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleCloneListing(listing.id)}
                              disabled={loading}
                              className="bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              aria-label="Clonar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(listing)}
                              disabled={loading}
                              className="bg-card-bg border border-card-border text-foreground hover:text-accent-blue hover:border-accent-blue/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              aria-label="Editar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                              </svg>
                            </button>
                            {(listing.status === "APPROVED" || listing.status === "ACTIVE") && (
                              highlightedUntil[listing.id] ? (
                                <span
                                  className="h-8 px-1.5 rounded-lg flex items-center justify-center text-[8px] font-extrabold bg-accent-gold/10 text-accent-gold border border-accent-gold/30 whitespace-nowrap"
                                  title="Ya está destacada"
                                >
                                  ⭐ {new Date(highlightedUntil[listing.id]).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleHighlightListing(listing.id)}
                                  disabled={loading || highlightingListingId === listing.id}
                                  className="bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                  aria-label={`Destacar por $${highlightSettings.price.toLocaleString("es-AR")} (${highlightSettings.durationDays} días)`}
                                >
                                  {highlightingListingId === listing.id ? (
                                    <span className="w-3.5 h-3.5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <span className="text-sm">⭐</span>
                                  )}
                                </button>
                              )
                            )}
                            <button
                              onClick={() => setListingIdToDelete(listing.id)}
                              disabled={loading}
                              className="bg-card-bg border border-card-border text-foreground hover:text-red-500 hover:border-red-500/40 h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                              aria-label="Eliminar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m9.96-3.08c.18.04.36.08.54.13M15 3.57a48.008 48.008 0 0 0-6 0M4.5 6.08c.18-.05.36-.09.54-.13M18 6.08a48.108 48.108 0 0 0-12 0M6.25 6.08l.81 12.35c.04.83.69 1.5 1.52 1.5H15.4c.83 0 1.48-.67 1.52-1.5l.81-12.35m-9.96 0h12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-card-border/50 pt-6 mt-6">
                  <span className="text-xs text-text-muted">
                    Mostrando <span className="font-extrabold text-foreground">{startIndex + 1}</span> a{" "}
                    <span className="font-extrabold text-foreground">
                      {Math.min(endIndex, filteredAndSortedListings.length)}
                    </span>{" "}
                    de <span className="font-extrabold text-foreground">{filteredAndSortedListings.length}</span> artículos
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3.5 py-2 rounded-xl bg-card-bg-solid border border-card-border text-xs font-bold text-foreground hover:bg-card-bg hover:border-accent-gold/40 disabled:opacity-40 disabled:hover:bg-card-bg-solid disabled:hover:border-card-border cursor-pointer select-none transition-all active:scale-95 flex items-center justify-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                      </svg>
                      Anterior
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const isCurrent = page === currentPage;
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold transition-all cursor-pointer select-none active:scale-95 ${
                              isCurrent
                                ? "bg-accent-gold text-background shadow-[0_0_12px_rgba(235,178,57,0.3)]"
                                : "bg-card-bg-solid border border-card-border text-foreground hover:bg-card-bg hover:border-card-border-hover"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3.5 py-2 rounded-xl bg-card-bg-solid border border-card-border text-xs font-bold text-foreground hover:bg-card-bg hover:border-accent-gold/40 disabled:opacity-40 disabled:hover:bg-card-bg-solid disabled:hover:border-card-border cursor-pointer select-none transition-all active:scale-95 flex items-center justify-center gap-1"
                    >
                      Siguiente
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB: Consultas (Q&A follow-up) */}
        {activeTab === "questions" && (() => {
          const filteredQuestions = questions.filter((q) => {
            if (questionsFilter === "unanswered") return !q.answer;
            if (questionsFilter === "answered") return !!q.answer;
            return true;
          });
          const unansweredCount = questions.filter((q) => !q.answer).length;

          return (
            <div className="w-full flex flex-col gap-6">
              <div className="rounded-2xl glass-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-heading text-sm font-extrabold text-foreground uppercase tracking-wider">💬 Consultas de Compradores</h3>
                    <p className="text-xs text-text-muted mt-1">
                      Todas las preguntas recibidas en tus publicaciones, para hacer seguimiento.
                    </p>
                  </div>
                  <div className="flex gap-2 bg-background border border-card-border p-1 rounded-xl">
                    {([
                      { key: "all", label: "Todas" },
                      { key: "unanswered", label: `Sin responder${unansweredCount > 0 ? ` (${unansweredCount})` : ""}` },
                      { key: "answered", label: "Respondidas" },
                    ] as const).map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setQuestionsFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          questionsFilter === f.key ? "bg-accent-blue text-background shadow-sm" : "text-text-muted hover:text-foreground"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {questionsLoading ? (
                  <p className="text-xs text-text-muted text-center py-10">Cargando consultas...</p>
                ) : filteredQuestions.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-10">
                    {questionsFilter === "all"
                      ? "Todavía no tenés ninguna consulta en tus publicaciones."
                      : questionsFilter === "unanswered"
                        ? "No tenés consultas pendientes de responder."
                        : "Todavía no respondiste ninguna consulta."}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredQuestions.map((q) => (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border flex flex-col gap-2.5 text-xs transition-colors ${
                          !q.answer ? "bg-accent-gold/5 border-accent-gold/20" : "bg-card-bg border-card-border/50"
                        }`}
                      >
                        <div className="flex flex-wrap justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-text-muted block uppercase">Publicación</span>
                            <Link
                              href={`/listings/${q.listing?.id ?? "#"}`}
                              target="_blank"
                              className="font-bold text-foreground hover:text-accent-gold transition-colors line-clamp-1"
                            >
                              {q.listing?.product?.name ?? "Publicación"}
                            </Link>
                          </div>
                          <span className="text-[9px] text-text-muted shrink-0">
                            {new Date(q.created_at).toLocaleDateString("es-AR")}
                          </span>
                        </div>

                        <div className="bg-background/40 p-3 rounded-lg border border-card-border/40">
                          <span className="text-[9px] font-bold text-text-muted block mb-0.5">{q.buyer?.name ?? "Comprador"} pregunta:</span>
                          <p className="text-foreground leading-relaxed italic">&quot;{q.question}&quot;</p>
                        </div>

                        <button
                          onClick={() => handleToggleQuestionHidden(q.id, q.hidden_by_seller)}
                          className="self-start text-[10px] font-bold text-text-muted hover:text-foreground underline decoration-dotted cursor-pointer"
                        >
                          {q.hidden_by_seller ? "👁️ Volver a mostrar en la publicación" : "🙈 Ocultar de la publicación"}
                        </button>

                        {q.answer ? (
                          <div className="bg-accent-green/5 p-3 rounded-lg border border-accent-green/15 flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-accent-green block uppercase">Respondiste:</span>
                            <p className="text-text-muted">&quot;{q.answer}&quot;</p>
                          </div>
                        ) : replyingToQuestionId === q.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={questionReplyText}
                              onChange={(e) => setQuestionReplyText(e.target.value)}
                              placeholder="Escribí tu respuesta..."
                              className="w-full bg-background border border-card-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-accent-gold resize-none h-16"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setReplyingToQuestionId(null);
                                  setQuestionReplyText("");
                                }}
                                className="px-2.5 py-1 text-[10px] rounded-lg border border-card-border hover:bg-card-bg/25 text-text-muted cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleReplyToQuestion(q.id)}
                                disabled={!questionReplyText.trim()}
                                className="px-2.5 py-1 text-[10px] rounded-lg bg-gradient-to-r from-accent-gold to-accent-gold-hover text-background font-bold shadow-md cursor-pointer disabled:opacity-50"
                              >
                                Enviar Respuesta
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReplyingToQuestionId(q.id);
                              setQuestionReplyText("");
                            }}
                            className="w-full py-2 text-center text-[10px] font-bold rounded-lg border border-accent-gold/30 hover:border-accent-gold text-accent-gold hover:bg-accent-gold/5 transition-all cursor-pointer"
                          >
                            Responder Consulta
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 4: Rewards & Benefits */}
        {activeTab === "rewards" && (
          <div className="w-full flex flex-col gap-6">
            <div className="rounded-2xl glass-panel p-6">
              <h3 className="font-heading text-sm font-extrabold text-foreground uppercase tracking-wider mb-2">🎁 Mis Premios y Beneficios</h3>
              <p className="text-xs text-text-muted">
                Tu reputación en la provincia de La Pampa tiene valor. A medida que subas tu reputación (Score y Tier), el sistema te otorgará de forma automática beneficios comerciales exclusivos para impulsar tu negocio.
              </p>
            </div>

            {rewards.length === 0 ? (
              <div className="rounded-2xl glass-panel p-10 text-center flex flex-col items-center justify-center">
                <span className="text-4xl mb-4">🌾</span>
                <h4 className="font-bold text-foreground">Todavía no tenés premios disponibles</h4>
                <p className="text-xs text-text-muted mt-2 max-w-md">
                  Para obtener beneficios como destacados gratis y descuentos en comisiones, aumentá tu reputación completando ventas exitosas y respondiendo consultas de compradores.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rewards.map((reward) => {
                  const isClaimed = reward.claimed;
                  const isExpired = !isClaimed && reward.expiresAt && new Date(reward.expiresAt) < new Date();
                  
                  let title = "Beneficio Especial";
                  let description = "Recompensa comercial exclusiva para tu cuenta.";
                  
                  if (reward.type === "FREE_FEATURED_HIGHLIGHT") {
                    title = "Destacado FEATURED Gratuito";
                    description = "Destaca una de tus publicaciones de forma gratuita durante 30 días.";
                  } else if (reward.type === "FREE_PREMIUM_HIGHLIGHT") {
                    title = "Destacado PREMIUM Gratuito";
                    description = "Posiciona tu publicación en lo más alto de los resultados y en la página principal durante 30 días.";
                  } else if (reward.type === "COMMISSION_DISCOUNT_5") {
                    title = "Descuento de Comisión 5%";
                    description = "Obtén un 5% de descuento en las comisiones de venta para tu comercio.";
                  } else if (reward.type === "COMMISSION_DISCOUNT_10") {
                    title = "Descuento de Comisión 10%";
                    description = "Obtén un 10% de descuento en las comisiones de venta para tu comercio.";
                  }

                  return (
                    <div key={reward.id} className="rounded-2xl glass-panel p-6 flex flex-col justify-between gap-4 border border-card-border">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-2xl">
                            {reward.type.includes("HIGHLIGHT") ? "⭐" : "🎟️"}
                          </span>
                          <h4 className="font-heading font-bold text-base text-foreground mt-2">{title}</h4>
                          <p className="text-xs text-text-muted mt-1">{description}</p>
                        </div>
                        
                        <div>
                          {isClaimed ? (
                            <span className="inline-flex items-center rounded-full bg-accent-green/10 px-2 py-0.5 text-[10px] font-bold text-accent-green border border-accent-green/20">
                              Canjeado
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500 border border-red-500/20">
                              Expirado
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-accent-blue/10 px-2 py-0.5 text-[10px] font-bold text-accent-blue border border-accent-blue/20">
                              Disponible
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-card-border/50 pt-4 flex items-center justify-between text-xs text-text-muted">
                        <span>
                          {isClaimed 
                            ? `Canjeado el: ${new Date(reward.claimedAt).toLocaleDateString("es-AR")}` 
                            : `Vence el: ${new Date(reward.expiresAt).toLocaleDateString("es-AR")}`
                          }
                        </span>

                        {!isClaimed && !isExpired && (
                          <button
                            onClick={() => {
                              setSelectedRewardToClaim(reward);
                              const eligible = myListings.filter(l => l.status === "APPROVED");
                              if (eligible.length > 0) {
                                setSelectedListingForReward(eligible[0].id);
                              }
                            }}
                            className="bg-gradient-to-r from-accent-gold to-accent-gold-hover text-background text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-sm hover:opacity-95 transition-all cursor-pointer"
                          >
                            Canjear
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal de canje */}
            {selectedRewardToClaim && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-2xl glass-panel border border-card-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                    <span>🎁</span> Canjear Recompensa
                  </h3>
                  <p className="text-xs text-text-muted mt-2">
                    Aplicá un destacado gratuito a una de tus publicaciones aprobadas para aumentar tus visitas.
                  </p>

                  <div className="flex flex-col gap-4 mt-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-foreground">Seleccioná tu Publicación:</label>
                      {myListings.filter(l => l.status === "APPROVED").length === 0 ? (
                        <p className="text-xs text-red-500">
                          No tenés publicaciones aprobadas y activas para destacar.
                        </p>
                      ) : (
                        <CustomDropdown
                          name="rewardListing"
                          defaultValue={selectedListingForReward}
                          onChange={setSelectedListingForReward}
                          options={myListings.filter(l => l.status === "APPROVED").map((l) => ({
                            name: `${l.products?.name ?? "Publicación"} (${currencies.find((c) => c.id === l.currency_id)?.symbol ?? "$"}${l.price.toLocaleString("es-AR")})`,
                            value: l.id
                          }))}
                        />
                      )}
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => setSelectedRewardToClaim(null)}
                        className="rounded-xl border border-card-border hover:bg-card-bg/20 px-4 py-2 text-xs font-bold text-foreground transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleClaimReward(selectedRewardToClaim.id, selectedListingForReward)}
                        disabled={loading || myListings.filter(l => l.status === "APPROVED").length === 0}
                        className="rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-4 py-2 text-xs font-bold text-background shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? "Procesando..." : "Confirmar Canje"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Carrusel de Imágenes */}
            {activeCarouselIndex !== null && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                <button 
                  type="button"
                  onClick={() => setActiveCarouselIndex(null)}
                  className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full shadow-lg transition-all cursor-pointer flex items-center justify-center"
                  title="Cerrar visor"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>

                {/* Flecha Izquierda */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCarouselIndex(prev => 
                      prev !== null ? (prev === 0 ? productImages.length - 1 : prev - 1) : null
                    );
                  }}
                  className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3.5 rounded-full shadow-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
                  disabled={productImages.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>

                {/* Imagen Visor */}
                <div className="max-w-4xl max-h-[80vh] flex flex-col items-center justify-center gap-4 relative select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={productImages[activeCarouselIndex]} 
                    alt={`Imagen ampliada ${activeCarouselIndex + 1}`} 
                    className="max-w-full max-h-[70vh] rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-200"
                  />
                  <span className="text-white/60 text-xs font-bold bg-black/40 px-3 py-1.5 rounded-full tracking-wide">
                    {activeCarouselIndex + 1} de {productImages.length}
                  </span>
                </div>

                {/* Flecha Derecha */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCarouselIndex(prev => 
                      prev !== null ? (prev === productImages.length - 1 ? 0 : prev + 1) : null
                    );
                  }}
                  className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3.5 rounded-full shadow-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
                  disabled={productImages.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </div>
            )}

          </div>
        )}

        {activeTab === "social" && (
          <div className="max-w-3xl mx-auto w-full rounded-2xl glass-panel p-8 flex flex-col gap-6">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground mb-1">Redes Sociales</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                Vinculá tus cuentas para poder compartir tus publicaciones ahí también. Por ahora
                &quot;vincular&quot; guarda tu usuario y con eso te armamos la foto con nuestro sello
                y el texto listo para pegar — el posteo automático llega en cuanto Instagram/TikTok
                aprueben el acceso que les pedimos (no depende de nosotros, es un trámite de ellos).
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {SOCIAL_PLATFORMS.map(({ key, label, icon }) => {
                const account = socialAccounts.find((a) => a.platform === key);
                return (
                  <div key={key} className="rounded-2xl border border-card-border bg-card-bg p-5 flex flex-wrap items-center gap-4">
                    <span className="h-11 w-11 rounded-xl bg-background border border-card-border flex items-center justify-center text-xl shrink-0">
                      {icon}
                    </span>
                    <div className="flex-1 min-w-[140px]">
                      <h4 className="text-sm font-bold text-foreground">{label}</h4>
                      {account ? (
                        <p className="text-xs text-accent-green font-semibold">✓ Vinculada como @{account.handle}</p>
                      ) : (
                        <p className="text-xs text-text-muted">No vinculada todavía</p>
                      )}
                    </div>
                    {account ? (
                      <button
                        onClick={() => handleDisconnectSocial(key)}
                        disabled={socialDisconnecting === key}
                        className="rounded-lg border border-card-border px-4 py-2 text-[11px] font-bold text-text-muted hover:text-red-500 hover:border-red-500/40 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {socialDisconnecting === key ? "Desvinculando..." : "Desvincular"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="text"
                          placeholder="@usuario"
                          value={socialHandleInputs[key] ?? ""}
                          onChange={(e) => setSocialHandleInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-32 bg-background border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                        />
                        <button
                          onClick={() => handleConnectSocial(key)}
                          disabled={socialConnecting === key || !socialHandleInputs[key]?.trim()}
                          className="rounded-lg bg-accent-gold text-background px-4 py-2 text-[11px] font-extrabold hover:opacity-90 transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap"
                        >
                          {socialConnecting === key ? "Vinculando..." : "Vincular"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="relative w-full rounded-2xl glass-panel p-8">
            {sellerProfile.identity_verified && (
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1.5 rounded-full bg-accent-green/10 border border-accent-green/30 px-3 py-1.5">
                <span className="text-[11px] font-bold text-accent-green whitespace-nowrap">✓ Identidad verificada</span>
              </div>
            )}
            <h2 className="font-heading text-lg font-bold text-foreground mb-1">Mis Datos</h2>
            <p className="text-xs text-text-muted mb-6">Actualizá los datos de tu perfil de vendedor.</p>


            <form id="profile-form" onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-foreground">
                  {profileType === "BUSINESS_SELLER" ? "Logo del Comercio" : "Foto de Perfil"}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-card-border shadow-sm rounded-full">
                    <SellerAvatar
                      src={avatarUrl}
                      alt={profileType === "BUSINESS_SELLER" ? "Logo del comercio" : "Tu foto de perfil"}
                    />
                  </div>
                  <label className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-accent-gold hover:text-accent-gold transition-colors">
                    {avatarUploading ? "Subiendo..." : avatarUrl ? "Cambiar imagen" : "Elegir imagen"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleAvatarChange}
                      disabled={avatarUploading}
                      className="hidden"
                    />
                  </label>
                </div>
                {avatarError && <p className="text-[10px] text-red-500">{avatarError}</p>}
                <p className="text-[10px] text-text-muted">
                  Se sube al instante — no hace falta apretar &quot;Guardar Cambios&quot;.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Correo Electrónico</label>
                  <input
                    type="email"
                    value={userEmail ?? ""}
                    disabled
                    readOnly
                    className="w-full bg-card-border/20 border border-card-border rounded-xl px-4 py-3 text-xs text-text-muted cursor-not-allowed"
                  />
                  <p className="text-[10px] text-text-muted">El correo no se puede modificar desde acá.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={sellerProfile.username ? `@${sellerProfile.username}` : "Sin asignar"}
                    disabled
                    readOnly
                    className="w-full bg-card-border/20 border border-card-border rounded-xl px-4 py-3 text-xs text-text-muted cursor-not-allowed"
                  />
                  <p className="text-[10px] text-text-muted">Por ahora no se puede modificar desde acá.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Nombre Completo / Razón Social</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Tipo de Vendedor / Cuenta</label>
                  <div className="grid grid-cols-2 gap-3 bg-background border border-card-border p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setProfileType("PERSONAL_SELLER")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        profileType === "PERSONAL_SELLER" ? "bg-accent-blue text-background shadow-md" : "text-text-muted hover:text-foreground"
                      }`}
                    >
                      Particular
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileType("BUSINESS_SELLER")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        profileType === "BUSINESS_SELLER" ? "bg-accent-blue text-background shadow-md" : "text-text-muted hover:text-foreground"
                      }`}
                    >
                      Comercio
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Celular</label>
                  <input
                    type="tel"
                    required
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="Ej. 2954123456"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">
                    {profileType === "PERSONAL_SELLER" ? "DNI / CUIL" : "CUIT"}
                  </label>
                  <input
                    type="text"
                    value={profileDocumentNumber}
                    onChange={(e) => setProfileDocumentNumber(e.target.value)}
                    placeholder={profileType === "PERSONAL_SELLER" ? "Ej. 20-35444333-8" : "Ej. 30-71112223-9"}
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground">Ciudad</label>
                  <CustomDropdown
                    name="location"
                    defaultValue={profileLocation}
                    showSearch
                    onChange={(value) => setProfileLocation(value)}
                    options={[
                      { name: "Seleccioná tu ciudad", value: "" },
                      ...LA_PAMPA_CITIES.map((city) => ({ name: city, value: city })),
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-foreground">Bio / Descripción</label>
                <textarea
                  rows={3}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Contales a los compradores algo sobre vos o tu comercio..."
                  className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold resize-none"
                />
              </div>

              <div className="border-t border-card-border/50 pt-5 flex flex-col gap-2">
                <span className="text-xs font-bold text-foreground">Datos para transferencia bancaria</span>
                <p className="text-[10px] text-text-muted -mt-1">
                  Se muestran al comprador cuando elige pagarte por transferencia.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  <input
                    type="text"
                    value={bankCbu}
                    onChange={(e) => setBankCbu(e.target.value)}
                    placeholder="CBU"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                  />
                  <input
                    type="text"
                    value={bankAlias}
                    onChange={(e) => setBankAlias(e.target.value)}
                    placeholder="Alias"
                    className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-accent-gold"
                  />
                </div>
              </div>
            </form>

            {!sellerProfile.identity_verified && (
              <div className="border-t border-card-border/50 mt-8 pt-6 flex flex-col gap-3">
                <span className="text-xs font-bold text-foreground">Verificación de Identidad</span>
                <button
                  onClick={handleStartKyc}
                  disabled={kycLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 px-5 py-3 text-xs font-extrabold text-white shadow-md hover:scale-[1.01] transition-all w-fit disabled:opacity-50 cursor-pointer"
                >
                  {kycLoading ? "Iniciando..." : "🪪 Verificar mi identidad"}
                </button>
                <p className="text-[10px] text-text-muted">
                  Te vamos a pedir una foto de tu DNI y una selfie para confirmar que sos vos. Lo hace un proveedor externo (Didit), nosotros no guardamos tus fotos.
                </p>
              </div>
            )}

            <div className="border-t border-card-border/50 mt-8 pt-6 flex flex-col gap-3">
              <span className="text-xs font-bold text-foreground">Mercado Pago</span>
              {sellerProfile.mercadopago_connected ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-accent-green/10 border border-accent-green/30 px-4 py-3">
                  <span className="text-xs font-bold text-accent-green">✓ Cuenta vinculada</span>
                  <button
                    onClick={handleDisconnectMercadoPago}
                    disabled={mpDisconnecting}
                    className="text-[10px] font-bold text-text-muted hover:text-red-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {mpDisconnecting ? "Desvinculando..." : "Desvincular"}
                  </button>
                </div>
              ) : (
                <a
                  href="/api/mercadopago/connect"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-blue-600 px-5 py-3 text-xs font-extrabold text-white shadow-md hover:scale-[1.01] transition-all w-fit"
                >
                  💳 Vincular Mercado Pago
                </a>
              )}
              <p className="text-[10px] text-text-muted">
                Vinculá tu cuenta para cobrar directo cuando alguien compre con Mercado Pago.
              </p>
            </div>

            {pendingTransferOrders.length > 0 && (
              <div className="border-t border-card-border/50 mt-8 pt-6 flex flex-col gap-3">
                <span className="text-xs font-bold text-foreground">Transferencias por confirmar</span>
                <div className="flex flex-col gap-2">
                  {pendingTransferOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-background border border-card-border px-4 py-3"
                    >
                      <div className="text-xs">
                        <span className="font-bold text-foreground block">
                          {order.listings?.products?.name ?? "Publicación"}
                        </span>
                        <span className="text-text-muted text-[10px]">
                          Comprador: {order.buyer?.name ?? "—"} · ${Number(order.amount).toLocaleString("es-AR")}
                        </span>
                      </div>
                      <button
                        onClick={() => handleConfirmTransfer(order.id)}
                        disabled={confirmingOrderId === order.id}
                        className="rounded-lg bg-accent-green/10 border border-accent-green/30 text-accent-green px-3 py-2 text-[10px] font-bold hover:bg-accent-green/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {confirmingOrderId === order.id ? "Confirmando..." : "Confirmar recibido"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fuera del <form> a propósito (queda debajo de Mercado Pago y
                Transferencias por confirmar) — se conecta al formulario de
                arriba vía el atributo form="profile-form". */}
            <div className="border-t border-card-border/50 mt-8 pt-6 flex justify-center">
              <button
                type="submit"
                form="profile-form"
                disabled={profileSaving}
                className="rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-12 py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {profileSaving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        <ConfirmModal
          isOpen={listingIdToDelete !== null}
          title="¿Eliminar publicación?"
          description="¿Estás seguro de que querés eliminar esta publicación? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={() => {
            if (listingIdToDelete) {
              handleDeleteListing(listingIdToDelete);
            }
          }}
          onCancel={() => setListingIdToDelete(null)}
          isLoading={loading}
          type="danger"
        />

        <ConfirmModal
          isOpen={showBulkDeleteConfirm}
          title="¿Sacar filas de la carga?"
          description={`Se van a sacar ${bulkSelectedRows.size} fila${bulkSelectedRows.size === 1 ? "" : "s"} de la pre-carga. No se van a publicar.`}
          confirmText="Sacar filas"
          cancelText="Cancelar"
          onConfirm={handleBulkDeleteSelected}
          onCancel={() => setShowBulkDeleteConfirm(false)}
          type="danger"
        />

      </div>
    </div>
  );
}
