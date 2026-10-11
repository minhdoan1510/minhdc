// db.ts — Cloudflare D1 connection and first-run seeding.
// Schema lives in migrations/ (applied with `wrangler d1 migrations apply`).
import { env } from "cloudflare:workers";
import { posts as seedPosts, profile, tags } from "../content/seed";
import { seedBlocksToDoc } from "./blocks";

let seeded = false;

// The D1 binding; on the first call per isolate, seed an empty posts table.
export async function getDb(): Promise<D1Database> {
  const db = env.DB;
  if (seeded) return db;
  const count = await db.prepare("SELECT COUNT(*) AS n FROM posts").first<number>("n");
  if (!count) await seedDatabase(db);
  seeded = true;
  return db;
}

// Insert the prototype seed content.
// Exported so the admin "reset" action can re-seed after wiping.
export async function seedDatabase(db: D1Database) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO posts
      (slug, tag, date, read_mins, featured,
       title_vi, title_en, excerpt_vi, excerpt_en, body_vi, body_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // batch() runs as a single transaction
  await db.batch(
    seedPosts.map((p) =>
      insert.bind(
        p.slug,
        p.tag,
        p.date,
        p.readMins,
        p.featured ? 1 : 0,
        p.title.vi || "",
        p.title.en || "",
        p.excerpt.vi || "",
        p.excerpt.en || "",
        // lift the compact seed block array into Editor.js documents, which
        // are the stored source of truth
        JSON.stringify(seedBlocksToDoc(p.body, "vi")),
        JSON.stringify(seedBlocksToDoc(p.body, "en"))
      )
    )
  );
}

// Re-export the site profile and tags (static config, not stored in the DB).
export { profile, tags };
