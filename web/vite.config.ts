import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,

    // ❌ REMOVE route proxies
    // ❌ Vite must serve these routes as SPA pages
    // ❌ DO NOT forward them to gateway

    proxy: {
      // Only proxy API calls if needed:
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },

  // ⬅️ This tells Vite: "Serve index.html for ANY unknown route"
  appType: "spa",
});
