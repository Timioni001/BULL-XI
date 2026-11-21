import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BULL-XI",
    short_name: "BULL-XI",
    description: "Fantasy football for stocks. Live leagues, 24/7.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#161618",
    theme_color: "#161618",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
