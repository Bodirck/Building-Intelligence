import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The dev server proxies /api to the FastAPI backend (default :8000, overridable
// with VITE_API_TARGET). Routes are lazy-loaded (see App.tsx) and the heavy charting
// and mapping libraries are split into their own chunks, so recharts and leaflet only
// download when a page that uses them is opened.
const apiTarget = process.env.VITE_API_TARGET || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": apiTarget,
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          recharts: ["recharts"],
          leaflet: ["leaflet", "react-leaflet"],
          i18n: ["i18next", "react-i18next"],
        },
      },
    },
  },
});
