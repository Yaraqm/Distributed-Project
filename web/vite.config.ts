import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/doctor": {
        target: "http://localhost:4001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/doctor/, ""),
      },
      "/lab": {
        target: "http://localhost:4003",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lab/, ""),
      },
      "/pharmacy": {
        target: "http://localhost:4004",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pharmacy/, ""),
      },
      "/admin": {
        target: "http://localhost:4002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/admin/, ""),
      },
    },
  },
});
