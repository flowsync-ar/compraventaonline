"use client";

import { useCallback, useEffect, useState } from "react";
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
  },
  {
    id: "agro",
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1600&auto=format&fit=crop",
    eyebrow: "Campo pampeano",
    title: "Productos del caldenal directo a tu mesa",
    cta: "Ver agro",
    href: "/search?category=campo-agro",
  },
  {
    id: "tech",
    image:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=1600&auto=format&fit=crop",
    eyebrow: "Herramientas & hogar",
    title: "Equipá tu proyecto con las mejores ofertas",
    cta: "Explorar",
    href: "/search?category=construccion",
  },
  {
    id: "vehicles",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1600&auto=format&fit=crop",
    eyebrow: "Movilidad",
    title: "Autos y camionetas de toda La Pampa",
    cta: "Ver vehículos",
    href: "/search?category=vehiculos",
  },
] as const;

const INTERVAL_MS = 5500;

export interface HeroSlide {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  cta: string;
  href: string;
}

interface HeroCarouselProps {
  slides?: HeroSlide[];
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  // Falls back to the built-in placeholder slides when the admin hasn't
  // configured any active slide in hero_slides yet.
  const activeSlides = slides && slides.length > 0 ? slides : SLIDES;
  const [active, setActive] = useState(0);

  const goTo = useCallback((index: number) => {
    setActive((index + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % activeSlides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activeSlides.length]);

  return (
    <div className="relative w-full">
      <div
        className="relative h-[260px] sm:h-[340px] md:h-[400px] w-full overflow-hidden"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%)",
        }}
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
              className="h-full w-full object-cover object-center scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

            <div className="absolute inset-0 mx-auto flex max-w-7xl items-center px-4 sm:px-6 lg:px-8">
              <div className="max-w-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-gold">
                  {slide.eyebrow}
                </p>
                <h2 className="mt-2 font-heading text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight text-foreground">
                  {slide.title}
                </h2>
                <Link
                  href={slide.href}
                  className="mt-4 inline-flex rounded-lg bg-background/80 px-4 py-2 text-[11px] font-extrabold text-accent-gold border border-accent-gold/30 hover:border-accent-gold/60 backdrop-blur-sm transition-all"
                >
                  {slide.cta} →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Extra dissolve into page background (Mercado Libre style) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-28 bg-gradient-to-b from-transparent to-background"
      />

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
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
