import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InsTareas",
    short_name: "InsTareas",
    description:
      "Tus tareas del Aula Virtual ESPOL priorizadas y sincronizadas en tu calendario.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F5F7",
    theme_color: "#0071E3",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
