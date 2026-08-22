import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";

// SSR site: server-rendered content + API endpoints, with React islands
// for the interactive bits (admin editor, blog search, newsletter).
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  // Allow any Host header in dev (e.g. cloudflare quick tunnels). This is
  // Astro's own option — `true` means allow all. Dev-only.
  server: {
    allowedHosts: true,
  },
  vite: {
    // better-sqlite3 is a native module; keep it external to the SSR bundle.
    ssr: { external: ["better-sqlite3"] },
    // Pre-bundle React up front and dedupe to one copy, so island hydration
    // never races a mid-session dependency re-optimization.
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    },
    resolve: { dedupe: ["react", "react-dom"] },
  },
});
