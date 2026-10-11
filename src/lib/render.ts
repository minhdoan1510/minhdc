// render.ts — server-side Editor.js JSON → HTML for the blog reader.
//
// SERVER ONLY. It depends on sanitize-html, which is a Node library (it pulls
// in postcss, fs, path); importing this from a client island drags that whole
// tree into the browser bundle. The admin island imports blocks.ts instead.
//
// Editor.js stores block text as *inline HTML* (<b>, <i>, <a>, <mark>, …), so
// text fields must never be escaped — they get run through an allowlist. The
// `code` block and every attribute value are the opposite: plain text that must
// be escaped. Keeping those three paths straight is the whole job of this file.
import sanitizeHtml from "sanitize-html";
import { MAX_LIST_DEPTH, pickKnownBlocks } from "./blocks";
import type { EditorBlock, EditorDoc } from "./blocks";
import { esc, escAttr, ytId } from "./html";

// Inline text: keep the formatting tags the inline toolbar can produce, drop
// everything else (keeping its text), strip every attribute except a vetted href.
const INLINE: sanitizeHtml.IOptions = {
  allowedTags: ["b", "strong", "i", "em", "u", "s", "mark", "code", "br", "a"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noreferrer noopener" }),
  },
};

// The `raw` block is the one place an author writes markup by hand. A wider
// allowlist keeps it useful; iframes stay pinned to video hosts so a stolen
// admin session can't turn the blog into a script delivery page.
const RAW: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img", "figure", "figcaption", "iframe", "h1", "h2", "video", "source", "u", "s", "mark",
  ]),
  allowedAttributes: {
    "*": ["class"],
    a: ["href", "target", "rel", "name"],
    img: ["src", "alt", "width", "height", "loading"],
    video: ["src", "controls", "width", "height", "poster"],
    source: ["src", "type"],
    iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "loading"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedIframeHostnames: [
    "www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com",
  ],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noreferrer noopener" }),
  },
  // A blocked iframe host loses its src but keeps the element; drop the husk.
  exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src,
};

const PLAIN: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {} };

// Inline HTML, allowlisted. Never call esc() on the result — it is already safe.
function inline(raw: unknown): string {
  return typeof raw === "string" && raw ? sanitizeHtml(raw, INLINE) : "";
}

// Tags stripped, text kept. Output is entity-encoded for `&` and `<`, so it is
// safe as text-node content and must not be escaped again.
function text(raw: unknown): string {
  return typeof raw === "string" && raw ? sanitizeHtml(raw, PLAIN) : "";
}

// text() leaves quotes alone, which is fine in a text node but not inside an
// attribute — finish the job here.
function attr(raw: unknown): string {
  return text(raw).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Reject javascript:/data: and friends; allow absolute http(s), mailto, and
// site-relative paths.
function safeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim();
  if (!u) return null;
  return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(u) ? u : null;
}

const HEADER_LEVELS = new Set([2, 3, 4]);
const COUNTER_TYPES = new Set(["numeric", "lower-roman", "upper-roman", "lower-alpha", "upper-alpha"]);
const TEXT_VARIANTS = new Set(["call-out", "citation", "details"]);
// The embed tool hands us an iframe URL; trust it only for hosts we know, and
// re-derive YouTube's ourselves from the original source URL.
const EMBED_HOSTS = /^https:\/\/(www\.)?(youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/;

function figureClasses(d: Record<string, any>): string {
  const c: string[] = [];
  if (d.withBorder) c.push("is-bordered");
  if (d.withBackground) c.push("is-bg");
  if (d.stretched) c.push("is-stretched");
  return c.length ? ` class="${c.join(" ")}"` : "";
}

function renderFigure(url: string, d: Record<string, any>): string {
  const cap = inline(d.caption);
  return (
    `<figure${figureClasses(d)}>` +
    `<img src="${escAttr(url)}" alt="${attr(d.caption)}" loading="lazy" decoding="async">` +
    (cap ? `<figcaption>${cap}</figcaption>` : "") +
    `</figure>`
  );
}

function renderList(items: any[], style: string, meta: any, depth = 0): string {
  if (depth > MAX_LIST_DEPTH || !Array.isArray(items) || !items.length) return "";

  const li = items
    .map((it) => {
      const sub = renderList(it?.items, style, it?.meta, depth + 1);
      if (style === "checklist") {
        const on = it?.meta?.checked ? " is-checked" : "";
        return `<li class="check-item${on}">${inline(it?.content)}${sub}</li>`;
      }
      return `<li>${inline(it?.content)}${sub}</li>`;
    })
    .join("");

  if (style === "ordered") {
    const start = Number.isInteger(meta?.start) && meta.start > 1 ? ` start="${meta.start}"` : "";
    const ct = COUNTER_TYPES.has(meta?.counterType)
      ? ` style="list-style-type:${meta.counterType}"`
      : "";
    return `<ol${start}${ct}>${li}</ol>`;
  }
  return `<ul${style === "checklist" ? ' class="check-list"' : ""}>${li}</ul>`;
}

function fmtSize(bytes: unknown): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function renderBlock(b: EditorBlock): string {
  const d = b.data ?? {};

  switch (b.type) {
    case "paragraph": {
      const t = inline(d.text);
      return t.trim() ? `<p>${t}</p>` : "";
    }

    case "header": {
      const lv = HEADER_LEVELS.has(Number(d.level)) ? Number(d.level) : 2;
      const t = inline(d.text);
      return t.trim() ? `<h${lv}>${t}</h${lv}>` : "";
    }

    case "list": {
      const style =
        d.style === "ordered" || d.style === "checklist" ? d.style : "unordered";
      return renderList(d.items, style, d.meta);
    }

    case "quote": {
      const t = inline(d.text);
      if (!t.trim()) return "";
      const cap = inline(d.caption);
      return `<blockquote>${t}${cap ? `<cite>${cap}</cite>` : ""}</blockquote>`;
    }

    case "image": {
      const url = safeUrl(d.file?.url);
      return url ? renderFigure(url, d) : "";
    }

    case "simpleImage": {
      const url = safeUrl(d.url);
      return url ? renderFigure(url, d) : "";
    }

    case "embed": {
      const trusted = typeof d.embed === "string" && EMBED_HOSTS.test(d.embed);
      const id = trusted ? null : ytId(String(d.source ?? ""));
      const src = trusted ? d.embed : id ? `https://www.youtube.com/embed/${id}` : null;
      if (!src) return "";
      const cap = inline(d.caption);
      // .yt is the responsive 16:9 wrapper the old editor already produced.
      return (
        `<figure class="embed"><div class="yt">` +
        `<iframe src="${escAttr(src)}" allow="accelerometer; autoplay; clipboard-write; ` +
        `encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>` +
        `</div>${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`
      );
    }

    case "table": {
      const rows: any[] = Array.isArray(d.content) ? d.content : [];
      if (!rows.length) return "";
      const cell = (c: unknown, tag: "th" | "td") => `<${tag}>${inline(c)}</${tag}>`;
      const head = d.withHeadings ? rows[0] : null;
      const body = d.withHeadings ? rows.slice(1) : rows;
      return (
        `<div class="table-wrap"><table${d.stretched ? ' class="is-stretched"' : ""}>` +
        (head
          ? `<thead><tr>${(head as unknown[]).map((c) => cell(c, "th")).join("")}</tr></thead>`
          : "") +
        `<tbody>${body
          .map((r: unknown[]) => `<tr>${(Array.isArray(r) ? r : []).map((c) => cell(c, "td")).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
    }

    // Code is plain text, not inline HTML — escape it whole.
    case "code": {
      const code = String(d.code ?? "");
      return code.trim() ? `<pre class="code-block"><code>${esc(code)}</code></pre>` : "";
    }

    case "delimiter":
      return `<hr class="delimiter">`;

    case "warning": {
      const title = inline(d.title);
      const msg = inline(d.message);
      if (!title.trim() && !msg.trim()) return "";
      return (
        `<aside class="warning">` +
        (title ? `<p class="warning-title">${title}</p>` : "") +
        (msg ? `<p class="warning-message">${msg}</p>` : "") +
        `</aside>`
      );
    }

    case "linkTool": {
      const href = safeUrl(d.link);
      if (!href) return "";
      const meta = d.meta ?? {};
      const img = safeUrl(meta.image?.url);
      const title = text(meta.title) || attr(d.link);
      const desc = text(meta.description);
      const site = text(meta.site_name) || esc(hostOf(href));
      return (
        `<a class="link-card" href="${escAttr(href)}" target="_blank" rel="noreferrer noopener">` +
        (img ? `<span class="link-card-img"><img src="${escAttr(img)}" alt="" loading="lazy"></span>` : "") +
        `<span class="link-card-body">` +
        `<span class="link-card-title">${title}</span>` +
        (desc ? `<span class="link-card-desc">${desc}</span>` : "") +
        `<span class="link-card-site">${site}</span>` +
        `</span></a>`
      );
    }

    case "raw":
      return sanitizeHtml(String(d.html ?? ""), RAW);

    case "attaches": {
      const url = safeUrl(d.file?.url);
      if (!url) return "";
      const name = text(d.title) || text(d.file?.name) || "Tệp đính kèm";
      const ext = text(d.file?.extension).slice(0, 8).toUpperCase();
      const size = fmtSize(d.file?.size);
      return (
        `<a class="attach" href="${escAttr(url)}" download>` +
        `<span class="attach-ext">${ext || "FILE"}</span>` +
        `<span class="attach-body"><span class="attach-name">${name}</span>` +
        (size ? `<span class="attach-size">${esc(size)}</span>` : "") +
        `</span></a>`
      );
    }

    case "personality": {
      const name = text(d.name);
      const desc = text(d.description);
      if (!name && !desc) return "";
      const photo = safeUrl(d.photo);
      const link = safeUrl(d.link);
      const inner =
        (photo ? `<img class="personality-photo" src="${escAttr(photo)}" alt="" loading="lazy">` : "") +
        `<span class="personality-body">` +
        (name ? `<span class="personality-name">${name}</span>` : "") +
        (desc ? `<span class="personality-desc">${desc}</span>` : "") +
        `</span>`;
      return link
        ? `<a class="personality" href="${escAttr(link)}" target="_blank" rel="noreferrer noopener">${inner}</a>`
        : `<aside class="personality">${inner}</aside>`;
    }

    default:
      return "";
  }
}

// The text-variant tune wraps any block in one of three presentation variants.
function applyTunes(html: string, b: EditorBlock): string {
  if (!html) return "";
  const v = b.tunes?.textVariant;
  return typeof v === "string" && TEXT_VARIANTS.has(v) ? `<div class="tv-${v}">${html}</div>` : html;
}

export function renderDoc(doc: EditorDoc | null | undefined): string {
  return (doc?.blocks ?? [])
    .map((b) => (b && typeof b.type === "string" ? applyTunes(renderBlock(b), b) : ""))
    .filter(Boolean)
    .join("");
}

// ── write path ──────────────────────────────────────────────────────────────
//
// Rendering is not the only consumer of a stored document: the admin editor
// loads block text straight back into contenteditable. Sanitizing only on the
// way out would leave `<img src=x onerror=…>` live in the database and fire it
// in the author's own browser. So the document is cleaned on the way IN too,
// field by field, and the render-side allowlists above stay as a second line.

const ALIGNMENTS = new Set(["left", "center"]);
const LIST_STYLES = new Set(["ordered", "unordered", "checklist"]);

const bool = (v: unknown): boolean => v === true;
const num = (v: unknown): number | undefined =>
  Number.isFinite(Number(v)) ? Number(v) : undefined;

function cleanListItems(items: unknown, depth = 0): any[] {
  if (depth > MAX_LIST_DEPTH || !Array.isArray(items)) return [];
  return items.slice(0, 200).map((it: any) => ({
    content: inline(it?.content),
    meta: {
      ...(typeof it?.meta?.checked === "boolean" ? { checked: it.meta.checked } : {}),
      ...(Number.isInteger(it?.meta?.start) ? { start: it.meta.start } : {}),
      ...(COUNTER_TYPES.has(it?.meta?.counterType) ? { counterType: it.meta.counterType } : {}),
    },
    items: cleanListItems(it?.items, depth + 1),
  }));
}

function cleanData(type: string, d: Record<string, any>): Record<string, any> {
  switch (type) {
    case "paragraph":
      return { text: inline(d.text) };

    case "header":
      return {
        text: inline(d.text),
        level: HEADER_LEVELS.has(Number(d.level)) ? Number(d.level) : 2,
      };

    case "list":
      return {
        style: LIST_STYLES.has(d.style) ? d.style : "unordered",
        meta: {
          ...(Number.isInteger(d.meta?.start) ? { start: d.meta.start } : {}),
          ...(COUNTER_TYPES.has(d.meta?.counterType) ? { counterType: d.meta.counterType } : {}),
        },
        items: cleanListItems(d.items),
      };

    case "quote":
      return {
        text: inline(d.text),
        caption: inline(d.caption),
        alignment: ALIGNMENTS.has(d.alignment) ? d.alignment : "left",
      };

    case "image":
      return {
        file: { url: safeUrl(d.file?.url) ?? "" },
        caption: inline(d.caption),
        withBorder: bool(d.withBorder),
        withBackground: bool(d.withBackground),
        stretched: bool(d.stretched),
      };

    case "simpleImage":
      return {
        url: safeUrl(d.url) ?? "",
        caption: inline(d.caption),
        withBorder: bool(d.withBorder),
        withBackground: bool(d.withBackground),
        stretched: bool(d.stretched),
      };

    case "embed":
      return {
        service: text(d.service).slice(0, 40),
        source: safeUrl(d.source) ?? "",
        embed: safeUrl(d.embed) ?? "",
        ...(num(d.width) ? { width: num(d.width) } : {}),
        ...(num(d.height) ? { height: num(d.height) } : {}),
        caption: inline(d.caption),
      };

    case "table":
      return {
        withHeadings: bool(d.withHeadings),
        stretched: bool(d.stretched),
        content: (Array.isArray(d.content) ? d.content : [])
          .slice(0, 200)
          .map((row: unknown) =>
            (Array.isArray(row) ? row : []).slice(0, 40).map((c) => inline(c))
          ),
      };

    // Plain text by definition — stored verbatim, escaped at render time.
    case "code":
      return { code: String(d.code ?? "").slice(0, 200_000) };

    case "delimiter":
      return {};

    case "warning":
      return { title: inline(d.title), message: inline(d.message) };

    case "linkTool": {
      const img = safeUrl(d.meta?.image?.url);
      return {
        link: safeUrl(d.link) ?? "",
        meta: {
          title: text(d.meta?.title).slice(0, 300),
          site_name: text(d.meta?.site_name).slice(0, 120),
          description: text(d.meta?.description).slice(0, 600),
          ...(img ? { image: { url: img } } : {}),
        },
      };
    }

    case "raw":
      return { html: sanitizeHtml(String(d.html ?? ""), RAW) };

    case "attaches":
      return {
        file: {
          url: safeUrl(d.file?.url) ?? "",
          ...(num(d.file?.size) ? { size: num(d.file?.size) } : {}),
          name: text(d.file?.name).slice(0, 300),
          extension: text(d.file?.extension).slice(0, 12),
        },
        title: text(d.title).slice(0, 300),
      };

    case "personality":
      return {
        name: text(d.name).slice(0, 200),
        description: text(d.description).slice(0, 600),
        link: safeUrl(d.link) ?? "",
        photo: safeUrl(d.photo) ?? "",
      };

    default:
      return {};
  }
}

export function sanitizeDoc(input: unknown): EditorDoc {
  const doc = pickKnownBlocks(input);
  return {
    ...doc,
    blocks: doc.blocks.map((b) => {
      const variant = b.tunes?.textVariant;
      return {
        ...(b.id ? { id: b.id } : {}),
        type: b.type,
        data: cleanData(b.type, b.data ?? {}),
        ...(typeof variant === "string" && TEXT_VARIANTS.has(variant)
          ? { tunes: { textVariant: variant } }
          : {}),
      };
    }),
  };
}
