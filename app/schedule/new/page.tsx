"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";

export default function NewClass() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [mins, setMins] = useState("60");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      // Lecturers grant Meet access only here, so students are never asked for it.
      const p = new GoogleAuthProvider();
      p.addScope("https://www.googleapis.com/auth/meetings.space.created");
      const r = await signInWithPopup(auth, p);
      const googleToken = GoogleAuthProvider.credentialFromResult(r)?.accessToken;
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await r.user.getIdToken()}` },
        body: JSON.stringify({ title, start: new Date(when).getTime(), minutes: Number(mins), googleToken }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.replace("/");
    } catch (x) { setErr(x instanceof Error ? x.message : "Something went wrong."); }
    setBusy(false);
  }
  if (!profile) return null;
  if (profile.role !== "lecturer") return <main className="screen"><h1>Schedule class</h1><p>Only lecturers can schedule classes.</p></main>;

  return (
    <form className="screen" onSubmit={submit}>
      <h1>Schedule class</h1>
      <label><span className="label">Title</span><input className="field" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 6 · Meiosis" /></label>
      <label><span className="label">Start</span><input className="field" required type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
      <label><span className="label">Duration</span>
        <select className="field" value={mins} onChange={(e) => setMins(e.target.value)}>
          <option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option>
        </select></label>
      <div className="note">The Meet link is created on the Google account you sign in with.</div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn blue" disabled={busy}>{busy ? "Creating…" : "Schedule class"}</button>
    </form>
  );
}
