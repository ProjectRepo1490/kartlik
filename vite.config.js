import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Telefona "uygulama olarak yükle": bildirim (manifest), simgeler ve internetsiz açılma için önbellek.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      workbox: { globPatterns: ["**/*.{js,css,html,png,svg}"] },
      manifest: {
        name: "Kartlık",
        short_name: "Kartlık",
        description: "Kelime kartları oluştur, dört farklı modla çalış.",
        lang: "tr",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#E6EBF2",
        theme_color: "#E6EBF2",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  // Göreli yol: proje herhangi bir alt klasörde (ör. GitHub Pages) yayınlanabilir.
  base: "./",
});
