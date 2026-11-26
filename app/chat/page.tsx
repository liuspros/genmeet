"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";
import { MeetIcon } from "@/components/Logos";
import { fmt, until } from "@/lib/time";

type Msg = { id: string; uid: string; name: string; text: string };
type M = { id: string; title: string; start: number; end: number; link: string };

export default function Chat() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ms, setMs] = useState<M[]>([]);
  const [now, setNow] = useState(Date.now());
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); else if (profile && !profile.classCode) router.replace("/join"); }, [loading, user, profile, router]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!profile?.classCode) return;
    const bad = () => setErr("Could not load this chat. Check that the Firestore rules are published.");
    const a = onSnapshot(query(collection(db, "groups", profile.classCode, "messages"), orderBy("t")),
      (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Msg, "id">) }))), bad);
    const b = onSnapshot(query(collection(db, "meetings"), where("classCode", "==", profile.classCode)),
      (s) => setMs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<M, "id">) }))), bad);
    return () => { a(); b(); };
  }, [profile]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || !user || !profile) return;
    setText("");
    await addDoc(collection(db, "groups", profile.classCode, "messages"), { uid: user.uid, name: profile.name, text: v, t: serverTimestamp() });
  }
  if (!profile || !user) return null;
  const next = ms.filter((m) => m.end > now).sort((a, b) => a.start - b.start)[0];

  return (
    <main className="screen chat">
      <header className="hero"><p>Class chat</p><h1>{profile.classCode}</h1></header>
      {next && (
        <article className="card live">
          <span className="chip">{fmt(next.start)}</span>
          <h2>{next.title}</h2><p>{until(next.start, now)}</p>
          {now >= next.start - 15 * 60000 && <a className="btn blue meet" href={next.link} target="_blank" rel="noopener noreferrer"><span className="chipicon"><MeetIcon /></span>Join in Google Meet</a>}
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
        <button className="btn blue" aria-label="Send">↑</button>
      </form>
    </main>
  );
}
