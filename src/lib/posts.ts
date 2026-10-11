// posts.ts — post CRUD over D1, returning a clean app-level Post shape.
import { getDb, seedDatabase } from "./db";
import { emptyDoc, estMins, parseDoc } from "./blocks";
import type { EditorDoc } from "./blocks";
import { slugify, uniqueSlug } from "./html";
import type { Localized } from "./html";

// A post body is one Editor.js document per language.
export interface LocalizedDoc {
  vi: EditorDoc;
  en: EditorDoc;
}

export interface Post {
  slug: string;
  tag: string;
  date: string;
  readMins: number;
  featured: boolean;
  title: Localized;
  excerpt: Localized;
  body: LocalizedDoc;
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
  body_vi: string;
  body_en: string;
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
    body: { vi: parseDoc(r.body_vi), en: parseDoc(r.body_en) },
  };
}

// All posts, newest first.
export async function loadPosts(): Promise<Post[]> {
  const { results } = await (await getDb())
    .prepare("SELECT * FROM posts ORDER BY date DESC, slug ASC")
    .all<Row>();
  return results.map(rowToPost);
}

export async function getPost(slug: string): Promise<Post | null> {
  const r = await (await getDb())
    .prepare("SELECT * FROM posts WHERE slug = ?")
    .bind(slug)
    .first<Row>();
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
  body: LocalizedDoc;
}

// Create or update a post. New posts derive a unique slug from the title;
// existing posts keep their slug. Read time is always recomputed.
export async function upsertPost(input: PostInput): Promise<Post> {
  const db = await getDb();
  const { results } = await db.prepare("SELECT slug FROM posts").all<{ slug: string }>();
  const existingSlugs = results.map((x) => x.slug);

  const isNew = !input.slug;
  const titleText = input.title.vi || input.title.en || "";
  const base = isNew ? slugify(titleText) : input.slug!;
  const slug = uniqueSlug(base, existingSlugs, isNew ? undefined : input.slug);

  const readMins = estMins(input.body);

  await db.prepare(
    `INSERT INTO posts
       (slug, tag, date, read_mins, featured,
        title_vi, title_en, excerpt_vi, excerpt_en, body_vi, body_en)
     VALUES
       (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
     ON CONFLICT(slug) DO UPDATE SET
        tag=?2, date=?3, read_mins=?4, featured=?5,
        title_vi=?6, title_en=?7, excerpt_vi=?8, excerpt_en=?9,
        body_vi=?10, body_en=?11`
  )
    .bind(
      slug,
      input.tag,
      input.date,
      readMins,
      input.featured ? 1 : 0,
      input.title.vi || "",
      input.title.en || "",
      input.excerpt.vi || "",
      input.excerpt.en || "",
      JSON.stringify(input.body?.vi ?? emptyDoc()),
      JSON.stringify(input.body?.en ?? emptyDoc())
    )
    .run();

  return (await getPost(slug))!;
}

export async function removePost(slug: string): Promise<void> {
  await (await getDb()).prepare("DELETE FROM posts WHERE slug = ?").bind(slug).run();
}

// Wipe all posts and re-seed from the bundled content.
export async function resetPosts(): Promise<Post[]> {
  const db = await getDb();
  await db.prepare("DELETE FROM posts").run();
  await seedDatabase(db);
  return loadPosts();
}

// Newsletter subscriber capture.
export async function addSubscriber(email: string): Promise<void> {
  await (await getDb())
    .prepare(
      "INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)"
    )
    .bind(email, new Date().toISOString())
    .run();
}
