"use client";

import { useEffect, useState } from "react";

interface ThemedImageProps {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
}

export default function ThemedImage({ lightSrc, darkSrc, alt, className }: ThemedImageProps) {
  const [src, setSrc] = useState(darkSrc);

  useEffect(() => {
    const updateSrc = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      setSrc(theme === "light" ? lightSrc : darkSrc);
    };

    updateSrc();

    const observer = new MutationObserver(updateSrc);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [lightSrc, darkSrc]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
