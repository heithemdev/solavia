import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Solavia Administration",
    short_name: "Solavia",
    lang: "fr",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#f7f6ee",
    theme_color: "#173b2b",
    icons: [
      {
        src: "/images/solavia/admin/icon-192.png?v=3",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/solavia/admin/icon-512.png?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
