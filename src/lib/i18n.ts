// i18n.ts — localization helpers ported from components.jsx, plus cookie-based
// language selection for SSR.
import type { Lang, Localized } from "./html";

export type { Lang } from "./html";

export const LANG_COOKIE = "blog.lang";
export const DEFAULT_LANG: Lang = "vi";

// Pick the active-language string from a {vi,en} object, with fallbacks.
export function L(obj: Localized | undefined, lang: Lang): string {
  if (!obj) return "";
  return obj[lang] || obj.vi || obj.en || "";
}

// All bilingual UI strings — ported verbatim from components.jsx.
export const UI = {
  blog: { vi: "Bài viết", en: "Writing" },
  about: { vi: "Giới thiệu", en: "About" },
  contact: { vi: "Liên hệ", en: "Contact" },
  recent: { vi: "Bài viết gần đây", en: "Recent writing" },
  allPosts: { vi: "Xem tất cả bài viết", en: "View all writing" },
  backHome: { vi: "Trang chủ", en: "Home" },
  backAll: { vi: "Tất cả bài viết", en: "All writing" },
  search: { vi: "Tìm bài viết…", en: "Search writing…" },
  filterAll: { vi: "Tất cả", en: "All" },
  noResults: { vi: "Không tìm thấy bài viết nào.", en: "No writing found." },
  minRead: { vi: "phút đọc", en: "min read" },
  newsletterTitle: { vi: "Nhận bài mới qua email", en: "Get new writing by email" },
  newsletterDesc: {
    vi: "Thư thưa thớt, không spam. Vài tuần một lần, khi có gì đáng đọc.",
    en: "Infrequent letters, no spam. Every few weeks, when there's something worth reading.",
  },
  emailPlaceholder: { vi: "địa chỉ email của bạn", en: "your email address" },
  subscribe: { vi: "Đăng ký", en: "Subscribe" },
  subscribed: { vi: "Đã đăng ký ✓", en: "Subscribed ✓" },
  writtenBy: { vi: "Viết bởi", en: "Written by" },
  elsewhere: { vi: "Ở nơi khác", en: "Elsewhere" },
  thanksReading: { vi: "Cảm ơn bạn đã đọc.", en: "Thanks for reading." },
  admin: { vi: "Quản trị", en: "Admin" },
  nextUp: { vi: "Bài tiếp theo", en: "Next up" },
} satisfies Record<string, Localized>;

const MONTHS = {
  vi: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

// Format an ISO date (YYYY-MM-DD) for display — ported from components.jsx.
export function fmtDate(iso: string, lang: Lang): string {
  const d = new Date(iso + "T00:00:00");
  const m = MONTHS[lang][d.getMonth()];
  return lang === "vi"
    ? `${d.getDate()} ${m} ${d.getFullYear()}`
    : `${m} ${d.getDate()}, ${d.getFullYear()}`;
}

export interface Tag {
  id: string;
  vi: string;
  en: string;
}

// Localized label for a tag id.
export function tagLabel(tags: Tag[], id: string, lang: Lang): string {
  const t = tags.find((x) => x.id === id);
  return t ? L(t, lang) : id;
}

// Read the active language from Astro's cookies, defaulting to Vietnamese.
export function getLang(cookies: { get(name: string): { value: string } | undefined }): Lang {
  const v = cookies.get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "vi";
}
