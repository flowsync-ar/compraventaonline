"use client";

import { useId } from "react";

// Classic generic-profile-photo placeholder (gray circle, person silhouette)
// — shown wherever a seller has no avatar_url. useId() keeps the clipPath
// id unique per instance so multiple avatars on the same page (a listings
// grid, a notifications panel, ...) don't collide on a duplicate DOM id.
export default function GenericAvatar({ className = "h-full w-full" }: { className?: string }) {
  const clipId = useId();

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="100" fill="#d9dbdf" />
        <circle cx="50" cy="40" r="18" fill="#eef0f2" />
        <ellipse cx="50" cy="104" rx="34" ry="34" fill="#eef0f2" />
      </g>
    </svg>
  );
}
