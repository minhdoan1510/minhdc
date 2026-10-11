// seed.ts — bilingual seed content, ported verbatim from the prototype's data.js.
// Used to seed the SQLite database on first run.
import type { SeedBlock } from "../lib/blocks";
import type { Localized } from "../lib/html";
import type { Tag } from "../lib/i18n";

export interface Social {
  label: string;
  handle: string;
  url: string;
}

export interface Profile {
  name: string;
  role: Localized;
  location: Localized;
  bio: Localized;
  email: string;
  socials: Social[];
}

export interface SeedPost {
  slug: string;
  tag: string;
  date: string;
  readMins: number;
  featured: boolean;
  title: Localized;
  excerpt: Localized;
  body: SeedBlock[];
}

export const profile: Profile = {
  name: "Minh Doan",
  role: { vi: "Nhà thiết kế · Người viết", en: "Designer · Writer" },
  location: { vi: "Hà Nội, Việt Nam", en: "Hanoi, Vietnam" },
  bio: {
    vi: "Tôi viết về thiết kế, công nghệ và cách chúng định hình đời sống thường nhật. Một nơi yên tĩnh để nghĩ chậm lại.",
    en: "I write about design, technology, and the quiet ways they shape everyday life. A slow place to think out loud.",
  },
  email: "doancongminh1510@gmail.com",
  socials: [
    { label: "Twitter", handle: "@minhdoan1510", url: "https://twitter.com/minhdoan1510" },
    { label: "GitHub", handle: "minhdoan1510", url: "https://github.com/minhdoan1510" },
    { label: "Read.cv", handle: "minhdoan1510", url: "https://read.cv/minhdoan1510" },
  ],
};

// tag keys are stable ids; labels are localized
export const tags: Tag[] = [
  { id: "design", vi: "Thiết kế", en: "Design" },
  { id: "code", vi: "Lập trình", en: "Code" },
  { id: "writing", vi: "Viết lách", en: "Writing" },
  { id: "life", vi: "Đời sống", en: "Life" },
  { id: "notes", vi: "Ghi chú", en: "Notes" },
];

const P = (vi: string, en: string): SeedBlock => ({ type: "p", vi, en });
const H = (vi: string, en: string): SeedBlock => ({ type: "h2", vi, en });
const Q = (vi: string, en: string): SeedBlock => ({ type: "quote", vi, en });

export const posts: SeedPost[] = [
  {
    slug: "khoang-trang",
    tag: "design",
    date: "2026-05-28",
    readMins: 6,
    featured: true,
    title: {
      vi: "Khoảng trắng không phải là chỗ trống",
      en: "White space is not empty space",
    },
    excerpt: {
      vi: "Vì sao những thiết kế tối giản nhất lại thường mất nhiều công sức nhất để làm cho đúng.",
      en: "Why the most minimal designs are often the ones that take the most work to get right.",
    },
    body: [
      P(
        "Có một hiểu lầm phổ biến rằng tối giản nghĩa là làm ít đi. Thực ra, khoảng trắng là một quyết định — mỗi centimet để trống đều là một lựa chọn có chủ đích về điều gì xứng đáng được chú ý.",
        "There's a common misconception that minimalism means doing less. In truth, white space is a decision — every empty centimeter is a deliberate choice about what deserves attention."
      ),
      P(
        "Khi bạn gỡ bỏ một yếu tố, bạn không chỉ xóa nó đi. Bạn đang trao thêm sức nặng cho những gì còn lại. Đó là lý do một trang chỉ có một dòng chữ và rất nhiều khoảng trống lại có thể vang vọng mạnh hơn cả một trang chật kín thông tin.",
        "When you remove an element, you're not just deleting it. You're lending weight to what remains. That's why a page with a single line of text and lots of room can resonate louder than one packed with information."
      ),
      H("Nhịp điệu của sự im lặng", "The rhythm of silence"),
      P(
        "Trong âm nhạc, những khoảng lặng giữa các nốt cũng quan trọng như chính các nốt. Thiết kế cũng vậy. Khoảng trắng tạo ra nhịp — nó cho mắt người đọc chỗ để nghỉ, để thở, để chuẩn bị cho điều tiếp theo.",
        "In music, the silences between notes matter as much as the notes themselves. Design is no different. White space creates rhythm — it gives the reader's eye a place to rest, to breathe, to prepare for what comes next."
      ),
      Q("Sự đơn giản là độ tinh tế tối thượng.", "Simplicity is the ultimate sophistication."),
      P(
        "Lần tới khi bạn nhìn vào một thiết kế và nghĩ 'có vẻ trống trải quá', hãy thử hỏi: liệu nó có đang cho tôi không gian để suy nghĩ không? Đôi khi điều quý giá nhất một trang giấy có thể trao cho bạn chính là sự yên tĩnh.",
        "Next time you look at a design and think 'this feels too empty,' try asking: is it giving me room to think? Sometimes the most valuable thing a page can offer you is quiet."
      ),
    ],
  },
  {
    slug: "code-nhu-van-xuoi",
    tag: "code",
    date: "2026-05-14",
    readMins: 8,
    featured: true,
    title: { vi: "Viết code như viết văn xuôi", en: "Writing code like prose" },
    excerpt: {
      vi: "Những dòng code tốt nhất tôi từng đọc đều đọc như được viết cho con người, không phải cho máy.",
      en: "The best code I've ever read all reads like it was written for humans, not machines.",
    },
    body: [
      P(
        "Máy tính không quan tâm tên biến của bạn là gì. Nó sẽ chạy `x`, `tmp` và `theMonthlyActiveUserCount` với tốc độ y hệt nhau. Cách đặt tên, vì thế, hoàn toàn là một hành động của lòng tử tế — dành cho người đọc tiếp theo, mà thường chính là bạn của sáu tháng sau.",
        "Computers don't care what you name your variables. They'll run `x`, `tmp`, and `theMonthlyActiveUserCount` at exactly the same speed. Naming, then, is entirely an act of kindness — for the next reader, who is often you, six months from now."
      ),
      H("Cấu trúc là một dạng lễ phép", "Structure is a form of courtesy"),
      P(
        "Một hàm tốt có mở đầu, thân và kết — giống một đoạn văn. Nó làm một việc, làm rõ ràng, rồi dừng lại. Khi tôi thấy mình phải cuộn màn hình để hiểu một hàm, đó thường là dấu hiệu nó đang cố kể quá nhiều câu chuyện cùng lúc.",
        "A good function has a beginning, a middle, and an end — like a paragraph. It does one thing, does it clearly, and then it stops. When I find myself scrolling to understand a function, it's usually a sign it's trying to tell too many stories at once."
      ),
      P(
        "Tôi học được nhiều về lập trình từ việc biên tập bài viết hơn là từ bất kỳ khóa học nào. Cùng một câu hỏi cứ lặp lại: đoạn này có cần ở đây không? Câu này có thể ngắn hơn không? Người đọc có lạc đường ở đâu không?",
        "I learned more about programming from editing essays than from any course. The same questions keep returning: does this belong here? Could this sentence be shorter? Where might the reader get lost?"
      ),
      Q(
        "Chương trình phải được viết để con người đọc, và chỉ tình cờ để máy thực thi.",
        "Programs must be written for people to read, and only incidentally for machines to execute."
      ),
      P(
        "Đó là lý do tôi nghĩ những lập trình viên giỏi nhất cũng là những người viết giỏi. Cả hai nghề đều xoay quanh một việc duy nhất: lấy một mớ hỗn độn trong đầu và sắp xếp nó thành thứ người khác có thể đi theo.",
        "That's why I think the best programmers are also good writers. Both crafts revolve around one thing: taking a mess inside your head and arranging it into something another person can follow."
      ),
    ],
  },
  {
    slug: "ban-lam-viec",
    tag: "life",
    date: "2026-04-30",
    readMins: 4,
    featured: false,
    title: { vi: "Một năm làm việc bên cửa sổ", en: "A year of working by the window" },
    excerpt: {
      vi: "Tôi chuyển bàn làm việc đến cạnh cửa sổ và vô tình thay đổi cả cách mình làm việc.",
      en: "I moved my desk next to the window and accidentally changed how I work.",
    },
    body: [
      P(
        "Mùa xuân năm ngoái tôi dời chiếc bàn từ góc tường ra cạnh cửa sổ. Một thay đổi nhỏ, gần như tầm thường. Nhưng nó đã định hình lại từng ngày của tôi theo cách tôi không ngờ tới.",
        "Last spring I moved my desk from the corner to the window. A small change, almost trivial. But it reshaped my days in ways I didn't expect."
      ),
      P(
        "Ánh sáng tự nhiên đổi màu suốt cả ngày. Buổi sáng nó trong và lạnh, buổi chiều ấm dần lên màu mật ong. Không cần đồng hồ, tôi bắt đầu cảm nhận được thời gian trôi qua màu của bức tường đối diện.",
        "Natural light shifts color throughout the day. In the morning it's clear and cool, by afternoon it warms to honey. Without a clock, I began to feel time passing through the color of the wall across from me."
      ),
      P(
        "Có lẽ năng suất không phải lúc nào cũng đến từ những công cụ tốt hơn. Đôi khi nó chỉ đơn giản là một chỗ ngồi mà bạn không muốn rời đi.",
        "Maybe productivity doesn't always come from better tools. Sometimes it's simply a seat you don't want to leave."
      ),
    ],
  },
  {
    slug: "font-chu",
    tag: "design",
    date: "2026-04-12",
    readMins: 5,
    featured: false,
    title: {
      vi: "Tại sao tôi yêu font đơn cách (monospace)",
      en: "Why I fell for monospace",
    },
    excerpt: {
      vi: "Mỗi ký tự một bề rộng. Một ràng buộc tưởng chừng khô khan lại hóa ra rất thơ.",
      en: "Every character the same width. A constraint that seems dry turns out to be quietly poetic.",
    },
    body: [
      P(
        "Font đơn cách sinh ra từ máy đánh chữ — nơi mỗi phím phải chiếm đúng một khoảng để cơ cấu máy hoạt động. Một giới hạn kỹ thuật thuần túy. Vậy mà nó để lại một thẩm mỹ riêng: ngay ngắn, thành thật, hơi cứng đầu.",
        "Monospace was born from typewriters — where each key had to occupy exactly one slot for the mechanism to work. A purely technical limit. And yet it left behind an aesthetic of its own: orderly, honest, a little stubborn."
      ),
      P(
        "Khi mọi ký tự bằng nhau, các chữ xếp thành cột thẳng tắp. Có một sự thành thật trong đó — không chữ nào được ưu ái hơn chữ nào. Với tôi, đó là một dạng dân chủ của con chữ.",
        "When every character is equal, letters stack into perfect columns. There's an honesty in that — no letter gets favored over another. To me, it's a kind of democracy of type."
      ),
      Q(
        "Ràng buộc không giết chết sáng tạo. Nó cho sáng tạo một hình hài.",
        "Constraints don't kill creativity. They give it a shape."
      ),
    ],
  },
  {
    slug: "doc-cham",
    tag: "writing",
    date: "2026-03-20",
    readMins: 7,
    featured: false,
    title: {
      vi: "Đọc chậm trong thời đại lướt nhanh",
      en: "Slow reading in a fast-scrolling age",
    },
    excerpt: {
      vi: "Tôi bắt đầu đọc lại bằng giấy bút, và phát hiện mình đã quên cách ở lại với một ý tưởng.",
      en: "I started reading on paper again, and realized I'd forgotten how to stay with an idea.",
    },
    body: [
      P(
        "Tôi từng tự hào vì đọc nhanh. Mỗi tuần vài cuốn sách, hàng chục bài báo, vô số mẩu tin. Cho đến khi nhận ra: tôi gần như không nhớ được gì.",
        "I used to be proud of reading fast. A few books a week, dozens of articles, countless snippets. Until I realized: I could barely remember any of it."
      ),
      P(
        "Đọc chậm không phải đọc ít. Nó là cho phép một câu văn được vang lên trọn vẹn trước khi vội sang câu tiếp theo. Là dừng lại, gạch chân, viết bên lề một dấu hỏi.",
        "Slow reading isn't reading less. It's letting a sentence ring out fully before rushing to the next. It's stopping, underlining, scribbling a question in the margin."
      ),
      P(
        "Bút chì là công cụ tư duy bị đánh giá thấp nhất tôi biết. Một dấu gạch chân là một lời hứa rằng bạn sẽ quay lại.",
        "The pencil is the most underrated thinking tool I know. An underline is a promise that you'll return."
      ),
    ],
  },
  {
    slug: "ghi-chu-thang-3",
    tag: "notes",
    date: "2026-03-02",
    readMins: 3,
    featured: false,
    title: { vi: "Ghi chú rời, tháng Ba", en: "Loose notes, March" },
    excerpt: {
      vi: "Vài mảnh suy nghĩ chưa đủ dài để thành một bài viết, nhưng không nỡ vứt đi.",
      en: "A few fragments too short to be essays, but too dear to throw away.",
    },
    body: [
      P(
        "Một thiết kế tốt giống một người chủ nhà tốt: nó dự đoán nhu cầu của bạn trước khi bạn kịp nói ra.",
        "Good design is like a good host: it anticipates your needs before you have to ask."
      ),
      P(
        "Tôi nghi ngờ mọi công cụ hứa hẹn sẽ giúp tôi 'nghĩ nhanh hơn'. Hầu hết suy nghĩ đáng giá của tôi đều đến chậm.",
        "I'm suspicious of any tool that promises to help me 'think faster.' Most of my worthwhile thoughts arrive slowly."
      ),
      P(
        "Định dạng đẹp nhất của một ý tưởng vẫn là một cuộc trò chuyện dài với người mình tin tưởng.",
        "The finest format for an idea is still a long conversation with someone you trust."
      ),
    ],
  },
];
