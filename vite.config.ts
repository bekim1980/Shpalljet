import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: [
        "favicon.ico",
        "favicon.png",
        "favicon-32.png",
        "apple-touch-icon.png",
        "icon.svg",
        "offline.html",
      ],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/api\//,
          /^\/auth\//,
          /supabase\.co/,
        ],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      manifest: {
        id: "/",
        name: "Shpalljet — Marketplace",
        short_name: "Shpalljet",
        description:
          "Bli, shit, jep me qira dhe gjej shërbime, punë e udhëtime — marketplace për shqiptarët kudo.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        display_override: ["standalone", "browser"],
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "sq",
        dir: "ltr",
        categories: ["shopping", "business", "lifestyle"],
        icons: [
          {
            src: "pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshots/browse-wide.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Browse listings on desktop",
          },
          {
            src: "screenshots/browse-narrow.png",
            sizes: "750x1334",
            type: "image/png",
            form_factor: "narrow",
            label: "Shpalljet on mobile",
          },
        ],
        shortcuts: [
          {
            name: "Browse",
            short_name: "Browse",
            url: "/browse?vertical=market",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Sell",
            short_name: "Sell",
            url: "/sell",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Search",
            short_name: "Search",
            url: "/search",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
