// AdminApp.tsx — admin post manager island. List + create/edit/delete, all
// persisted server-side via the /api/posts endpoints. Ported from admin.jsx.
import { useState } from "react";
import { fmtDate } from "../../lib/i18n";
import type { EditorDoc } from "../../lib/blocks";
import PostEditor, { blankPost, type EditorPost } from "./PostEditor";

export interface ApiPost {
  slug: string;
  tag: string;
  date: string;
  readMins: number;
  featured: boolean;
  title: { vi: string; en: string };
  excerpt: { vi: string; en: string };
  body: { vi: EditorDoc; en: EditorDoc };
}

interface TagOpt {
  id: string;
  label: string;
}

const text = (o: { vi: string; en: string }) => o.vi || o.en || "(không tiêu đề)";

export default function AdminApp({
  initialPosts,
  tags,
}: {
  initialPosts: ApiPost[];
  tags: TagOpt[];
}) {
  const [posts, setPosts] = useState<ApiPost[]>(initialPosts);
  const [editing, setEditing] = useState<EditorPost | null>(null);
  const [saving, setSaving] = useState(false);

  const tagLabelOf = (id: string) => tags.find((t) => t.id === id)?.label || id;

  const refresh = async () => {
    const res = await fetch("/api/posts");
    if (res.ok) setPosts(await res.json());
  };

  const save = async (p: EditorPost) => {
    setSaving(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: p.slug || undefined,
          tag: p.tag,
          date: p.date,
          featured: p.featured,
          title: p.title,
          excerpt: p.excerpt,
          body: p.body,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert("Không lưu được bài viết. " + (err?.error || ""));
        return;
      }
      await refresh();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slug: string) => {
    if (!confirm("Xoá bài viết này?")) return;
    const res = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Không xoá được bài viết.");
      return;
    }
    await refresh();
    setEditing(null);
  };

  const resetAll = async () => {
    if (!confirm("Khôi phục về bộ bài viết mẫu ban đầu? Mọi thay đổi sẽ mất.")) return;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (res.ok) setPosts(await res.json());
  };

  const editPost = (p: ApiPost) =>
    setEditing(JSON.parse(JSON.stringify(p)) as EditorPost);

  if (editing) {
    return (
      <main className="page admin">
        <PostEditor
          initial={editing}
          tags={tags}
          onSave={save}
          onCancel={() => setEditing(null)}
          onDelete={remove}
        />
        {saving && <p style={{ color: "var(--faint)", fontSize: 13 }}>Đang lưu…</p>}
      </main>
    );
  }

  return (
    <main className="page admin">
      <div className="admin-head">
        <div>
          <span className="kicker">Quản trị</span>
          <h1 className="page-title">Bài viết</h1>
        </div>
        <div className="admin-head-actions">
          <a className="btn-ghost" href="/blog" data-astro-reload>← Xem blog</a>
          <button className="btn-solid" onClick={() => setEditing(blankPost())}>+ Bài mới</button>
        </div>
      </div>

      <div className="admin-list">
        {posts.map((p) => (
          <div className="admin-row" key={p.slug}>
            <button className="admin-row-main" onClick={() => editPost(p)}>
              <div className="admin-row-title">
                {p.featured && <span className="star">★</span>}
                {text(p.title)}
              </div>
              <div className="admin-row-meta">
                <span>{fmtDate(p.date, "vi")}</span>
                <span className="dot-sep">·</span>
                <span>{tagLabelOf(p.tag)}</span>
                <span className="dot-sep">·</span>
                <span>{p.readMins} phút</span>
              </div>
            </button>
            <div className="admin-row-actions">
              <button onClick={() => editPost(p)}>Sửa</button>
              <button className="link-danger" onClick={() => remove(p.slug)}>Xoá</button>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-foot">
        <span>{posts.length} bài · lưu trên máy chủ</span>
        <span style={{ display: "inline-flex", gap: 16, alignItems: "center" }}>
          <button className="link-reset" onClick={resetAll}>Khôi phục bài mẫu</button>
          <form method="POST" action="/api/logout" style={{ margin: 0 }}>
            <button className="link-reset" type="submit">Đăng xuất</button>
          </form>
        </span>
      </div>
    </main>
  );
}
