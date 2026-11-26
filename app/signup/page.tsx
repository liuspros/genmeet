"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AppMark } from "@/components/Logos";
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
      await signInWithEmailAndPassword(auth, idEmail(id), password);
      router.replace("/");
    } catch (e) { setErr(authMessage(e)); }
    setBusy(false);
  }

  return (
    <main className="screen narrow">
      <header className="hero"><AppMark /><h1>Create account</h1><p>Just your student ID and a password. You register courses and link Google inside the app.</p></header>
      <label><span className="label">Student ID</span><input className="field" value={id} onChange={(e) => setId(e.target.value)} placeholder="2024/BIO/0142" autoComplete="username" /></label>
      <label><span className="label">Password</span><input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" onClick={go} disabled={busy || !id || password.length < 6}>{busy ? "Creating…" : "Create account"}</button>
      <Link className="link" href="/login" style={{ marginTop: "auto" }}>Already have an account? Sign in</Link>
    </main>
  );
}
