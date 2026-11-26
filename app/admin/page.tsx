"use client";
import { useCallback, useEffect, useState } from "react";
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
  const [rows, setRows] = useState<S[]>([]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (method: string, body?: unknown) => {
    const res = await fetch("/api/roster", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser?.getIdToken()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, []);
  const load = useCallback(() => call("GET").then((d) => setRows(d.students)).catch((e) => setMsg(e.message)), [call]);

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.role !== "lecturer") router.replace("/");
    else load();
  }, [loading, user, profile, router, load]);

  async function add(list: Entry[]) {
    if (!list.length) { setMsg("Nothing to add. Write one student per line: ID, Name."); return; }
    setBusy(true); setMsg("");
    try { const d = await call("POST", { students: list }); setMsg(`${d.added} added.`); setText(""); await load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Could not add students."); }
    setBusy(false);
  }
  async function act(s: S, remove: boolean) {
    const ok = window.confirm(remove ? `Remove ${s.id} from the roster?` : `Reset the Google link for ${s.id}? They must sign up again.`);
    if (!ok) return;
    try { await call("PATCH", { id: s.id, remove }); await load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Something went wrong."); }
  }
  if (!profile || profile.role !== "lecturer") return null;
  const linked = rows.filter((r) => r.linked).length;

  return (
    <main className="screen">
      <header className="hero"><p>Class admin</p><h1>Roster</h1><p>{rows.length} IDs · {linked} linked · {rows.length - linked} not yet</p></header>
      <div className="card">
        <span className="label" style={{ margin: 0 }}>Class code (share with students)</span>
        <h2 style={{ letterSpacing: 1, fontWeight: 700 }}>{profile.classCode}</h2>
      </div>
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
          <span className={`status ${s.linked ? "on" : ""}`}>{s.linked ? "Linked" : "Not linked"}</span>
          {s.linked && <button className="mini" onClick={() => act(s, false)}>Reset</button>}
          <button className="mini out" onClick={() => act(s, true)} aria-label={`Remove ${s.id}`}>Remove</button>
        </div>
      ))}
      {rows.length === 0 && <p>No students yet. Paste a list above or import a CSV.</p>}
    </main>
  );
}
