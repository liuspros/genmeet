"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AppMark, GoogleG } from "@/components/Logos";
import { authMessage, nextRoute } from "@/lib/flow";
import { idEmail } from "@/lib/id";

export default function Login() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function withId() {
    setBusy(true); setErr("");
    try { const { user } = await signInWithEmailAndPassword(auth, idEmail(id), password); router.replace(await nextRoute(user)); }
    catch (e) { setErr(authMessage(e)); }
    setBusy(false);
  }
  async function withGoogle() {
    setBusy(true); setErr("");
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      try { router.replace(await nextRoute(user)); }
      catch (e) { await user.delete().catch(() => auth.signOut()); throw e; }
    } catch (e) { setErr(authMessage(e)); }
    setBusy(false);
  }


  return (
    <main className="screen">
      <header className="hero"><AppMark /><h1>Sign in</h1><p>Use your student ID or staff ID and password, or your linked Google account.</p></header>
      <label><span className="label">ID</span><input className="field" value={id} onChange={(e) => setId(e.target.value)} placeholder="2024/BIO/0142" autoComplete="username" /></label>
      <label><span className="label">Password</span><input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" onClick={withId} disabled={busy || !id || !password}>Sign in</button>
      <div className="or">or</div>
      <button className="btn google" onClick={withGoogle} disabled={busy}><GoogleG />Continue with Google</button>
      <Link className="link" href="/signup" style={{ marginTop: "auto" }}>New student? Create an account</Link>
    </main>
  );
}
