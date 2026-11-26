"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";
import { useMeta } from "@/lib/meta";
import { MeetIcon } from "@/components/Logos";
import PushPrompt from "@/components/PushPrompt";
import { countdown, hm, when } from "@/lib/time";

type M = { id: string; classCode: string; title: string; start: number; end: number; link: string; status?: string; lecturerName?: string };
const TABS = ["Live", "Upcoming", "Ended", "Cancelled"] as const;

export default function Home() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const { markClassesSeen } = useMeta();
  const [ms, setMs] = useState<M[]>([]);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<(typeof TABS)[number] | null>(null);
  const [err, setErr] = useState("");
  const ck = (profile?.courses ?? []).join(",");

  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { markClassesSeen(); }, [markClassesSeen, ms.length]);
  useEffect(() => {
    if (!ck) { setMs([]); return; }
    return onSnapshot(query(collection(db, "meetings"), where("classCode", "in", ck.split(",").slice(0, 30))),
      (s) => { setErr(""); setMs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<M, "id">) }))); },
      () => setErr("Could not load classes. Check that the Firestore rules are published."));
  }, [ck]);

  async function cancel(m: M) {
    if (!window.confirm(`Cancel “${m.title}”? Everyone in the course will be told.`)) return;
    const res = await fetch("/api/meetings", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser?.getIdToken()}` }, body: JSON.stringify({ id: m.id }) });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error || "Could not cancel the class.");
  }
  if (!profile) return null;

  const ok = ms.filter((m) => m.status !== "cancelled");
  const live = ok.filter((m) => m.start <= now && now < m.end);
  const up = ok.filter((m) => m.start > now).sort((a, b) => a.start - b.start);
  const ended = ok.filter((m) => m.end <= now).sort((a, b) => b.start - a.start);
  const cancelled = ms.filter((m) => m.status === "cancelled").sort((a, b) => b.start - a.start);
  const active = tab ?? (live.length ? "Live" : "Upcoming");
  const list = { Live: live, Upcoming: up, Ended: ended, Cancelled: cancelled }[active];
  const next = live[0] ?? up[0];
  const lecturer = profile.role === "lecturer";

  return (
    <main className="screen">
      <header className="hero">
        <span className="eyebrow">Next class</span>
        <h1>{next ? next.title : "Nothing scheduled"}</h1>
        <div className="hero-row">
          <p>{next ? next.lecturerName || next.classCode : ck ? "You are all caught up." : "Register your courses to begin."}</p>
          {next && <b className="count" aria-label={live.includes(next) ? "Live now" : "Starts in"}>{live.includes(next) ? "Live" : countdown(next.start - now)}</b>}
        </div>
      </header>
      {lecturer && <Link className="btn blue meet" href="/schedule/new"><span className="chipicon"><MeetIcon /></span>Create meeting</Link>}
      {!ck && <div className="card"><h2>Register your courses</h2><p>{lecturer ? "Create a course to start scheduling classes." : "Choose the courses you take. Your lecturer must have added your matric number."}</p><Link className="btn blue" href="/courses">{lecturer ? "Create a course" : "Register courses"}</Link></div>}
      <PushPrompt />
      <div className="tabs" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={active === t} className={`tab ${active === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>
      {err && <div className="err" role="alert">{err}</div>}
      {!err && ck && list.length === 0 && <p>{active === "Live" ? "No class is live right now." : `No ${active.toLowerCase()} classes.`}</p>}
      {list.map((m) => {
        const isLive = live.includes(m);
        const joinable = active !== "Cancelled" && now >= m.start - 15 * 60000 && now < m.end;
        return (
          <article key={m.id} className="card">
            <h2>{m.title}</h2>
            <p>{when(m.start, m.end, now)}</p>
            <div className="card-row">
              <span className="sub">{m.lecturerName || m.classCode}{m.lecturerName ? ` · ${m.classCode}` : ""}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {lecturer && active !== "Cancelled" && m.end > now && <button className="mini out" onClick={() => cancel(m)}>Cancel</button>}
                {joinable ? <a className="btn join" href={m.link} target="_blank" rel="noopener noreferrer"><MeetIcon size={18} />Join</a>
                  : <span className="timepill">{active === "Cancelled" ? "Cancelled" : isLive || m.end <= now ? "Ended" : hm(m.start)}</span>}
              </span>
            </div>
          </article>
        );
      })}
    </main>
  );
}
