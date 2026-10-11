// blocks.ts — the Editor.js document model. Types, parsing, the write-path
// whitelist, and read-time estimation.
//
// This module must stay dependency-free: the admin island imports it, so
// anything it pulls in lands in the browser bundle. The HTML renderer needs
// sanitize-html (a Node library), and therefore lives in render.ts instead.
import { esc } from "./html";
import type { Lang } from "./html";

// Structural types, declared here rather than imported from @editorjs/editorjs:
// nothing outside the admin island may name that browser-only package.
export interface EditorBlock {
  id?: string;
  type: string;
  data?: Record<string, any>;
  tunes?: Record<string, any>;
}

export interface EditorDoc {
  time?: number;
  version?: string;
  blocks: EditorBlock[];
}

export const emptyDoc = (): EditorDoc => ({ blocks: [] });

// Every block type registered in the admin editor. Anything else is dropped on
// write and ignored on render.
export const KNOWN_TYPES = new Set([
  "paragraph", "header", "list", "quote", "image", "simpleImage", "embed",
  "table", "code", "delimiter", "warning", "linkTool", "raw", "attaches",
  "personality",
]);

const MAX_BLOCKS = 500;
export const MAX_LIST_DEPTH = 6;

// Never let one malformed row 500 the whole blog.
export function parseDoc(raw: string | null | undefined): EditorDoc {
  if (!raw) return emptyDoc();
  try {
    const d = JSON.parse(raw);
    return Array.isArray(d?.blocks) ? { ...d, blocks: d.blocks } : emptyDoc();
  } catch {
    return emptyDoc();
  }
}

// Structural pass over an incoming document: known block types only, capped
// size, predictable shape. The per-field HTML allowlisting that has to follow
// it needs the sanitizer, so it lives in render.ts's sanitizeDoc() — which is
// what the API route calls. Nothing should persist the output of this function
// on its own.
export function pickKnownBlocks(input: unknown): EditorDoc {
  const blocks = (input as EditorDoc)?.blocks;
  if (!Array.isArray(blocks)) return emptyDoc();
  const kept: EditorBlock[] = [];
  for (const b of blocks.slice(0, MAX_BLOCKS)) {
    if (!b || typeof b.type !== "string" || !KNOWN_TYPES.has(b.type)) continue;
    kept.push({
      ...(typeof b.id === "string" ? { id: b.id } : {}),
      type: b.type,
      data: b.data && typeof b.data === "object" ? b.data : {},
      ...(b.tunes && typeof b.tunes === "object" ? { tunes: b.tunes } : {}),
    });
  }
  return { blocks: kept, version: (input as EditorDoc)?.version };
}

// Body for one language, falling back vi → en (replaces the old postHtml()).
export function postBody(
  post: { body?: { vi?: EditorDoc; en?: EditorDoc } },
  lang: Lang
): EditorDoc {
  const b = post.body;
  if (!b) return emptyDoc();
  const pick = b[lang];
  if (pick?.blocks?.length) return pick;
  return b.vi?.blocks?.length ? b.vi : b.en ?? emptyDoc();
}

// ── read time ───────────────────────────────────────────────────────────────

// Word counting only — a regex tag strip is enough here, and keeps this module
// free of the sanitizer.
const strip = (s: unknown): string =>
  typeof s === "string" ? s.replace(/<[^>]*>/g, " ") : "";

export function docText(doc: EditorDoc | null | undefined): string {
  const out: string[] = [];
  const walkList = (items: any[], depth = 0) => {
    if (depth > MAX_LIST_DEPTH || !Array.isArray(items)) return;
    for (const it of items) {
      out.push(strip(it?.content));
      walkList(it?.items, depth + 1);
    }
  };

  for (const b of doc?.blocks ?? []) {
    const d = b?.data ?? {};
    switch (b?.type) {
      case "paragraph":
      case "header":
        out.push(strip(d.text));
        break;
      case "quote":
        out.push(strip(d.text), strip(d.caption));
        break;
      case "list":
        walkList(d.items);
        break;
      case "table":
        for (const row of Array.isArray(d.content) ? d.content : []) {
          for (const cell of Array.isArray(row) ? row : []) out.push(strip(cell));
        }
        break;
      case "code":
        out.push(String(d.code ?? ""));
        break;
      case "warning":
        out.push(strip(d.title), strip(d.message));
        break;
      case "image":
      case "simpleImage":
      case "embed":
        out.push(strip(d.caption));
        break;
      case "linkTool":
        out.push(strip(d.meta?.title), strip(d.meta?.description));
        break;
      case "personality":
        out.push(strip(d.name), strip(d.description));
        break;
      case "raw":
        out.push(strip(d.html));
        break;
    }
  }
  return out.filter(Boolean).join(" ").replace(/&[a-z]+;|&#\d+;/gi, " ");
}

// Read time from a bilingual body.
export function estMins(body: { vi?: EditorDoc; en?: EditorDoc }): number {
  const doc = body?.vi?.blocks?.length ? body.vi : body?.en;
  const words = docText(doc).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 170));
}

// ── seed conversion ─────────────────────────────────────────────────────────

export interface SeedBlock {
  type: "p" | "h2" | "quote" | "image";
  vi?: string;
  en?: string;
  src?: string;
  caption?: { vi?: string; en?: string };
}

// The bundled seed posts are authored as a compact bilingual block array; this
// is the 1:1 lift into Editor.js blocks. Seed strings are plain text going into
// an inline-HTML field, so they get escaped on the way in.
export function seedBlocksToDoc(body: SeedBlock[] | undefined, lang: Lang): EditorDoc {
  if (!Array.isArray(body)) return emptyDoc();

  const blocks: EditorBlock[] = [];
  for (const b of body) {
    if (b.type === "image") {
      if (!b.src) continue;
      const cap = b.caption?.[lang] || b.caption?.vi || b.caption?.en || "";
      blocks.push({
        type: "image",
        data: {
          file: { url: b.src },
          caption: esc(cap),
          withBorder: false,
          withBackground: false,
          stretched: false,
        },
      });
      continue;
    }

    const raw = b[lang] || b.vi || b.en || "";
    if (!raw) continue;
    const t = esc(raw);
    if (b.type === "h2") blocks.push({ type: "header", data: { text: t, level: 2 } });
    else if (b.type === "quote")
      blocks.push({ type: "quote", data: { text: t, caption: "", alignment: "left" } });
    else blocks.push({ type: "paragraph", data: { text: t } });
  }
  return { blocks };
}
