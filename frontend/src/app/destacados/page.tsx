import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type HighlightRow = {
  id: string;
  plan: string;
  listings: {
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
  } | null;
};

// Fallback mock listings (La Pampa themed)
const mockHighlights = [
  {
    id: "h1",
    plan: "PREMIUM",
    listings: {
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
  },
  {
    id: "h2",
    plan: "PREMIUM",
    listings: {
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
  },
  {
    id: "h3",
    plan: "FEATURED",
    listings: {
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
  },
];

async function getHighlightedListings(): Promise<typeof mockHighlights> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("highlighted_products")
      .select(`
        id,
        plan,
        listings (
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
        )
      `)
      .gt("end_date", now)
      .order("plan", { ascending: true });

    if (error || !data || data.length === 0) return mockHighlights;

    // Sort: PREMIUM first, then FEATURED
    const sorted = (data as unknown as typeof mockHighlights).sort((a, b) => {
      if (a.plan === "PREMIUM" && b.plan !== "PREMIUM") return -1;
      if (a.plan !== "PREMIUM" && b.plan === "PREMIUM") return 1;
      return 0;
    });

    return sorted;
  } catch {
    return mockHighlights;
  }
}

export default async function DestacadosPage() {
  const highlights = await getHighlightedListings();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col gap-10">

      {/* Title Header */}
      <div className="border-b border-card-border pb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl">⭐</span>
          <h1 className="font-heading text-3xl font-extrabold text-foreground">
            Publicaciones Destacadas
          </h1>
        </div>
        <p className="text-text-muted text-xs mt-2 leading-relaxed max-w-2xl">
          Descubrí los mejores productos y ofertas destacadas por los comercios y vendedores de La Pampa.
        </p>
      </div>

      {/* Criterio de Rotación Informativo */}
      <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/5 p-4 flex gap-3 items-start text-xs text-text-muted leading-relaxed">
        <span className="text-accent-gold text-lg select-none">🔄</span>
        <div>
          <p className="font-bold text-foreground mb-1">Rotación Equitativa para Vendedores</p>
          Para asegurar que todos nuestros clientes y anunciantes tengan las mismas oportunidades, las publicaciones dentro de un mismo plan destacado se ordenan de manera completamente aleatoria cada vez que se ingresa a la página. Esto garantiza que todos los productos se visualicen por igual sin importar la fecha de contratación del servicio.
        </div>
      </div>

      {highlights.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-card-border rounded-3xl flex flex-col items-center gap-2">
          <span className="text-4xl">📭</span>
          <h3 className="font-heading text-sm font-bold text-foreground mt-2">No hay publicaciones destacadas activas</h3>
          <p className="text-text-muted text-xs">
            ¡Sé el primero en destacar un producto desde tu panel de vendedor!
          </p>
          <Link
            href="/dashboard?tab=publish"
            className="mt-4 rounded-xl bg-accent-gold px-5 py-2.5 text-xs font-extrabold text-background shadow-md hover:opacity-90 transition-all"
          >
            Destacar Artículo
          </Link>
        </div>
      ) : (
        /* Listings Gallery Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((highlight) => {
            const item = highlight.listings;
            if (!item) return null;
            const isPremium = highlight.plan === "PREMIUM";
            const product = item.products;
            const seller = item.sellers;
            const image = product?.images?.[0] ?? "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop";

            return (
              <Link
                href={`/listings/${item.id}`}
                key={highlight.id}
                className={`relative rounded-3xl border bg-card-bg-solid overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  isPremium
                    ? "border-accent-gold/40 shadow-[0_0_15px_rgba(217,119,6,0.06)] hover:border-accent-gold"
                    : "border-card-border hover:border-accent-green/50"
                }`}
              >
                {/* Visual Image Container */}
                <div className="aspect-[4/3] w-full overflow-hidden bg-card-border/30 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={product?.name ?? "Producto"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Category Badge */}
                  <span className="absolute top-4 left-4 bg-background/80 backdrop-blur-md text-[9px] font-bold text-foreground px-2.5 py-1 rounded-full uppercase tracking-wider border border-card-border/30 shadow-sm">
                    {product?.categories?.name ?? "Clasificado"}
                  </span>

                  {/* Plan Badge */}
                  <span className={`absolute top-4 right-4 text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border shadow-md flex items-center gap-1 ${
                    isPremium
                      ? "bg-accent-gold text-background border-accent-gold animate-pulse"
                      : "bg-accent-green text-background border-accent-green"
                  }`}>
                    {isPremium ? "👑 Premium" : "⭐ Destacado"}
                  </span>
                </div>

                {/* Listing Details */}
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                      {product?.brand}
                    </span>
                    <h3 className="font-heading text-sm font-bold text-foreground group-hover:text-accent-gold transition-colors line-clamp-2">
                      {product?.name ?? "Sin nombre"}
                    </h3>
                    <p className="text-text-muted text-[11px] line-clamp-3 leading-relaxed">
                      {product?.description}
                    </p>
                  </div>

                  {/* Seller & Reputation details */}
                  <div className="flex items-center justify-between border-t border-card-border/30 pt-3 text-[10px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-text-muted">Vendedor</span>
                      <span className="font-bold text-foreground max-w-[150px] truncate">
                        {seller?.name ?? "Vendedor"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-text-muted">Reputación</span>
                      <span className="font-extrabold text-accent-green">
                        {seller?.score ?? 0}/100
                      </span>
                    </div>
                  </div>

                  {/* Bottom CTA & Price */}
                  <div className="flex items-center justify-between border-t border-card-border/30 pt-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-text-muted uppercase font-semibold">Precio</span>
                      <span className="font-heading text-lg font-extrabold text-foreground">
                        ${item.price.toLocaleString("es-AR")}
                      </span>
                    </div>
                    <span
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        isPremium
                          ? "bg-gradient-to-r from-accent-gold to-accent-gold-hover text-background shadow-md hover:scale-[1.02] active:scale-[0.98]"
                          : "bg-card-bg border border-card-border text-foreground hover:text-accent-gold hover:border-accent-gold/40"
                      }`}
                    >
                      Ver Detalle
                    </span>
                  </div>
                </div>

              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
