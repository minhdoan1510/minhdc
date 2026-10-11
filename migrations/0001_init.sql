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
  body_vi      TEXT NOT NULL DEFAULT '{"blocks":[]}',
  body_en      TEXT NOT NULL DEFAULT '{"blocks":[]}'
);

CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
