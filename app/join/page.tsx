"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/flow";
import { useUser } from "@/lib/useUser";

export default function Join() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);
  if (!user || !profile) return null;
  const lecturer = profile.role === "lecturer";

  async function go() {
    setBusy(true); setErr("");
    try { await api("/api/enroll", user, { code }); router.replace("/"); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy(false);
  }
  return (
    <main className="screen narrow">
      <header className="hero"><h1>{lecturer ? "Set up your course" : "Join your course"}</h1><p>{lecturer ? "Choose a code for your course. Students will use it to join once you add their IDs." : "Enter the course code from your lecturer. Your lecturer must have added your student ID first."}</p></header>
      <label><span className="label">Course code</span><input className="field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="BIO-4821" autoComplete="off" /></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn blue" onClick={go} disabled={busy || !code.trim()}>{lecturer ? "Create course" : "Join course"}</button>
      <button className="btn ghost" style={{ height: 52 }} onClick={async () => { await signOut(auth); router.replace("/login"); }}>Sign out</button>
    </main>
  );
}
