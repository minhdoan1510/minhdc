// /api/subscribe — newsletter signup (public). Stores the email.
import type { APIRoute } from "astro";
import { addSubscriber } from "../../lib/posts";

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }
  const email = (body?.email || "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "invalid email" }), { status: 400 });
  }
  await addSubscriber(email);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
