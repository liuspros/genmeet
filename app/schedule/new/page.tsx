"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";
import { MeetIcon } from "@/components/Logos";

export default function NewClass() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [mins, setMins] = useState("60");
  const [access, setAccess] = useState("OPEN");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); else if (profile && !profile.classCode) router.replace("/join"); }, [loading, user, profile, router]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      // Lecturers grant Meet access only here, so students are never asked for it.
      const p = new GoogleAuthProvider();
      p.addScope("https://www.googleapis.com/auth/meetings.space.created");
      p.addScope("email");
      const r = await signInWithPopup(auth, p);
      const googleToken = GoogleAuthProvider.credentialFromResult(r)?.accessToken;
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await r.user.getIdToken()}` },
        body: JSON.stringify({ title, start: new Date(when).getTime(), minutes: Number(mins), access, googleToken }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.replace("/");
    } catch (x) { setErr(x instanceof Error ? x.message : "Something went wrong."); }
    setBusy(false);
  }
  if (!profile) return null;
  if (profile.role !== "lecturer") return <main className="screen"><h1>Schedule class</h1><p>Only lecturers can schedule classes.</p></main>;

  return (
    <form className="screen narrow" onSubmit={submit}>
      <header className="hero"><h1>Create meeting</h1><p>The Meet link is created on the Google account you sign in with.</p></header>
      <label><span className="label">Title</span><input className="field" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 6 · Meiosis" /></label>
      <label><span className="label">Start</span><input className="field" required type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
      <label><span className="label">Duration</span>
        <select className="field" value={mins} onChange={(e) => setMins(e.target.value)}>
          <option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
        </select></label>
      <label><span className="label">Who can join</span><select className="field" value={access} onChange={(e) => setAccess(e.target.value)}><option value="OPEN">Anyone with the link joins directly</option><option value="TRUSTED">I admit students from a lobby</option></select></label>
      {access === "OPEN" && <div className="note">Anyone who has the link can enter. Share it only inside your class.</div>}
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn blue meet" disabled={busy}><span className="chipicon"><MeetIcon /></span>{busy ? "Creating…" : "Create meeting"}</button>
    </form>
  );
}
