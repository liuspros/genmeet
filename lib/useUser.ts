"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type Profile = { role: "student" | "lecturer"; classCode: string; name: string };

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (u) {
      const s = await getDoc(doc(db, "users", u.uid)).catch(() => null);
      setProfile(s && s.exists() ? (s.data() as Profile) : null);
    } else setProfile(null);
    setLoading(false);
  }), []);
  return { user, profile, loading };
}
