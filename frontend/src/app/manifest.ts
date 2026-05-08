import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kolekto",
    short_name: "Kolekto",
    description: "Tu colectivo, conectado.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F1EA",
    theme_color: "#6B7A3F",
    icons: [
      {
        src: "/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/isotipo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/isotipo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
