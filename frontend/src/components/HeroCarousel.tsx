"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const SLIDES = [
  {
    id: "electronics",
    image:
      "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1600&auto=format&fit=crop",
    eyebrow: "Tecnología",
    title: "Lo último en celulares, notebooks y gadgets",
    cta: "Ver tecnología",
    href: "/search?category=tecnologia",
    darkOverlay: true,
    imageFit: "cover" as const,
    showCta: true,
  },
  {
    id: "agro",
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1600&auto=format&fit=crop",
    eyebrow: "Campo pampeano",
    title: "Productos del caldenal directo a tu mesa",
    cta: "Ver agro",
    href: "/search?category=campo-agro",
    darkOverlay: true,
    imageFit: "cover" as const,
    showCta: true,
  },
  {
    id: "tech",
    image:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=1600&auto=format&fit=crop",
    eyebrow: "Herramientas & hogar",
    title: "Equipá tu proyecto con las mejores ofertas",
    cta: "Explorar",
    href: "/search?category=construccion",
    darkOverlay: true,
    imageFit: "cover" as const,
    showCta: true,
  },
  {
    id: "vehicles",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1600&auto=format&fit=crop",
    eyebrow: "Movilidad",
    title: "Autos y camionetas de toda La Pampa",
    cta: "Ver vehículos",
    href: "/search?category=vehiculos",
    darkOverlay: true,
    imageFit: "cover" as const,
    showCta: true,
  },
] as const;

const INTERVAL_MS = 5500;

export interface HeroSlide {
  id: string;
  image: string;
  eyebrow: string;
  title: string | null;
  cta: string;
  href: string;
  /** Defaults to true when omitted (placeholder slides). */
  darkOverlay?: boolean;
  /** "cover" fills the width and crops overflow (default, right for
   * photos); "contain" shrinks to fit and never crops (right for banners
   * with text baked in near the edges). */
  imageFit?: "cover" | "contain";
  /** Defaults to true when omitted (placeholder slides). */
  showCta?: boolean;
}

interface HeroCarouselProps {
  slides?: HeroSlide[];
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  // Falls back to the built-in placeholder slides when the admin hasn't
  // configured any active slide in hero_slides yet.
  const activeSlides = slides && slides.length > 0 ? slides : SLIDES;
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);

  const goTo = useCallback((index: number) => {
    setActive((index + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  useEffect(() => {
    if (dragging) return;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % activeSlides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activeSlides.length, dragging]);

  // Mouse/touch drag to navigate — Pointer Events cover both with one set
  // of handlers. Only the horizontal distance at release matters, dragged
  // right (positive delta) goes to the previous slide, left goes next —
  // same convention as swiping a photo carousel.
  const DRAG_THRESHOLD_PX = 50;

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    setDragging(true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
    goTo(active + (deltaX > 0 ? -1 : 1));
  };

  return (
    <div className="relative w-full">
      <div
        className="relative h-[260px] sm:h-[340px] md:h-[400px] w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setDragging(false)}
      >
        {activeSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === active ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
            aria-hidden={index !== active}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt=""
              draggable={false}
              className={`h-full w-full object-center ${
                slide.imageFit === "contain" ? "object-contain" : "object-cover scale-105"
              }`}
            />
            <div className="absolute inset-0 mx-auto flex max-w-7xl items-start justify-start p-3 sm:p-4 lg:p-5">
              <div className="max-w-md text-left">
                {slide.eyebrow && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-gold">
                    {slide.eyebrow}
                  </p>
                )}
                {slide.title && (
                  <h2 className="mt-2 font-heading text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight text-foreground">
                    {slide.title}
                  </h2>
                )}
                {slide.showCta !== false && (
                  <Link
                    href={slide.href}
                    className="mt-4 inline-flex rounded-lg bg-background px-4 py-2 text-[11px] font-extrabold text-accent-gold border border-accent-gold/30 hover:border-accent-gold/60 shadow-lg transition-all"
                  >
                    {slide.cta} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 mb-4 flex items-center justify-center gap-2">
        {activeSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Ir al slide ${index + 1}`}
            onClick={() => goTo(index)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              index === active
                ? "w-6 bg-accent-gold"
                : "w-2 bg-foreground/30 hover:bg-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
