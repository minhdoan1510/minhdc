// /api/logout — clear the admin session and return to the home page.
import type { APIRoute } from "astro";
import { SESSION_COOKIE } from "../../lib/auth";

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return redirect("/");
};

export const GET: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return redirect("/");
};
