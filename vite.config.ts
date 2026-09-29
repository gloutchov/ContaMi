import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildRendererContentSecurityPolicy } from "./src/config/rendererCsp.ts";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: "contami-renderer-csp",
      transformIndexHtml(html) {
        const environment = command === "serve" ? "development" : "production";
        return html.replace("__CONTAMI_RENDERER_CSP__", buildRendererContentSecurityPolicy(environment));
      },
    },
  ],
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
}));
