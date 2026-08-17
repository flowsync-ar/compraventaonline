import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";
import CategoriesCarousel from "@/components/CategoriesCarousel";
import FavoriteButton from "@/components/FavoriteButton";

type ListingRow = {
  id: string;
  price: number;
  condition: string;
  featured_plan: string;
  products: {
    name: string;
    brand: string;
    description: string;
    images: string[] | null;
    categories: { name: string } | null;
  } | null;
  sellers: {
    name: string;
    score: number;
    tier: string;
  } | null;
};

// Fallback mock listings (La Pampa themed & general)
const mockListings = [
  {
    id: "l1",
    price: 18500.0,
    condition: "NEW",
    featured_plan: "PREMIUM",
    products: {
      name: "Miel Orgánica Pura del Caldenal",
      brand: "Pampeana Alta",
      description: "Miel pura de abeja de flores silvestres cosechada en el caldenal pampeano. 100% natural, frasco de 1kg.",
      images: ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=600&auto=format&fit=crop"],
      categories: { name: "Campo / Agro" },
    },
    sellers: { name: "Apicultura La Fusta", score: 98, tier: "PREMIUM" },
  },
  {
    id: "l2",
    price: 125000.0,
    condition: "NEW",
    featured_plan: "FEATURED",
    products: {
      name: "Taladro Percutor Bosch 500W",
      brand: "Bosch",
      description: "Taladro percutor Bosch GSB 13 RE Professional. Potente motor de 500 W, ideal para mampostería, madera y metal.",
      images: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=600&auto=format&fit=crop"],
      categories: { name: "Construcción" },
    },
    sellers: { name: "Ferretería El Pampeano", score: 95, tier: "GOLD" },
  },
  {
    id: "l3",
    price: 85000.0,
    condition: "USED",
    featured_plan: "FREE",
    products: {
      name: "Sillón Retro Tapizado Pana Verde",
      brand: "Vintage",
      description: "Sillón de un cuerpo estilo retro vintage años 70. Tapizado en pana verde musgo, patas de madera de caldén en excelente estado.",
      images: ["https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=600&auto=format&fit=crop"],
      categories: { name: "Hogar" },
    },
    sellers: { name: "Ramiro Tule (Particular)", score: 90, tier: "BRONCE" },
  },
  {
    id: "l4",
    price: 11000.0,
    condition: "NEW",
    featured_plan: "PREMIUM",
    products: {
      name: "Queso de Campo Saborizado con Hierbas",
      brand: "Estancia El Caldén",
      description: "Queso artesanal semi-duro saborizado con orégano y provenzal. Horma de 800g directamente de tambo pampeano.",
      images: ["https://images.unsplash.com/photo-1486299267070-8382e214434b?q=80&w=600&auto=format&fit=crop"],
      categories: { name: "Campo / Agro" },
    },
    sellers: { name: "Distribuidora Luro", score: 99, tier: "PREMIUM" },
  },
];

async function getListings(): Promise<typeof mockListings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        price,
        condition,
        featured_plan,
        products (
          name,
          brand,
          description,
          images,
          categories ( name )
        ),
        sellers (
          name,
          score,
          tier
        )
      `)
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false })
      .limit(12);

    if (error || !data || data.length === 0) return mockListings;
    return data as unknown as typeof mockListings;
  } catch {
    return mockListings;
  }
}

export default async function HomePage() {
  const listings = await getListings();

  return (
    <div className="flex flex-col gap-10 pb-16">

      {/* 1. Carousel + Hero Search */}
      <section className="relative">
        <HeroCarousel />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10 -mt-2 pt-2 pb-2 sm:pb-3">

          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-gold/10 px-3 py-1 text-xs font-semibold text-accent-gold border border-accent-gold/20 mb-4 glow-gold">
            🌾 El Primer Marketplace 100% Pampeano
          </span>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-5xl text-foreground max-w-3xl mx-auto leading-[1.1]">
            Encontrá lo que buscas en <span className="bg-gradient-to-r from-accent-gold to-accent-green bg-clip-text text-transparent">La Pampa</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-text-muted max-w-xl mx-auto">
            Comprá y vendé de forma segura y directa. Conectamos usuarios particulares y comercios de toda la provincia.
          </p>

        </div>
      </section>

      {/* 2. Categories Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full -mt-2">
        <div className="flex items-end justify-between border-b border-card-border pb-5 mb-8">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">Explorá por Categoría</h2>
            <p className="text-sm text-text-muted mt-1">Navegá las categorías más buscadas de la provincia.</p>
          </div>
          <Link href="/search" className="text-xs font-bold text-accent-gold hover:text-accent-gold-hover hover:underline transition-all">
            Ver todas →
          </Link>
        </div>

        <CategoriesCarousel />
      </section>

      {/* 3. Highlighted Listings Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-end justify-between border-b border-card-border pb-5 mb-8">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">Publicaciones Destacadas</h2>
            <p className="text-sm text-text-muted mt-1">Ofertas destacadas con excelente reputación de vendedor.</p>
          </div>
          <Link href="/search" className="text-xs font-bold text-accent-gold hover:text-accent-gold-hover hover:underline transition-all">
            Ver todas las publicaciones →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map((listing) => {
            const product = listing.products;
            const seller = listing.sellers;
            const image = product?.images?.[0] ?? "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop";
            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group flex flex-col rounded-2xl glass-card overflow-hidden relative cursor-pointer"
              >
                <FavoriteButton listingId={listing.id} />
                {/* Badge Plan */}
                {listing.featured_plan !== "FREE" && (
                  <span className={`absolute top-3 left-3 z-10 rounded-lg px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-background shadow-md uppercase ${
                    listing.featured_plan === "PREMIUM" ? "bg-accent-gold" : "bg-accent-blue"
                  }`}>
                    {listing.featured_plan === "PREMIUM" ? "💎 PREMIUM" : "⚡ DESTACADO"}
                  </span>
                )}

                {/* Image Container */}
                <div className="h-48 w-full bg-slate-950 overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={product?.name ?? "Producto"}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase">
                    <span>{product?.categories?.name ?? "Sin categoría"}</span>
                    <span className={`px-1.5 py-0.5 rounded ${listing.condition === "NEW" ? "bg-accent-green/10 text-accent-green" : "bg-text-muted/10 text-text-muted"}`}>
                      {listing.condition === "NEW" ? "NUEVO" : "USADO"}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-sm text-foreground group-hover:text-accent-gold transition-colors line-clamp-1">
                    {product?.name ?? "Sin nombre"}
                  </h3>

                  <p className="text-xs text-text-muted line-clamp-2 -mt-1 leading-relaxed">
                    {product?.description}
                  </p>

                  <div className="flex items-baseline gap-1 mt-auto">
                    <span className="text-xs font-semibold text-accent-gold">$</span>
                    <span className="text-lg font-extrabold text-foreground">
                      {listing.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Seller Bar */}
                  <div className="border-t border-card-border/50 pt-3 mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-foreground leading-none">
                        {seller?.name ?? "Vendedor"}
                      </span>
                      <span className="text-[8px] text-text-muted mt-0.5 uppercase">
                        Reputación: {seller?.tier ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs text-accent-gold font-bold">
                      <span>★</span>
                      <span className="text-[10px]">{((seller?.score ?? 0) / 10).toFixed(1)}</span>
                    </div>
                  </div>

                </div>

              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
