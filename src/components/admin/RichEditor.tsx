// RichEditor.tsx — contentEditable rich-text editor, ported from the prototype's
// admin.jsx. Images are resized client-side then uploaded to /api/upload (the
// server stores them on disk and returns a URL).
import { useEffect, useRef, useState } from "react";
import { ytId } from "../../lib/html";

// Resize + compress an image file → a Blob (keeps uploads small).
function resizeImage(file: File, maxW = 1400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const isPng = /png/i.test(file.type);
        c.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
          isPng ? "image/png" : "image/jpeg",
          0.82
        );
      };
      img.onerror = reject;
      img.src = fr.result as string;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export default function RichEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // Seed once on mount (component is keyed by language → remounts on switch).
  useEffect(() => {
    const el = ref.current!;
    el.innerHTML = initialHtml || "";
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current!.innerHTML);
  const focusBack = () => ref.current && ref.current.focus();

  const fmt = (block: string) => {
    focusBack();
    document.execCommand("formatBlock", false, block);
    emit();
  };
  const bold = () => {
    focusBack();
    document.execCommand("bold");
    emit();
  };

  const addLink = () => {
    focusBack();
    const sel = window.getSelection();
    const hadText = sel && sel.toString().trim();
    const url = prompt("Dán đường link (URL):", "https://");
    if (!url) return;
    focusBack();
    if (hadText) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand("insertHTML", false, `<a href="${url}">${url}</a>`);
    }
    ref.current!.querySelectorAll("a").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    });
    emit();
  };

  const addVideo = () => {
    focusBack();
    const url = prompt("Dán link YouTube:", "");
    if (!url) return;
    const id = ytId(url);
    if (!id) {
      alert(
        "Không nhận ra link YouTube. Hãy dán link dạng youtube.com/watch?v=… hoặc youtu.be/…"
      );
      return;
    }
    focusBack();
    document.execCommand(
      "insertHTML",
      false,
      `<figure contenteditable="false" class="embed"><div class="yt"><iframe src="https://www.youtube.com/embed/${id}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></figure><p><br></p>`
    );
    emit();
  };

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      const fd = new FormData();
      fd.append("file", blob, file.name);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const { url } = await res.json();
      focusBack();
      document.execCommand(
        "insertHTML",
        false,
        `<figure contenteditable="false"><img src="${url}" alt=""></figure><p><br></p>`
      );
      emit();
    } catch {
      alert("Không tải được ảnh này.");
    }
    setBusy(false);
  };

  return (
    <div className="rich">
      <div className="rich-toolbar" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" onClick={() => fmt("p")} title="Đoạn văn">¶</button>
        <button type="button" onClick={() => fmt("h2")} title="Tiêu đề phụ"><strong>H</strong></button>
        <button type="button" onClick={() => fmt("blockquote")} title="Trích dẫn">❝</button>
        <button type="button" onClick={bold} title="In đậm"><strong>B</strong></button>
        <button type="button" onClick={addLink} title="Chèn link">🔗</button>
        <span className="rich-sep" />
        <button
          type="button"
          className="rich-img-btn"
          onClick={() => fileRef.current!.click()}
          title="Chèn ảnh"
        >
          {busy ? "Đang xử lý…" : "🖼 Ảnh"}
        </button>
        <button type="button" className="rich-img-btn" onClick={addVideo} title="Nhúng video YouTube">
          ▶ YouTube
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
      </div>
      <div
        ref={ref}
        className="rich-area"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder="Bắt đầu viết… Bôi đen một dòng rồi bấm H để biến thành tiêu đề, hoặc ❝ để thành trích dẫn."
      />
    </div>
  );
}
