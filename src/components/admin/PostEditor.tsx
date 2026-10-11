// PostEditor.tsx — the post edit form, ported from admin.jsx.
import { useRef, useState } from "react";
import RichEditor, { type RichEditorHandle } from "./RichEditor";
import { emptyDoc } from "../../lib/blocks";
import type { EditorDoc } from "../../lib/blocks";

export interface EditorPost {
  slug: string;
  tag: string;
  date: string;
  featured: boolean;
  title: { vi: string; en: string };
  excerpt: { vi: string; en: string };
  body: { vi: EditorDoc; en: EditorDoc };
}

interface TagOpt {
  id: string;
  label: string;
}

export function blankPost(): EditorPost {
  return {
    slug: "",
    tag: "design",
    date: new Date().toISOString().slice(0, 10),
    featured: false,
    title: { vi: "", en: "" },
    excerpt: { vi: "", en: "" },
    body: { vi: emptyDoc(), en: emptyDoc() },
  };
}

export default function PostEditor({
  initial,
  tags,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: EditorPost;
  tags: TagOpt[];
  onSave: (p: EditorPost) => void;
  onCancel: () => void;
  onDelete: (slug: string) => void;
}) {
  const [d, setD] = useState<EditorPost>(() => JSON.parse(JSON.stringify(initial)));
  const [elang, setElang] = useState<"vi" | "en">("vi");
  const isNew = !initial.slug;

  const editorRef = useRef<RichEditorHandle>(null);

  const set = (patch: Partial<EditorPost>) => setD((p) => ({ ...p, ...patch }));
  const setField = (field: "title" | "excerpt", lang: "vi" | "en", v: string) =>
    setD((p) => ({ ...p, [field]: { ...p[field], [lang]: v } }));

  // The editor is uncontrolled: its document only reaches React state when we
  // pull it. Both callers below must do so before the content can be lost.
  const pull = async (): Promise<EditorDoc> =>
    (await editorRef.current?.save()) ?? d.body[elang];

  const switchLang = async (next: "vi" | "en") => {
    if (next === elang) return;
    const doc = await pull();
    setD((p) => ({ ...p, body: { ...p.body, [elang]: doc } }));
    setElang(next);
  };

  const save = async () => {
    const doc = await pull();
    const next: EditorPost = { ...d, body: { ...d.body, [elang]: doc } };
    const titleText = next.title.vi || next.title.en;
    if (!titleText.trim()) {
      alert("Bài viết cần ít nhất một tiêu đề (VI hoặc EN).");
      return;
    }
    onSave(next);
  };

  return (
    <div className="editor">
      <div className="editor-head">
        <h2>{isNew ? "Viết bài mới" : "Sửa bài"}</h2>
        <div className="editor-head-actions">
          <button className="btn-ghost" onClick={onCancel}>Huỷ</button>
          {!isNew && (
            <button className="btn-danger" onClick={() => onDelete(d.slug)}>Xoá bài</button>
          )}
          <button className="btn-solid" onClick={save}>Lưu bài</button>
        </div>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Tiêu đề · Tiếng Việt</span>
          <input
            value={d.title.vi}
            onChange={(e) => setField("title", "vi", e.target.value)}
            placeholder="Tiêu đề tiếng Việt"
          />
        </label>
        <label className="field">
          <span>Title · English</span>
          <input
            value={d.title.en}
            onChange={(e) => setField("title", "en", e.target.value)}
            placeholder="English title (optional)"
          />
        </label>
        <label className="field">
          <span>Tóm tắt · Tiếng Việt</span>
          <textarea
            rows={2}
            value={d.excerpt.vi}
            onChange={(e) => setField("excerpt", "vi", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Excerpt · English</span>
          <textarea
            rows={2}
            value={d.excerpt.en}
            onChange={(e) => setField("excerpt", "en", e.target.value)}
          />
        </label>
      </div>

      <div className="meta-row">
        <label className="field field--sm">
          <span>Chủ đề</span>
          <select value={d.tag} onChange={(e) => set({ tag: e.target.value })}>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="field field--sm">
          <span>Ngày đăng</span>
          <input type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label className="featured-toggle">
          <input
            type="checkbox"
            checked={!!d.featured}
            onChange={(e) => set({ featured: e.target.checked })}
          />
          <span>★ Bài nổi bật</span>
        </label>
      </div>

      <div className="content-bar">
        <span className="content-label">Nội dung bài viết</span>
        <div className="elang-tabs">
          <button className={elang === "vi" ? "is-on" : ""} onClick={() => switchLang("vi")}>
            Tiếng Việt
          </button>
          <button className={elang === "en" ? "is-on" : ""} onClick={() => switchLang("en")}>
            English
          </button>
        </div>
      </div>

      <RichEditor key={elang} ref={editorRef} initialData={d.body[elang] ?? emptyDoc()} />
    </div>
  );
}
