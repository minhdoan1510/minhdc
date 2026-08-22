// /api/posts/[slug] — DELETE a post (auth-gated by middleware).
import type { APIRoute } from "astro";
import { removePost, getPost } from "../../../lib/posts";

export const DELETE: APIRoute = ({ params }) => {
  const slug = params.slug!;
  if (!getPost(slug)) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  removePost(slug);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
