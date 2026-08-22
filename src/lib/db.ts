// db.ts — file-based SQLite connection, schema, and first-run seeding.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { posts as seedPosts, profile, tags } from "../content/seed";
import { blocksToHtml } from "./html";

const DB_PATH = process.env.DATABASE_PATH || "data/blog.db";

let db: Database.Database | null = null;

// Lazily open (and on first call, create + seed) the database.
export function getDb(): Database.Database {
  if (db) return db;

  const abs = path.resolve(process.cwd(), DB_PATH);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  db = new Database(abs);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      slug         TEXT PRIMARY KEY,
      tag          TEXT NOT NULL,
      date         TEXT NOT NULL,
      read_mins    INTEGER NOT NULL DEFAULT 1,
      featured     INTEGER NOT NULL DEFAULT 0,
      title_vi     TEXT NOT NULL DEFAULT '',
      title_en     TEXT NOT NULL DEFAULT '',
      excerpt_vi   TEXT NOT NULL DEFAULT '',
      excerpt_en   TEXT NOT NULL DEFAULT '',
      body_html_vi TEXT NOT NULL DEFAULT '',
      body_html_en TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      email      TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );
  `);

  const count = db.prepare("SELECT COUNT(*) AS n FROM posts").get() as {
    n: number;
  };
  if (count.n === 0) seedDatabase(db);

  return db;
}

// Insert the prototype seed content (migrating legacy block bodies → HTML).
// Exported so the admin "reset" action can re-seed after wiping.
export function seedDatabase(database: Database.Database) {
  const insert = database.prepare(`
    INSERT INTO posts
      (slug, tag, date, read_mins, featured,
       title_vi, title_en, excerpt_vi, excerpt_en, body_html_vi, body_html_en)
    VALUES
      (@slug, @tag, @date, @read_mins, @featured,
       @title_vi, @title_en, @excerpt_vi, @excerpt_en, @body_html_vi, @body_html_en)
  `);

  const seedAll = database.transaction(() => {
    for (const p of seedPosts) {
      insert.run({
        slug: p.slug,
        tag: p.tag,
        date: p.date,
        read_mins: p.readMins,
        featured: p.featured ? 1 : 0,
        title_vi: p.title.vi || "",
        title_en: p.title.en || "",
        excerpt_vi: p.excerpt.vi || "",
        excerpt_en: p.excerpt.en || "",
        // migrate legacy block bodies → HTML, the stored source of truth
        body_html_vi: blocksToHtml(p.body, "vi"),
        body_html_en: blocksToHtml(p.body, "en"),
      });
    }
  });
  seedAll();
}

// Re-export the site profile and tags (static config, not stored in the DB).
export { profile, tags };
