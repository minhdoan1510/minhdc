// auth.ts — minimal password gate for the admin area and mutating API routes.
// The prototype had no auth; a real backend exposes write endpoints, so we add
// a single-password session cookie. Set ADMIN_PASSWORD in .dev.vars locally
// and as a Worker secret in production (`wrangler secret put ADMIN_PASSWORD`).
import crypto from "node:crypto";
import { env } from "cloudflare:workers";

export const SESSION_COOKIE = "blog.admin";

// Unset means locked: no password matches and no cookie is valid, so a deploy
// that forgot the secret never ships with a guessable default.
function password(): string {
  return env.ADMIN_PASSWORD || "";
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
  if (!password()) return false;
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
  if (!v || !password()) return false;
  const a = Buffer.from(v);
  const b = Buffer.from(expectedToken());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
