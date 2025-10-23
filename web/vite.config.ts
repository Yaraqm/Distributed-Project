import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // only proxy actual API endpoints, not the /doctor route itself
      "^/doctor/(health|tests|events)": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
      "^/admin/(health|events)": {
        target: "http://localhost:4002",
        changeOrigin: true,
      },
      "^/lab/(health|results|events)": {
        target: "http://localhost:4003",
        changeOrigin: true,
      },
      "^/pharmacy/(health|prescriptions|events)": {
        target: "http://localhost:4004",
        changeOrigin: true,
      },
    },
  },
});
