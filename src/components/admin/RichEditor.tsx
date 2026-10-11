// RichEditor.tsx — the Editor.js block editor behind the admin post form.
//
// Two things shape this file:
//
// 1. Editor.js is browser-only — its bundle dereferences `window` at module
//    scope — and AdminApp is a client:load island, so its whole module graph is
//    evaluated during SSR. Every @editorjs/* import therefore has to be a
//    dynamic import inside the effect; only `import type` may appear up top.
// 2. `editor.save()` is async, unlike the old contentEditable's synchronous
//    innerHTML. Rather than debouncing onChange (which races the VI/EN switch
//    and can write one language's blocks into the other), the parent pulls the
//    document through the ref at the two moments it matters: saving, and
//    switching language.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type EditorJS from "@editorjs/editorjs";
import { emptyDoc } from "../../lib/blocks";
import type { EditorDoc } from "../../lib/blocks";
import { resizeImage } from "./resizeImage";

export interface RichEditorHandle {
  save(): Promise<EditorDoc>;
}

// Reuse the existing image endpoint; Editor.js just wants a different envelope.
async function uploadImage(file: File) {
  const blob = await resizeImage(file);
  const fd = new FormData();
  fd.append("file", blob, file.name);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  const { url } = (await res.json()) as { url: string };
  return { success: 1, file: { url } };
}

const I18N = {
  messages: {
    ui: {
      blockTunes: { toggler: { "Click to tune": "Tuỳ chỉnh khối" } },
      inlineToolbar: { converter: { "Convert to": "Chuyển thành" } },
      toolbar: { toolbox: { Add: "Thêm khối" } },
      popover: { Filter: "Tìm khối", "Nothing found": "Không tìm thấy" },
    },
    toolNames: {
      Text: "Đoạn văn",
      Heading: "Tiêu đề",
      List: "Danh sách",
      "Unordered List": "Danh sách gạch đầu dòng",
      "Ordered List": "Danh sách đánh số",
      Checklist: "Danh sách kiểm",
      Quote: "Trích dẫn",
      Image: "Ảnh",
      Table: "Bảng",
      Code: "Khối mã",
      Delimiter: "Đường ngăn",
      Warning: "Lưu ý",
      Link: "Thẻ liên kết",
      "Raw HTML": "HTML thô",
      Attachment: "Tệp đính kèm",
      Personality: "Nhân vật",
      Bold: "In đậm",
      Italic: "In nghiêng",
      Underline: "Gạch chân",
      Marker: "Đánh dấu",
      InlineCode: "Mã nội dòng",
    },
    blockTunes: {
      delete: { Delete: "Xoá", "Click to delete": "Bấm để xoá" },
      moveUp: { "Move up": "Lên trên" },
      moveDown: { "Move down": "Xuống dưới" },
    },
  },
};

export default forwardRef<RichEditorHandle, { initialData: EditorDoc }>(
  function RichEditor({ initialData }, ref) {
    const holderRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorJS | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      let cancelled = false;

      (async () => {
        const [
          core, Paragraph, Header, List, Quote, ImageTool, SimpleImage, Embed,
          Table, CodeTool, Delimiter, Warning, LinkTool, RawTool, Attaches,
          Personality, Marker, InlineCode, Underline, TextVariantTune,
        ] = await Promise.all([
          import("@editorjs/editorjs"), import("@editorjs/paragraph"),
          import("@editorjs/header"), import("@editorjs/list"),
          import("@editorjs/quote"), import("@editorjs/image"),
          import("@editorjs/simple-image"), import("@editorjs/embed"),
          import("@editorjs/table"), import("@editorjs/code"),
          import("@editorjs/delimiter"), import("@editorjs/warning"),
          import("@editorjs/link"), import("@editorjs/raw"),
          import("@editorjs/attaches"), import("@editorjs/personality"),
          import("@editorjs/marker"), import("@editorjs/inline-code"),
          import("@editorjs/underline"), import("@editorjs/text-variant-tune"),
        ]);

        if (cancelled || !holderRef.current) return;

        const instance = new core.default({
          // Pass the element, not an id — the component remounts on every
          // VI/EN switch and duplicate ids would collide.
          holder: holderRef.current,
          data: initialData?.blocks?.length ? (initialData as any) : undefined,
          placeholder: "Bắt đầu viết…",
          minHeight: 160,
          i18n: I18N as any,
          tunes: ["textVariant"],
          tools: {
            paragraph: {
              class: Paragraph.default as any,
              inlineToolbar: true,
              config: { preserveBlank: false },
            },
            header: {
              class: Header.default as any,
              inlineToolbar: true,
              config: { levels: [2, 3, 4], defaultLevel: 2, placeholder: "Tiêu đề" },
            },
            list: {
              class: List.default as any,
              inlineToolbar: true,
              config: { defaultStyle: "unordered", maxLevel: 5 },
            },
            quote: {
              class: Quote.default as any,
              inlineToolbar: true,
              config: {
                quotePlaceholder: "Nội dung trích dẫn",
                captionPlaceholder: "Nguồn",
              },
            },
            image: {
              class: ImageTool.default as any,
              config: {
                // Required by the tool's types; unused because we supply an
                // uploader, which keeps the client-side resize step.
                endpoints: { byFile: "/api/upload", byUrl: "" },
                captionPlaceholder: "Chú thích ảnh (tuỳ chọn)",
                uploader: { uploadByFile: uploadImage },
              },
            },
            simpleImage: SimpleImage.default as any,
            embed: { class: Embed.default as any, inlineToolbar: false },
            table: {
              class: Table.default as any,
              inlineToolbar: true,
              config: { rows: 2, cols: 2, withHeadings: true },
            },
            code: CodeTool.default as any,
            delimiter: Delimiter.default as any,
            warning: {
              class: Warning.default as any,
              inlineToolbar: true,
              config: { titlePlaceholder: "Tiêu đề", messagePlaceholder: "Nội dung" },
            },
            linkTool: {
              class: LinkTool.default as any,
              config: { endpoint: "/api/link-preview" },
            },
            raw: RawTool.default as any,
            attaches: {
              class: Attaches.default as any,
              config: {
                endpoint: "/api/upload/file",
                buttonText: "Chọn tệp để đính kèm",
                errorMessage: "Không tải được tệp này.",
              },
            },
            personality: {
              class: Personality.default as any,
              config: {
                endpoint: "/api/upload",
                namePlaceholder: "Tên",
                descriptionPlaceholder: "Mô tả",
                linkPlaceholder: "Liên kết",
              },
            },
            marker: Marker.default as any,
            inlineCode: InlineCode.default as any,
            underline: Underline.default as any,
            textVariant: TextVariantTune.default as any,
          },
        });

        await instance.isReady;
        // The effect can be torn down while the imports or isReady are still in
        // flight; without this the instance would linger on a detached node.
        if (cancelled) {
          instance.destroy();
          return;
        }
        editorRef.current = instance;
        setReady(true);
      })().catch((err) => console.error("[RichEditor] init failed", err));

      return () => {
        cancelled = true;
        const ed = editorRef.current;
        editorRef.current = null;
        ed?.destroy();
      };
      // Mount-once: switching language remounts the component via its key.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        async save() {
          const ed = editorRef.current;
          // Not ready yet means nothing was edited — keep what we were given.
          if (!ed) return initialData ?? emptyDoc();
          return (await ed.save()) as EditorDoc;
        },
      }),
      [initialData]
    );

    return (
      <div className="rich">
        {!ready && <div className="rich-loading">Đang tải trình soạn thảo…</div>}
        {/* React must never render children into the holder — Editor.js owns it. */}
        <div ref={holderRef} className="ejs-holder" />
      </div>
    );
  }
);
