"use client";

import { useEffect, useState } from "react";
import FeaturedListingCard from "@/components/FeaturedListingCard";
import type { FeaturedListingCard as FeaturedListingCardData } from "@/lib/featuredListings";

function useVisibleCount() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const update = () => setCount(lg.matches ? 4 : sm.matches ? 2 : 1);
    update();
    sm.addEventListener("change", update);
    lg.addEventListener("change", update);
    return () => {
      sm.removeEventListener("change", update);
      lg.removeEventListener("change", update);
    };
  }, []);

  return count;
}

export default function FeaturedListingsCarousel({
  items,
  sellerIdsWithSales,
}: {
  items: FeaturedListingCardData[];
  sellerIdsWithSales: string[];
}) {
  const viewportCount = useVisibleCount();
  const visibleCount = Math.max(1, Math.min(viewportCount, Math.max(items.length, 1)));
  const sales = new Set(sellerIdsWithSales);
  const shouldMove = items.length > 1;
  const copies = shouldMove ? Math.max(2, Math.ceil((visibleCount * 2) / items.length)) : 1;
  const loopItems = Array.from({ length: copies }, (_, copy) =>
    items.map((item) => ({ item, copy }))
  ).flat();
  const durationSec = Math.max(28, items.length * 10);

  return (
    <div className="group relative">
      <div className="overflow-hidden px-1 py-1">
        <div
          className={`flex ${shouldMove ? "featured-marquee motion-reduce:animate-none group-hover:[animation-play-state:paused]" : ""}`}
          style={{
            width: `${(loopItems.length / visibleCount) * 100}%`,
            ["--marquee-shift" as string]: `-${100 / copies}%`,
            animationDuration: `${durationSec}s`,
          }}
        >
          {loopItems.map(({ item, copy }) => (
            <div
              key={`${copy}-${item.id}`}
              className="min-w-0 px-3"
              style={{ width: `${100 / loopItems.length}%` }}
            >
              <FeaturedListingCard
                highlight={item}
                sellerHasSales={!!item.listings?.sellers?.id && sales.has(item.listings.sellers.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
