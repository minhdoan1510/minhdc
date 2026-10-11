# Minh Doan — personal blog

A bilingual (Vietnamese / English) personal blog with a vintage-paper aesthetic,
built from a Claude Design handoff. Astro SSR + React islands on Cloudflare
Workers, backed by D1 (database) and R2 (uploads) with a server-side admin.

## Stack

- **Astro 7** (SSR, `@astrojs/cloudflare` adapter) — server-rendered pages + API routes on Workers
- **React islands** (`@astrojs/react`) — only the interactive bits hydrate (blog search, newsletter, admin editor)
- **Cloudflare D1** — schema in `migrations/`, seeded on first request when empty
- **Cloudflare R2** — uploaded images (`/uploads/*`) and attachments (`/api/file/*`)
- **View Transitions** — SPA-like navigation with the prototype's entrance animations

## Setup

```bash
bun install
echo 'ADMIN_PASSWORD=changeme' > .dev.vars
bun run db:migrate        # create tables in the local D1
bun run dev               # http://localhost:4321 (local D1/R2 under .wrangler/)
```

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server with HMR |
| `bun run build` | Production build → `dist/` |
| `bun run preview` | Build, then run the Worker locally (`wrangler dev`) |
| `bun run deploy` | Apply D1 migrations remotely + `wrangler deploy` (after `build`; Workers Builds runs this) |
| `bun run db:migrate` | Apply D1 migrations to the local database |
| `bun run cf-typegen` | Regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc` |

## Features

- **Home** — Statement hero, 4 most-recent posts, newsletter signup, contact footer
- **Blog** (`/blog`) — client-side search + tag filtering
- **Article** (`/blog/[slug]`) — rich HTML body, "next up" link
- **Admin** (`/admin`) — password-gated post manager built on [Editor.js](https://editorjs.io).
  Post bodies are stored as Editor.js block JSON and rendered to HTML server-side.
  Blocks: paragraph, heading, list (bulleted / numbered / checklist), quote,
  image, table, code, delimiter, warning, link card, raw HTML, attachment,
  personality — plus pasted images and embeds, inline bold / italic / underline
  / marker / inline-code / link, and the call-out / citation / details tune.
  Images are resized client-side and stored in R2 (served at `/uploads/[name]`);
  attachments are served from R2 as forced downloads via `/api/file/[id]`.
- **Light / dark** toggle (persisted in `localStorage`) and **VI / EN** toggle
  (cookie-driven, server-rendered).

## Configuration

| Binding / secret | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Password for `/admin` and mutating API routes (`.dev.vars` locally, a Worker secret in prod; admin is locked while unset) |
| `DB` | D1 database `minhdc` |
| `FILES` | R2 bucket `minhdc-files` |

## Deploy

Cloudflare Workers Builds is connected to this repo: every push to `main` runs
`bun run build`, applies D1 migrations, then `wrangler deploy` on Cloudflare.
Build logs: Workers & Pages → `minhdc` → Deployments (or `cf builds list`).

Set the admin password once (until it is set, admin login is disabled):

```bash
cf workers secrets update ADMIN_PASSWORD --worker minhdc --type secret_text --text '<password>'
```

## Project layout

- `src/content/seed.ts` — seed posts/profile/tags (ported from the design)
- `src/lib/` — `db` (D1 + seeding), `posts` (CRUD), `blocks` (Editor.js document model, client-safe), `render` (block JSON → HTML, server-only), `i18n`, `html` (content helpers), `auth`
- `src/components/` — `.astro` presentational + `.tsx` islands (`admin/` for the editor)
- `src/pages/` — pages + `api/` endpoints (`posts`, `upload`, `upload/file`, `file/[id]`, `link-preview`, `subscribe`, `logout`)
- `src/styles/global.css` — design CSS + theme tokens
- `src/middleware.ts` — auth gate for admin pages and mutating APIs

## Notes / departures from the prototype

- Posts live **server-side in D1** (the prototype used `localStorage`).
- Images **upload to R2** instead of being inlined as base64.
- **Admin auth** was added (the prototype had none) since the backend now exposes write endpoints.
- The design-time "Tweaks" panel is dropped; only the light/dark toggle is user-facing.
- The VI/EN toggle **reloads** the page (cookie + view transition) rather than swapping client-side — idiomatic for SSR and SEO-friendly.
