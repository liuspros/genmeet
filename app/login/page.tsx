"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ studentId, classCode }),
      });
      if (!res.ok) { setErr((await res.json()).error); await auth.signOut(); }
      else router.replace("/");
    } catch { setErr("Google sign-in was cancelled. Try again."); }
    setBusy(false);
  }

  return (
    <main className="screen">
      <h1 style={{ marginTop: 28 }}>Verify your student ID</h1>
      <p>Your lecturer added your ID to the class roster. Enter it, then link your Google account.</p>
      <label><span className="label">Student ID</span><input className="field" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="2024/BIO/0142" autoComplete="off" /></label>
      <label><span className="label">Class code</span><input className="field" value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="BIO-4821" autoComplete="off" /></label>
      <div className="note">Your Gmail will be linked to this ID. Lecturers enter only the class code.</div>
      {err && <div className="err" role="alert">{err}</div>}
      <div style={{ marginTop: "auto" }}><button className="btn" style={{ width: "100%" }} onClick={go} disabled={busy}>{busy ? "Checking…" : "Continue with Google"}</button></div>
    </main>
  );
}
