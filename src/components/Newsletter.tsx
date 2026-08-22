// Newsletter.tsx — subscribe form island. Posts the email to /api/subscribe.
import { useState } from "react";

interface Strings {
  title: string;
  desc: string;
  placeholder: string;
  subscribe: string;
  subscribed: string;
}

export default function Newsletter({ strings }: { strings: Strings }) {
  const [done, setDone] = useState(false);
  const [val, setVal] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) return;
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val.trim() }),
      });
    } catch {
      /* swallow — still show success to the user */
    }
    setDone(true);
  };

  return (
    <section className="news" id="newsletter">
      <div className="news-head">
        <span className="kicker">{strings.title}</span>
        <p className="news-desc">{strings.desc}</p>
      </div>
      <form className="news-form" onSubmit={submit}>
        <input
          type="email"
          required
          className="news-input"
          placeholder={strings.placeholder}
          value={val}
          disabled={done}
          onChange={(e) => setVal(e.target.value)}
        />
        <button type="submit" className="news-btn" disabled={done}>
          {done ? strings.subscribed : strings.subscribe}
        </button>
      </form>
    </section>
  );
}
