"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

export type Profile = { role: "student" | "lecturer"; name: string; studentId?: string; googleEmail?: string; courses: string[] };

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let unsub = () => {};
    const off = onAuthStateChanged(auth, (u) => {
      unsub(); setUser(u);
      if (!u) { setProfile(null); setLoading(false); return; }
      unsub = onSnapshot(doc(db, "users", u.uid),
        (s) => { const d = s.data(); setProfile(d ? ({ ...d, courses: d.courses ?? (d.classCode ? [d.classCode] : []) } as Profile) : null); setLoading(false); },
        () => { setProfile(null); setLoading(false); });
    });
    return () => { off(); unsub(); };
  }, []);
  const hasGoogle = !!user?.providerData.some((p) => p.providerId === "google.com");
  return { user, profile, loading, hasGoogle };
}
