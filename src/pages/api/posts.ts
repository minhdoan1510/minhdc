// /api/posts — GET list (public), POST upsert-or-reset (auth-gated by middleware).
import type { APIRoute } from "astro";
import { loadPosts, upsertPost, resetPosts } from "../../lib/posts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const GET: APIRoute = () => json(loadPosts());

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  if (body?.action === "reset") {
    return json(resetPosts());
  }

  if (!body?.title || (!body.title.vi && !body.title.en)) {
    return json({ error: "title required (vi or en)" }, 400);
  }

  const post = upsertPost({
    slug: body.slug || undefined,
    tag: body.tag || "design",
    date: body.date || new Date().toISOString().slice(0, 10),
    featured: !!body.featured,
    title: { vi: body.title.vi || "", en: body.title.en || "" },
    excerpt: {
      vi: body.excerpt?.vi || "",
      en: body.excerpt?.en || "",
    },
    bodyHtml: {
      vi: body.bodyHtml?.vi || "",
      en: body.bodyHtml?.en || "",
    },
  });

  return json(post);
};
