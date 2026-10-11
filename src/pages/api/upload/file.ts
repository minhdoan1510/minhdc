// /api/upload/file — attachment upload for the Editor.js "attaches" tool.
// Auth-gated by middleware.
//
// Unlike /api/upload (images), these files are never served inline. An
// arbitrary upload served from the site origin is stored XSS — one .html or
// .svg would run script alongside the admin session. Bytes land in R2 under
// files/ and only ever come back out through /api/file/[id], which forces a
// download.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const MAX_BYTES = 25 * 1024 * 1024;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return json({ success: 0, error: "no file" }, 400);
  if (file.size > MAX_BYTES) return json({ success: 0, error: "file too large" }, 413);

  const id = crypto.randomUUID();
  const name = file.name || "file";
  const extension = (name.includes(".") ? name.split(".").pop()! : "").slice(0, 12);

  await env.FILES.put(`files/${id}`, await file.arrayBuffer(), {
    customMetadata: { name },
  });

  // The shape @editorjs/attaches expects back.
  return json({
    success: 1,
    file: { url: `/api/file/${id}`, name, size: file.size, extension },
  });
};
