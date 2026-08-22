// auth.ts — minimal password gate for the admin area and mutating API routes.
// The prototype had no auth; a real backend exposes write endpoints, so we add
// a single-password session cookie. Set ADMIN_PASSWORD in .env.
import crypto from "node:crypto";

export const SESSION_COOKIE = "blog.admin";

function password(): string {
  return process.env.ADMIN_PASSWORD || "changeme";
}

// Deterministic, non-secret-leaking token derived from the password. Rotating
// ADMIN_PASSWORD invalidates all existing sessions.
function expectedToken(): string {
  return crypto
    .createHash("sha256")
    .update("blog-admin::" + password())
    .digest("hex");
}

export function checkPassword(input: string): boolean {
  const a = Buffer.from(input || "");
  const b = Buffer.from(password());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function sessionToken(): string {
  return expectedToken();
}

export function isAuthed(cookies: {
  get(name: string): { value: string } | undefined;
}): boolean {
  const v = cookies.get(SESSION_COOKIE)?.value;
  if (!v) return false;
  const a = Buffer.from(v);
  const b = Buffer.from(expectedToken());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
