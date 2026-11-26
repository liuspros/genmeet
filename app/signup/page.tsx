"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, linkWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AppMark, GoogleG } from "@/components/Logos";
import { api, authMessage } from "@/lib/flow";
import { idEmail } from "@/lib/id";

export default function Signup() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setErr("");
    try {
      await api("/api/signup", null, { id, password });
      const { user } = await signInWithEmailAndPassword(auth, idEmail(id), password);
      await linkWithPopup(user, new GoogleAuthProvider());
      await api("/api/link", user);
      router.replace("/join");
    } catch (e) { setErr(authMessage(e) + ((e as { code?: string }).code === "auth/popup-closed-by-user" ? " Sign in with your ID and password to finish." : "")); }
    setBusy(false);
  }

  return (
    <main className="screen">
      <header className="hero"><AppMark /><h1>Create account</h1><p>Enter your student ID and a password, then verify with Google. You will join your courses next.</p></header>
      <label><span className="label">Student ID</span><input className="field" value={id} onChange={(e) => setId(e.target.value)} placeholder="2024/BIO/0142" autoComplete="username" /></label>
      <label><span className="label">Password</span><input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></label>
      <div className="note">Your Gmail will be linked to this ID. Lecturers see which Gmail belongs to each student.</div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn google" onClick={go} disabled={busy || !id || password.length < 6}>{busy ? "Working…" : <><GoogleG />Continue with Google</>}</button>
      <Link className="link" href="/login" style={{ marginTop: "auto" }}>Already have an account? Sign in</Link>
    </main>
  );
}
