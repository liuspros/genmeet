"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AppMark, GoogleG } from "@/components/Logos";
import { api, authMessage, nextRoute } from "@/lib/flow";

export default function LinkGoogle() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    const user = auth.currentUser;
    if (!user) { router.replace("/login"); return; }
    setBusy(true); setErr("");
    try { await linkWithPopup(user, new GoogleAuthProvider()); await api("/api/link", user); router.replace(await nextRoute(user)); }
    catch (e) { setErr(authMessage(e)); }
    setBusy(false);
  }
  return (
    <main className="screen">
      <header className="hero"><AppMark /><h1>Verify with Google</h1><p>Link your Gmail to your ID to finish setting up your account.</p></header>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn google" onClick={go} disabled={busy}><GoogleG />Continue with Google</button>
    </main>
  );
}
