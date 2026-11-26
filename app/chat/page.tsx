"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";

type Msg = { id: string; uid: string; name: string; text: string };

export default function Chat() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);
  useEffect(() => {
    if (!profile) return;
    return onSnapshot(query(collection(db, "groups", profile.classCode, "messages"), orderBy("t")),
      (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Msg, "id">) }))));
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

  return (
    <main className="screen chat">
      <h1>{profile.classCode}</h1>
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
