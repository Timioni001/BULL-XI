import type { NextConfig } from "next";

/**
 * Static export: the whole site is plain files served by Cloudflare Workers
 * Static Assets on the free plan. No server routes; all data loads client-side
 * through lib/data/.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
