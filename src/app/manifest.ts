import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LashOS — Gestão para lash designers",
    short_name: "LashOS",
    description:
      "Agenda, clientes, ficha técnica, WhatsApp e financeiro — tudo no seu celular.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf4f6",
    theme_color: "#fdf4f6",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
