"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";
import { useMeta } from "@/lib/meta";
import { MeetIcon } from "@/components/Logos";
import { countdown, when } from "@/lib/time";

type Msg = { id: string; uid: string; name: string; text: string };
type M = { id: string; title: string; start: number; end: number; link: string; status?: string };

export default function Chat({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code);
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const { titles, markChatSeen } = useMeta();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ms, setMs] = useState<M[]>([]);
  const [now, setNow] = useState(Date.now());
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const member = !!profile?.courses.includes(code);

  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); else if (profile && !member) router.replace("/chat"); }, [loading, user, profile, member, router]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!member) return;
    const bad = () => setErr("Could not load this chat. Check that the Firestore rules are published.");
    const a = onSnapshot(query(collection(db, "groups", code, "messages"), orderBy("t")),
      (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Msg, "id">) }))), bad);
    const b = onSnapshot(query(collection(db, "meetings"), where("classCode", "==", code)),
      (s) => setMs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<M, "id">) }))), bad);
    return () => { a(); b(); };
  }, [member, code]);
  useEffect(() => { if (member) markChatSeen(code); end.current?.scrollIntoView({ block: "end" }); }, [msgs, member, code, markChatSeen]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || !user || !profile) return;
    setText("");
    await addDoc(collection(db, "groups", code, "messages"), { uid: user.uid, name: profile.name, text: v, t: serverTimestamp() });
  }
  if (!profile || !user || !member) return null;
  const next = ms.filter((m) => m.status !== "cancelled" && m.end > now).sort((a, b) => a.start - b.start)[0];
  const isLive = next && next.start <= now;

  return (
    <main className="screen chat">
      <header className="hero">
        <Link href="/chat" className="back">← All chats</Link>
        <h1>{code}</h1>
        {titles[code] && titles[code] !== code && <p>{titles[code]}</p>}
      </header>
      {next && (
        <article className="card">
          <h2>{next.title}</h2><p>{when(next.start, next.end, now)}</p>
          <div className="card-row"><span className="sub">{isLive ? "Live now" : `Starts in ${countdown(next.start - now)}`}</span>
            {now >= next.start - 15 * 60000 && <a className="btn join" href={next.link} target="_blank" rel="noopener noreferrer"><MeetIcon size={18} />Join</a>}</div>
        </article>
      )}
      {err && <div className="err" role="alert">{err}</div>}
      {!err && msgs.length === 0 && <p>No messages yet. Say hello to your class.</p>}
      {msgs.map((m) => (
        <div key={m.id} className={`msg ${m.uid === user.uid ? "me" : ""}`}>
          {m.uid !== user.uid && <b className="who">{m.name}</b>}{m.text}
        </div>
      ))}
      <div ref={end} />
      <form className="composer" onSubmit={send}>
        <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" aria-label="Message" />
        <button className="btn" aria-label="Send">↑</button>
      </form>
    </main>
  );
}
