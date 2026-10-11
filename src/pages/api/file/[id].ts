// /api/file/[id] — serve an attachment uploaded through /api/upload/file.
//
// Always as an opaque download: octet-stream + Content-Disposition: attachment,
// so nothing uploaded here can ever be rendered as a document on this origin.
// Public (readers need to download attachments); the id is an unguessable UUID.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id || "";
  // Reject anything that isn't a bare UUID — no key games reach R2.
  if (!UUID.test(id)) return new Response("not found", { status: 404 });

  const obj = await env.FILES.get(`files/${id}`);
  if (!obj) return new Response("not found", { status: 404 });

  // Strip quotes/newlines out of the header value; keep a UTF-8 copy for
  // clients that understand RFC 5987.
  const raw = (obj.customMetadata?.name || "file").replace(/[\r\n"\\]/g, "_");
  const ascii = raw.replace(/[^\x20-\x7e]/g, "_");

  return new Response(obj.body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(raw)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
