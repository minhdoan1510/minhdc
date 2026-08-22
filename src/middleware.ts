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

  // Mutating post/upload APIs require auth. Subscribe + logout are exempt.
  const guardedApi =
    pathname.startsWith("/api/posts") || pathname === "/api/upload";
  if (guardedApi && MUTATING.has(method) && !isAuthed(context.cookies)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return next();
});
