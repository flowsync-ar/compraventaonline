import Link from "next/link";
import Image from "next/image";
import CompanyLogoBadge from "@/components/CompanyLogoBadge";
import FavoriteButton from "@/components/FavoriteButton";
import type { FeaturedListingCard as FeaturedListingCardData } from "@/lib/featuredListings";

export default function FeaturedListingCard({
  highlight,
}: {
  highlight: FeaturedListingCardData;
}) {
  const listing = highlight.listings;
  if (!listing) return null;

  const product = listing.products;
  const image = product?.images?.[0] ?? "/sinimagen.webp";

  return (
    <Link
      href={`/listings/${listing.id}`}
      prefetch={false}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-accent-gold/35 bg-card-bg-solid shadow-[0_0_20px_rgba(217,119,6,0.08)] transition-all hover:-translate-y-0.5 hover:border-accent-gold hover:shadow-[0_8px_28px_rgba(217,119,6,0.14)]"
    >
      <div className="relative">
        <FavoriteButton listingId={listing.id} />
        <span className={`absolute z-10 rounded-lg bg-accent-gold px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-md uppercase ${
          listing.sellers?.partner && listing.sellers.avatar_url ? "top-3 right-3" : "top-3 left-3"
        }`}>
          ⚡ DESTACADO
        </span>
        {listing.sellers?.partner ? (
          <CompanyLogoBadge src={listing.sellers.avatar_url} name={listing.sellers.name} size="sm" />
        ) : null}
        <div className="relative h-36 w-full overflow-hidden bg-card-bg">
          <Image
            src={image}
            alt={product?.name ?? "Producto"}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 23vw"
            className="object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase">
          <span className="truncate">{product?.categories?.name ?? "Sin categoría"}</span>
          <span
            className={`rounded px-1.5 py-0.5 ${
              listing.condition === "NEW"
                ? "bg-accent-green/10 text-accent-green"
                : "bg-text-muted/10 text-text-muted"
            }`}
          >
            {listing.condition === "NEW" ? "NUEVO" : "USADO"}
          </span>
        </div>

        <h3 className="font-heading line-clamp-1 break-words [overflow-wrap:anywhere] text-sm font-bold text-foreground transition-colors group-hover:text-accent-gold">
          {product?.name ?? "Sin nombre"}
        </h3>

        <div className="flex items-baseline gap-1">
          <span className="font-heading text-base font-extrabold text-foreground">
            {listing.currencies?.symbol ?? "$"}
          </span>
          <span className="font-heading text-base font-extrabold text-foreground">
            {listing.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </Link>
  );
}
