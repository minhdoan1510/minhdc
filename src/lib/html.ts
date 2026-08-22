// html.ts — content helpers ported from the prototype (store.js, components.jsx,
// admin.jsx). Pure functions, safe on both server and client.

export type Lang = "vi" | "en";

export interface Localized {
  vi?: string;
  en?: string;
}

export interface LegacyBlock {
  type: "p" | "h2" | "quote" | "image";
  vi?: string;
  en?: string;
  src?: string;
  caption?: Localized;
}

// Escape user/content text for safe HTML interpolation.
export function esc(s: string | undefined | null): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Convert a legacy block-array body → an HTML string for one language.
// Used to migrate the seed posts (data.js) into stored bodyHtml.
export function blocksToHtml(body: LegacyBlock[] | undefined, lang: Lang): string {
  if (!Array.isArray(body)) return "";
  return body
    .map((b) => {
      if (b.type === "image") {
        if (!b.src) return "";
        const cap =
          (b.caption && (b.caption[lang] || b.caption.vi || b.caption.en)) || "";
        return `<figure contenteditable="false"><img src="${b.src}" alt="${esc(cap)}"></figure>`;
      }
      const txt = esc(b[lang] || b.vi || b.en || "");
      if (!txt) return "";
      if (b.type === "h2") return `<h2>${txt}</h2>`;
      if (b.type === "quote") return `<blockquote>${txt}</blockquote>`;
      return `<p>${txt}</p>`;
    })
    .join("");
}

// Body HTML for a post in a given language, regardless of storage format.
export function postHtml(
  post: { bodyHtml?: Localized; body?: LegacyBlock[] },
  lang: Lang
): string {
  if (post.bodyHtml) {
    return post.bodyHtml[lang] || post.bodyHtml.vi || post.bodyHtml.en || "";
  }
  return blocksToHtml(post.body, lang);
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

// Strip tags to plain text (for read-time estimation).
function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ");
}

// Estimate read time in minutes from a bilingual bodyHtml.
export function estMins(bodyHtml: Localized): number {
  const text = stripHtml(bodyHtml.vi || bodyHtml.en || "");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 170));
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

// Extract a YouTube video id from common URL shapes — ported from admin.jsx.
export function ytId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}
