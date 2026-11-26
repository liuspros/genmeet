"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";
import { fmt, until } from "@/lib/time";

type M = { id: string; title: string; start: number; end: number; link: string };
const TABS = ["Live", "Upcoming", "Ended"] as const;

export default function Home() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [ms, setMs] = useState<M[]>([]);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<(typeof TABS)[number] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!profile) return;
    return onSnapshot(query(collection(db, "meetings"), where("classCode", "==", profile.classCode)),
      (s) => { setErr(""); setMs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<M, "id">) }))); },
      () => setErr("Could not load classes. Check that the Firestore rules are published."));
  }, [profile]);

  const live = ms.filter((m) => m.start <= now && now < m.end);
  const up = ms.filter((m) => m.start > now).sort((a, b) => a.start - b.start);
  const ended = ms.filter((m) => m.end <= now).sort((a, b) => b.start - a.start);
  const active = tab ?? (live.length ? "Live" : "Upcoming");
  const list = active === "Live" ? live : active === "Upcoming" ? up : ended;
  const next = live[0] ?? up[0];
  if (!profile) return null;

  return (
    <main className="screen">
      {next && <div className="top"><div style={{ flex: 1 }}><b>{next.title}</b><span>{until(next.start, now)}</span></div></div>}
      <p style={{ marginTop: 6 }}>{profile.name}</p>
      <h1 style={{ marginTop: -8 }}>Class Schedule</h1>
      {profile.role === "lecturer" && <Link className="btn blue" href="/schedule/new">Schedule class</Link>}
      <div className="tabs" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={active === t} className={`tab ${active === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}{t === "Live" && live.length ? ` (${live.length})` : ""}</button>)}</div>
      {err && <div className="err" role="alert">{err}</div>}
      {!err && list.length === 0 && <p>{active === "Live" ? "No class is live right now." : "No classes here yet."}</p>}
      {list.map((m) => (
        <article key={m.id} className={`card ${live.includes(m) ? "live" : ""}`}>
          <span className="chip">{fmt(m.start)}</span>
          <h2>{m.title}</h2>
          <p>{until(m.start, now)}</p>
          {now >= m.start - 15 * 60000 && now < m.end && <a className="btn blue" href={m.link} target="_blank" rel="noopener noreferrer">Join in Google Meet</a>}
        </article>
      ))}
    </main>
  );
}
