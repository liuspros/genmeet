"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";

export default function Me() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);
  if (!user || !profile) return null;
  const initials = profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const role = profile.role === "lecturer" ? "Lecturer" : "Student";
  const rows: [string, string][] = [["Role", role]];
  if (profile.studentId) rows.push(["Student ID", profile.studentId]);
  rows.push(["Linked Gmail", profile.googleEmail || "Not linked"], ["Course", profile.classCode || "Not joined yet"]);
  return (
    <main className="screen narrow">
      <header className="hero"><div className="avatar" aria-hidden="true">{initials}</div><h1>{profile.name}</h1><p>{role}</p></header>
      <div className="card" style={{ gap: 0, padding: "4px 16px" }}>
        {rows.map(([k, v]) => <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>)}
      </div>
      <button className="btn ghost" style={{ height: 52 }} onClick={async () => { await signOut(auth); router.replace("/login"); }}>Sign out</button>
    </main>
  );
}
