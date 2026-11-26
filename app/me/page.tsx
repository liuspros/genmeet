"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, linkWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api, authMessage } from "@/lib/flow";
import { useUser } from "@/lib/useUser";
import { GoogleG } from "@/components/Logos";

export default function Me() {
  const router = useRouter();
  const { user, profile, loading, hasGoogle } = useUser();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);
  if (!user || !profile) return null;

  async function linkGoogle() {
    setBusy(true); setErr("");
    try { await linkWithPopup(user!, new GoogleAuthProvider()); await api("/api/link", user); }
    catch (e) { setErr(authMessage(e)); }
    setBusy(false);
  }
  const initials = profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const role = profile.role === "lecturer" ? "Lecturer" : "Student";
  const rows: [string, string][] = [["Role", role]];
  if (profile.studentId) rows.push(["Student ID", profile.studentId]);
  rows.push(["Linked Gmail", profile.googleEmail || "Not linked"], ["Courses", String(profile.courses.length)]);

  return (
    <main className="screen narrow">
      <header className="hero"><div className="avatar" aria-hidden="true">{initials}</div><h1>{profile.name}</h1><p>{role}</p></header>
      <div className="card" style={{ gap: 0, padding: "4px 16px" }}>
        {rows.map(([k, v]) => <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>)}
      </div>
      {!hasGoogle && (
        <div className="card">
          <h2>Link your Google account</h2><p>Link your Gmail to your ID so you can also sign in with Google.</p>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn google" onClick={linkGoogle} disabled={busy}><GoogleG />Link Google account</button>
        </div>
      )}
      <Link className="btn ghost" href="/courses">{profile.role === "lecturer" ? "My courses" : "Register or view courses"}</Link>
      <button className="btn blue" onClick={async () => { await signOut(auth); router.replace("/login"); }}>Sign out</button>
    </main>
  );
}
