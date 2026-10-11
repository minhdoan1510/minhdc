// middleware.ts — gate the admin UI and all mutating API routes behind the
// admin session cookie. Public reads (GET) and the newsletter stay open.
import { defineMiddleware } from "astro:middleware";
import { isAuthed } from "./lib/auth";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const method = context.request.method.toUpperCase();

  // Admin pages: redirect to login unless authed (login page itself is open).
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAuthed(context.cookies)) {
      return context.redirect("/admin/login");
    }
  }

  const unauthorized = () =>
    new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  // Mutating post/upload APIs require auth. Subscribe + logout are exempt, and
  // /api/file/[id] stays public so readers can download attachments.
  const guardedApi =
    pathname.startsWith("/api/posts") || pathname.startsWith("/api/upload");
  if (guardedApi && MUTATING.has(method) && !isAuthed(context.cookies)) {
    return unauthorized();
  }

  // The link preview endpoint makes the server fetch a client-supplied URL, so
  // it is admin-only for every method — it is a GET, which the check above
  // deliberately ignores. Left open it would be a public SSRF proxy.
  if (pathname === "/api/link-preview" && !isAuthed(context.cookies)) {
    return unauthorized();
  }

  return next();
});
