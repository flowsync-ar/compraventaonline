"use client";

import { useEffect, useState } from "react";

interface ThemedImageProps {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
}

// The <html> tag's data-theme attribute is set by a blocking inline script
// in layout.tsx BEFORE hydration (see suppressHydrationWarning there) —
// specifically to avoid a flash of the wrong theme. This component used to
// ignore that and always start on darkSrc, correcting itself only after
// mount via the effect below: on a light-theme visit, that's a visible
// blink (wrong logo painted, then swapped). Reading the attribute in the
// lazy initializer instead picks the right image on the very first client
// render — server-rendered HTML still says darkSrc (no `document` there),
// so this is a deliberate, harmless hydration mismatch on one attribute,
// same trade-off the <html> tag already makes.
function initialSrc(lightSrc: string, darkSrc: string): string {
  if (typeof document === "undefined") return darkSrc;
  return document.documentElement.getAttribute("data-theme") === "light" ? lightSrc : darkSrc;
}

export default function ThemedImage({ lightSrc, darkSrc, alt, className }: ThemedImageProps) {
  const [src, setSrc] = useState(() => initialSrc(lightSrc, darkSrc));

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
  return <img src={src} alt={alt} className={className} suppressHydrationWarning />;
}
