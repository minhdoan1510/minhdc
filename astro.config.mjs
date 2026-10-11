import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

const EDITORJS = [
  "@editorjs/editorjs",
  "@editorjs/paragraph",
  "@editorjs/header",
  "@editorjs/list",
  "@editorjs/quote",
  "@editorjs/image",
  "@editorjs/simple-image",
  "@editorjs/embed",
  "@editorjs/table",
  "@editorjs/code",
  "@editorjs/delimiter",
  "@editorjs/warning",
  "@editorjs/link",
  "@editorjs/raw",
  "@editorjs/attaches",
  "@editorjs/personality",
  "@editorjs/marker",
  "@editorjs/inline-code",
  "@editorjs/underline",
  "@editorjs/text-variant-tune",
];

// SSR site: server-rendered content + API endpoints, with React islands
// for the interactive bits (admin editor, blog search, newsletter).
export default defineConfig({
  output: "server",
  // No astro:assets or Astro.session in use — skip the Images + KV bindings
  // the adapter would otherwise provision.
  adapter: cloudflare({ imageService: "passthrough" }),
  session: false,
  integrations: [react()],
  // Allow any Host header in dev (e.g. cloudflare quick tunnels). This is
  // Astro's own option — `true` means allow all. Dev-only.
  server: {
    allowedHosts: true,
  },
  vite: {
    // The Editor.js packages are browser-only (the core dereferences `window`
    // at module scope) and are dynamically imported client-side only — they
    // must never be pulled into the server build.
    ssr: { external: EDITORJS },
    // Pre-bundle React and the editor up front, and dedupe React to one copy,
    // so island hydration never races a mid-session dependency
    // re-optimization. Left to lazy discovery, the first visit to /admin would
    // trigger "new dependencies optimized" + a forced reload mid-hydration.
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        ...EDITORJS,
      ],
    },
    resolve: { dedupe: ["react", "react-dom"] },
    // sanitize-html → postcss is CJS and calls require("path"/"url"/"fs").
    // Workers have no `require`, so a bare external require throws at load.
    // Point those bare ids at tiny bundled ESM re-exports of node:* instead;
    // rolldown can require() a bundled module, and nodejs_compat serves node:*.
    plugins: [
      {
        name: "cjs-node-builtins",
        enforce: "pre",
        applyToEnvironment: (env) => env.name !== "client",
        resolveId: (id) =>
          ["path", "url", "fs"].includes(id) ? `\0node-shim:${id}` : undefined,
        load: (id) =>
          id.startsWith("\0node-shim:")
            ? `export * from "node:${id.slice(11)}"; export { default } from "node:${id.slice(11)}";`
            : undefined,
      },
    ],
  },
});
