"use client";

import { useEffect, useState } from "react";
import GenericAvatar from "./GenericAvatar";

// Shows a seller's real avatar_url, falling back to GenericAvatar both when
// there's no URL AND when the URL fails to actually load (broken link,
// transient network hiccup) — without this, a failed <img> just renders
// nothing/a broken-image icon instead of the generic placeholder.
export default function SellerAvatar({
  src,
  alt,
  // object-contain (not object-cover): a logo or portrait shouldn't get its
  // edges/text cropped just to fill a perfect circle — better to show the
  // whole image with a neutral backdrop behind whatever gap that leaves.
  className = "h-full w-full object-contain bg-card-bg",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // A new src (e.g. right after uploading a new photo) deserves a fresh
  // attempt, even if a previous different URL had failed.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <GenericAvatar className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}
