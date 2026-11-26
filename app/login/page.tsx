"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function Login() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [classCode, setClassCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setErr("");
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      if ((await getDoc(doc(db, "users", user.uid))).exists()) { router.replace("/"); return; }
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ studentId, classCode }),
      });
      let data: { error?: string } = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) { setErr(data.error || "Server error. Check the Vercel logs for /api/claim."); await auth.signOut(); }
      else router.replace("/");
    } catch (e) {
      const c = (e as { code?: string }).code;
      setErr(c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request" ? "Google sign-in was cancelled. Try again."
        : c === "auth/unauthorized-domain" ? "Add this site’s domain to Firebase, Authentication, Authorized domains."
        : "Sign-in failed. Try again.");
    }
    setBusy(false);
  }

  return (
    <main className="screen">
      <h1 style={{ marginTop: 28 }}>Verify your student ID</h1>
      <p>Your lecturer added your ID to the class roster. Enter it, then link your Google account.</p>
      <label><span className="label">Student ID</span><input className="field" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="2024/BIO/0142" autoComplete="off" /></label>
      <label><span className="label">Class code</span><input className="field" value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="BIO-4821" autoComplete="off" /></label>
      <div className="note">New here? Enter your ID and class code once to link your Gmail. Already signed up? Just tap Continue with Google.</div>
      {err && <div className="err" role="alert">{err}</div>}
      <div style={{ marginTop: "auto" }}><button className="btn" style={{ width: "100%" }} onClick={go} disabled={busy}>{busy ? "Checking…" : "Continue with Google"}</button></div>
    </main>
  );
}
