// /uploads/[name] — serve an image uploaded through /api/upload, from R2.
// Only the image types /api/upload accepts are ever stored here.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i;

export const GET: APIRoute = async ({ params }) => {
  const name = params.name || "";
  if (!NAME.test(name)) return new Response("not found", { status: 404 });

  const obj = await env.FILES.get(`uploads/${name}`);
  if (!obj) return new Response("not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
