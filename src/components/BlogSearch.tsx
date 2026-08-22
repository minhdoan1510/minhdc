// BlogSearch.tsx — client search + tag filter island for the blog index.
// Receives posts already localized to the active language as props.
import { useMemo, useState } from "react";

export interface SearchPost {
  slug: string;
  date: string;
  dateFmt: string;
  tag: string;
  tagLabel: string;
  title: string;
  excerpt: string;
  readMins: number;
}

interface TagOpt {
  id: string;
  label: string;
}

interface Strings {
  title: string;
  search: string;
  filterAll: string;
  noResults: string;
  minRead: string;
}

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function BlogSearch({
  posts,
  tags,
  strings,
}: {
  posts: SearchPost[];
  tags: TagOpt[];
  strings: Strings;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchTag = active === "all" || p.tag === active;
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tagLabel.toLowerCase().includes(q);
      return matchTag && matchQ;
    });
  }, [posts, query, active]);

  return (
    <>
      <section className="blog-head">
        <h1 className="page-title">{strings.title}</h1>
        <div className="search">
          <SearchIcon />
          <input
            className="search-input"
            placeholder={strings.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      <div className="filters">
        <button
          className={"filter" + (active === "all" ? " is-on" : "")}
          onClick={() => setActive("all")}
        >
          {strings.filterAll}
        </button>
        {tags.map((t) => (
          <button
            key={t.id}
            className={"filter" + (active === t.id ? " is-on" : "")}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="post-list">
        {filtered.length === 0 ? (
          <p className="empty">{strings.noResults}</p>
        ) : (
          filtered.map((p, i) => (
            <a
              key={p.slug}
              className="post-row"
              href={`/blog/${p.slug}`}
              style={{ ["--row-i" as any]: i }}
            >
              <div className="post-row-meta">
                <time dateTime={p.date}>{p.dateFmt}</time>
                <span className="post-row-tag">{p.tagLabel}</span>
              </div>
              <div className="post-row-main">
                <h3 className="post-row-title">{p.title}</h3>
                <p className="post-row-excerpt">{p.excerpt}</p>
                <div className="post-row-read">
                  {p.readMins} {strings.minRead}
                  <Arrow />
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </>
  );
}
