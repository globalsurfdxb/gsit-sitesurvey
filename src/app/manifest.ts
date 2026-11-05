import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GS IT ELV Site Survey",
    short_name: "Site Survey",
    description: "Offline-first ELV pre-sale site survey for field engineers.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1f3d",
    theme_color: "#0f1f3d",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "New survey", url: "/", description: "Open the survey list" }],
  };
}
