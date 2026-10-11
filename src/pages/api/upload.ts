// /api/upload — accept an image file, store it in R2, return its URL
// (served by src/pages/uploads/[name].ts).
// Auth-gated by middleware. The client resizes/compresses before uploading.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "no file" }), { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return new Response(JSON.stringify({ error: "unsupported type" }), {
      status: 400,
    });
  }
  if (file.size > 8 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: "file too large" }), {
      status: 413,
    });
  }

  const name = `${crypto.randomUUID()}.${ext}`;
  await env.FILES.put(`uploads/${name}`, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return new Response(JSON.stringify({ url: `/uploads/${name}` }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
