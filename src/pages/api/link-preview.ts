// /api/link-preview — Open Graph fetcher for the Editor.js "linkTool".
//
// This makes the server fetch a URL chosen by the client, which is SSRF by
// construction. Mitigations: admin-only (enforced in middleware for every
// method, since this is a GET), http(s) only, DNS resolved and checked against
// private ranges before each request, redirects followed manually with the same
// check, hard timeout, and a capped read.
import type { APIRoute } from "astro";
import dns from "node:dns/promises";

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_HOPS = 2;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fail = () => json({ success: 0 });

// Loopback, private, link-local, CGNAT, and the IPv6 equivalents.
function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    if (/^f[cd][0-9a-f]{2}:/.test(v)) return true;      // unique local
    if (/^fe[89ab][0-9a-f]:/.test(v)) return true;      // link local
    // IPv4-mapped (::ffff:a.b.c.d)
    const m = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return m ? isPrivateIp(m[1]) : false;
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  if (a === 0 || a === 127 || a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;    // CGNAT
  if (a >= 224) return true;                            // multicast + reserved
  return false;
}

async function resolvesToPublicHost(hostname: string): Promise<boolean> {
  // A bare IP literal never reaches DNS — check it directly.
  if (/^[\d.]+$/.test(hostname) || hostname.includes(":")) return !isPrivateIp(hostname);
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

function metaTag(html: string, prop: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]*>`,
    "i"
  );
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
  return decodeEntities(content || "").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

// Read at most MAX_BYTES so a hostile server can't stream us to death.
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
}

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get("url") || "";

  let current: URL;
  try {
    current = new URL(target);
  } catch {
    return fail();
  }
  if (current.protocol !== "http:" && current.protocol !== "https:") return fail();

  let res: Response | null = null;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!(await resolvesToPublicHost(current.hostname))) return fail();

    try {
      res = await fetch(current.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; blog-link-preview)", Accept: "text/html" },
      });
    } catch {
      return fail();
    }

    // Re-run the private-IP check on every redirect target.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc || hop === MAX_HOPS) return fail();
      try {
        current = new URL(loc, current);
      } catch {
        return fail();
      }
      if (current.protocol !== "http:" && current.protocol !== "https:") return fail();
      continue;
    }
    break;
  }

  if (!res || !res.ok) return fail();
  if (!(res.headers.get("content-type") || "").includes("text/html")) return fail();

  const html = await readCapped(res);
  const title =
    metaTag(html, "og:title") ||
    decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const description = metaTag(html, "og:description") || metaTag(html, "description");
  const image = metaTag(html, "og:image");
  const siteName = metaTag(html, "og:site_name");

  let imageUrl = "";
  if (image) {
    try {
      const abs = new URL(image, current);
      if (abs.protocol === "http:" || abs.protocol === "https:") imageUrl = abs.toString();
    } catch {}
  }

  // The shape @editorjs/link expects back.
  return json({
    success: 1,
    meta: {
      title: title.slice(0, 300),
      site_name: siteName.slice(0, 120) || current.hostname.replace(/^www\./, ""),
      description: description.slice(0, 600),
      ...(imageUrl ? { image: { url: imageUrl } } : {}),
    },
  });
};
