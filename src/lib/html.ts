// html.ts — small content helpers shared by the server and the admin island.
// Pure functions, safe on both sides. The Editor.js document model and its
// renderer live in blocks.ts.

export type Lang = "vi" | "en";

export interface Localized {
  vi?: string;
  en?: string;
}

// Escape text for safe HTML interpolation in a text node.
export function esc(s: string | undefined | null): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Same, plus the quotes — required for anything landing inside src="…" /
// href="…", where esc() alone would let a value break out of the attribute.
export function escAttr(s: string | undefined | null): string {
  return esc(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Diacritic-safe slug (handles Vietnamese) — ported from store.js.
export function slugify(str: string): string {
  const base = (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return base || "bai";
}

// Ensure a slug is unique within a set of existing slugs.
export function uniqueSlug(
  base: string,
  existing: string[],
  currentSlug?: string
): string {
  let s = base;
  let n = 2;
  const taken = (x: string) => existing.includes(x) && x !== currentSlug;
  while (taken(s)) s = base + "-" + n++;
  return s;
}

// Extract a YouTube video id from common URL shapes. Still used server-side, as
// the fallback when an embed block's iframe URL isn't one we recognise.
export function ytId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}
