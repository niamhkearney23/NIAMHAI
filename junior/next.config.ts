import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(".") },
  poweredByHeader: false,
  devIndicators: false,
  // unpdf ships its own PDF.js build; keep it out of the server bundle.
  serverExternalPackages: ["unpdf"],
  // Fonts read from disk when rendering carousel cards for Instagram.
  outputFileTracingIncludes: {
    "/api/cron/publish": ["./src/assets/fonts/**"],
    "/briefs/[id]": ["./src/assets/fonts/**"],
    "/api/posts/[id]/cards": ["./src/assets/fonts/**"],
  },
  experimental: {
    serverActions: {
      // Pasted judgments can be long. Uploads go straight to storage, not here.
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
