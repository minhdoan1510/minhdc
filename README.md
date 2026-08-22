# Minh Doan — personal blog

A bilingual (Vietnamese / English) personal blog with a vintage-paper aesthetic,
built from a Claude Design handoff. Astro SSR + React islands, backed by a
file-based SQLite database with a server-side admin.

## Stack

- **Astro 5** (SSR, `@astrojs/node` standalone adapter) — server-rendered pages + API routes
- **React islands** (`@astrojs/react`) — only the interactive bits hydrate (blog search, newsletter, admin editor)
- **better-sqlite3** — file-based database at `data/blog.db` (auto-created and seeded on first run)
- **View Transitions** — SPA-like navigation with the prototype's entrance animations

## Setup

```bash
npm install
cp .env.example .env      # then set ADMIN_PASSWORD
npm run dev               # http://localhost:4321
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Run the built server (`node ./dist/server/entry.mjs`) |

## Features

- **Home** — Statement hero, 4 most-recent posts, newsletter signup, contact footer
- **Blog** (`/blog`) — client-side search + tag filtering
- **Article** (`/blog/[slug]`) — rich HTML body, "next up" link
- **Admin** (`/admin`) — password-gated post manager with a rich-text editor
  (headings, quotes, bold, links, image upload, YouTube embeds). Posts persist
  in SQLite; images are resized client-side and stored under `public/uploads/`.
- **Light / dark** toggle (persisted in `localStorage`) and **VI / EN** toggle
  (cookie-driven, server-rendered).

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | `changeme` | Password for `/admin` and mutating API routes |
| `DATABASE_PATH` | `data/blog.db` | SQLite file location |

## Project layout

- `src/content/seed.ts` — seed posts/profile/tags (ported from the design)
- `src/lib/` — `db`, `posts` (CRUD), `i18n`, `html` (content helpers), `auth`
- `src/components/` — `.astro` presentational + `.tsx` islands (`admin/` for the editor)
- `src/pages/` — pages + `api/` endpoints (`posts`, `upload`, `subscribe`, `logout`)
- `src/styles/global.css` — design CSS + theme tokens
- `src/middleware.ts` — auth gate for admin pages and mutating APIs

## Notes / departures from the prototype

- Posts live **server-side in SQLite** (the prototype used `localStorage`).
- Images **upload to disk** (`public/uploads/`) instead of being inlined as base64.
- **Admin auth** was added (the prototype had none) since the backend now exposes write endpoints.
- The design-time "Tweaks" panel is dropped; only the light/dark toggle is user-facing.
- The VI/EN toggle **reloads** the page (cookie + view transition) rather than swapping client-side — idiomatic for SSR and SEO-friendly.
