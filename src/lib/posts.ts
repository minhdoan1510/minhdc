// posts.ts — post CRUD over SQLite, returning a clean app-level Post shape.
import { getDb, seedDatabase } from "./db";
import { estMins, slugify, uniqueSlug } from "./html";
import type { Localized } from "./html";

export interface Post {
  slug: string;
  tag: string;
  date: string;
  readMins: number;
  featured: boolean;
  title: Localized;
  excerpt: Localized;
  bodyHtml: Localized;
}

interface Row {
  slug: string;
  tag: string;
  date: string;
  read_mins: number;
  featured: number;
  title_vi: string;
  title_en: string;
  excerpt_vi: string;
  excerpt_en: string;
  body_html_vi: string;
  body_html_en: string;
}

function rowToPost(r: Row): Post {
  return {
    slug: r.slug,
    tag: r.tag,
    date: r.date,
    readMins: r.read_mins,
    featured: !!r.featured,
    title: { vi: r.title_vi, en: r.title_en },
    excerpt: { vi: r.excerpt_vi, en: r.excerpt_en },
    bodyHtml: { vi: r.body_html_vi, en: r.body_html_en },
  };
}

// All posts, newest first.
export function loadPosts(): Post[] {
  const rows = getDb()
    .prepare("SELECT * FROM posts ORDER BY date DESC, slug ASC")
    .all() as Row[];
  return rows.map(rowToPost);
}

export function getPost(slug: string): Post | null {
  const r = getDb().prepare("SELECT * FROM posts WHERE slug = ?").get(slug) as
    | Row
    | undefined;
  return r ? rowToPost(r) : null;
}

// Shape accepted from the admin editor when saving.
export interface PostInput {
  slug?: string;
  tag: string;
  date: string;
  featured?: boolean;
  title: Localized;
  excerpt: Localized;
  bodyHtml: Localized;
}

// Create or update a post. New posts derive a unique slug from the title;
// existing posts keep their slug. Read time is always recomputed.
export function upsertPost(input: PostInput): Post {
  const db = getDb();
  const existingSlugs = (
    db.prepare("SELECT slug FROM posts").all() as { slug: string }[]
  ).map((x) => x.slug);

  const isNew = !input.slug;
  const titleText = input.title.vi || input.title.en || "";
  const base = isNew ? slugify(titleText) : input.slug!;
  const slug = uniqueSlug(base, existingSlugs, isNew ? undefined : input.slug);

  const readMins = estMins(input.bodyHtml);

  db.prepare(
    `INSERT INTO posts
       (slug, tag, date, read_mins, featured,
        title_vi, title_en, excerpt_vi, excerpt_en, body_html_vi, body_html_en)
     VALUES
       (@slug, @tag, @date, @read_mins, @featured,
        @title_vi, @title_en, @excerpt_vi, @excerpt_en, @body_html_vi, @body_html_en)
     ON CONFLICT(slug) DO UPDATE SET
        tag=@tag, date=@date, read_mins=@read_mins, featured=@featured,
        title_vi=@title_vi, title_en=@title_en,
        excerpt_vi=@excerpt_vi, excerpt_en=@excerpt_en,
        body_html_vi=@body_html_vi, body_html_en=@body_html_en`
  ).run({
    slug,
    tag: input.tag,
    date: input.date,
    read_mins: readMins,
    featured: input.featured ? 1 : 0,
    title_vi: input.title.vi || "",
    title_en: input.title.en || "",
    excerpt_vi: input.excerpt.vi || "",
    excerpt_en: input.excerpt.en || "",
    body_html_vi: input.bodyHtml.vi || "",
    body_html_en: input.bodyHtml.en || "",
  });

  return getPost(slug)!;
}

export function removePost(slug: string): void {
  getDb().prepare("DELETE FROM posts WHERE slug = ?").run(slug);
}

// Wipe all posts and re-seed from the bundled content.
export function resetPosts(): Post[] {
  const db = getDb();
  db.prepare("DELETE FROM posts").run();
  seedDatabase(db);
  return loadPosts();
}

// Newsletter subscriber capture.
export function addSubscriber(email: string): void {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)"
    )
    .run(email, new Date().toISOString());
}
