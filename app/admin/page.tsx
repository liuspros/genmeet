"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";

type S = { id: string; name: string; linked: boolean; email: string };
type Entry = { id: string; name: string };

// One student per line: "ID, Name" (comma or tab). A header line is ignored.
function parse(text: string): Entry[] {
  return text.split(/\r?\n/).map((l) => l.split(/[,\t]/).map((c) => c.trim()))
    .filter((c) => c[0] && !/^(student\s*)?id$/i.test(c[0]))
    .map((c) => ({ id: c[0], name: c[1] || "" }));
}

export default function Admin() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [course, setCourse] = useState("");
  const [rows, setRows] = useState<S[]>([]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const courses = profile?.courses ?? [];

  useEffect(() => { if (!course && courses[0]) setCourse(courses[0]); }, [course, courses]);

  const call = useCallback(async (method: string, body?: unknown) => {
    const res = await fetch(method === "GET" ? `/api/roster?course=${encodeURIComponent(course)}` : "/api/roster", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser?.getIdToken()}` },
      body: body ? JSON.stringify({ ...(body as object), course }) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, [course]);
  const load = useCallback(() => call("GET").then((d) => setRows(d.students)).catch((e) => setMsg(e.message)), [call]);

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.role !== "lecturer") router.replace("/");
    else if (course) load();
  }, [loading, user, profile, router, load, course]);

  async function add(list: Entry[]) {
    if (!list.length) { setMsg("Nothing to add. Write one student per line: ID, Name."); return; }
    setBusy(true); setMsg("");
    try { const d = await call("POST", { students: list }); setMsg(`${d.added} added.`); setText(""); await load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Could not add students."); }
    setBusy(false);
  }
  async function act(s: S, remove: boolean) {
    if (!window.confirm(remove ? `Remove ${s.id} from ${course}?` : `Reset the Google link for ${s.id}? They must register the course again.`)) return;
    try { await call("PATCH", { id: s.id, remove }); await load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Something went wrong."); }
  }
  if (!profile || profile.role !== "lecturer") return null;
  const linked = rows.filter((r) => r.linked).length;

  return (
    <main className="screen narrow">
      <header className="hero"><span className="eyebrow">Class admin</span><h1>Roster</h1><p>{rows.length} IDs · {linked} registered · {rows.length - linked} not yet</p></header>
      {courses.length === 0 ? <div className="card"><h2>No courses yet</h2><p>Create a course first, then add its students.</p><Link className="btn blue" href="/courses">Create a course</Link></div> : (
        <>
          <label><span className="label">Course</span>
            <select className="field" value={course} onChange={(e) => { setRows([]); setCourse(e.target.value); }}>{courses.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label><span className="label">Add students (one per line: ID, Name)</span>
            <textarea className="field area" value={text} onChange={(e) => setText(e.target.value)} placeholder={"2024/BIO/0142, Amaka Obi\n2024/BIO/0147, Tunde Bakare"} /></label>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{ flex: 1 }} disabled={busy} onClick={() => add(parse(text))}>Add to roster</button>
            <label className="btn ghost" style={{ height: 56, cursor: "pointer" }}>Import CSV
              <input type="file" accept=".csv,.txt" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await add(parse(await f.text())); }} /></label>
          </div>
          {msg && <div className="note" role="status">{msg}</div>}
          {rows.map((s) => (
            <div key={s.id} className="row">
              <div style={{ flex: 1, minWidth: 0 }}><b>{s.name || s.id}</b><p style={{ fontSize: 12 }}>{s.id}{s.email ? ` · ${s.email}` : ""}</p></div>
              <span className={`status ${s.linked ? "on" : ""}`}>{s.linked ? "Registered" : "Not yet"}</span>
              {s.linked && <button className="mini" onClick={() => act(s, false)}>Reset</button>}
              <button className="mini out" onClick={() => act(s, true)} aria-label={`Remove ${s.id}`}>Remove</button>
            </div>
          ))}
          {rows.length === 0 && <p>No students yet. Paste a list above or import a CSV.</p>}
        </>
      )}
    </main>
  );
}
