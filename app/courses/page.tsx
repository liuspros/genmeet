"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/flow";
import { useUser } from "@/lib/useUser";
import { useMeta } from "@/lib/meta";

type G = { id: string; name: string };

export default function Courses() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const { titles } = useMeta();
  const [all, setAll] = useState<G[]>([]);
  const [sel, setSel] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);
  useEffect(() => {
    if (!user) return;
    api("/api/courses", user, undefined, "GET").then((d) => setAll(d.courses)).catch(() => {});
  }, [user, msg]);
  if (!profile || !user) return null;
  const lecturer = profile.role === "lecturer";
  const available = all.filter((g) => !profile.courses.includes(g.id));

  async function run(path: string, body: unknown, done: string) {
    setBusy(true); setMsg(null);
    try { await api(path, user, body); setMsg({ ok: true, text: done }); setSel(""); setCode(""); setTitle(""); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." }); }
    setBusy(false);
  }

  return (
    <main className="screen narrow">
      <header className="hero"><span className="eyebrow">{lecturer ? "Your courses" : "Registration"}</span><h1>{lecturer ? "Create a course" : "Register a course"}</h1>
        <p>{lecturer ? "Pick a short code. Add your students’ IDs on the Roster tab." : "You can register once your lecturer has added your matric number."}</p></header>
      {lecturer ? (
        <>
          <label><span className="label">Course code</span><input className="field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSC201" autoComplete="off" /></label>
          <label><span className="label">Title</span><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intro to Databases" autoComplete="off" /></label>
        </>
      ) : (
        <label><span className="label">Course</span>
          <select className="field" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Choose a course</option>
            {available.map((g) => <option key={g.id} value={g.id}>{g.id} · {g.name}</option>)}
          </select></label>
      )}
      {msg && <div className={msg.ok ? "ok" : "err"} role="alert">{msg.text}</div>}
      <button className="btn blue" disabled={busy || (lecturer ? !code.trim() : !sel)}
        onClick={() => lecturer ? run("/api/courses", { code, title }, "Course created.") : run("/api/enroll", { code: sel }, `Registered for ${sel}.`)}>
        {lecturer ? "Create course" : "Register course"}
      </button>
      <h2 style={{ margin: "10px 0 0", fontSize: 18 }}>My courses</h2>
      {profile.courses.length === 0 && <p>None yet.</p>}
      {profile.courses.map((c) => <div key={c} className="row"><b style={{ flex: 1 }}>{c}</b><span className="sub">{titles[c] && titles[c] !== c ? titles[c] : ""}</span></div>)}
    </main>
  );
}
