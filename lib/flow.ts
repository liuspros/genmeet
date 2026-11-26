"use client";
import { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function api(path: string, user: User | null, body?: unknown, method = "POST") {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${await user.getIdToken(true)}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Server error. Check the Vercel logs.");
  return d;
}

// After sign-in: make sure a profile exists (Google-first accounts get one here).
export async function nextRoute(user: User) {
  const s = await getDoc(doc(db, "users", user.uid));
  if (!s.exists()) await api("/api/link", user);
  return "/";
}

export function authMessage(e: unknown) {
  const c = (e as { code?: string }).code;
  if (e instanceof TypeError || c === "auth/network-request-failed") return "No internet connection. Check your network and try again.";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "Google step was cancelled. Try again.";
  if (c === "auth/credential-already-in-use") return "This Gmail is already linked to another ID.";
  if (c === "auth/invalid-credential" || c === "auth/user-not-found" || c === "auth/wrong-password") return "Wrong ID or password.";
  if (c === "auth/operation-not-allowed") return "Turn on Email/Password sign-in in Firebase Authentication.";
  if (c === "auth/unauthorized-domain") return "Add this site’s domain to Firebase, Authentication, Authorized domains.";
  return e instanceof Error ? e.message : "Something went wrong. Try again.";
}
