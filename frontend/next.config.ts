import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Wildcarded so this keeps working regardless of which Supabase
    // project ref the env points at (dev/staging/prod) — every uploaded
    // image (listings, avatars, hero slides) is served from
    // <project-ref>.supabase.co/storage/v1/object/public/...
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
