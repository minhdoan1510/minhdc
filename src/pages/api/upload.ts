// /api/upload — accept an image file, write it to public/uploads, return its URL.
// Auth-gated by middleware. The client resizes/compresses before uploading.
import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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

  const dir = path.resolve(process.cwd(), "public/uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, name), buf);

  return new Response(JSON.stringify({ url: `/uploads/${name}` }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
