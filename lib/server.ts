import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "./admin";

// Returns the signed-in lecturer and their class code, or null.
export async function lecturer(req: NextRequest) {
  const t = req.headers.get("authorization")?.replace("Bearer ", "");
  const u = t ? await adminAuth.verifyIdToken(t).catch(() => null) : null;
  if (!u) return null;
  const me = (await adminDb.doc(`users/${u.uid}`).get()).data();
  return me && me.role === "lecturer" ? { uid: u.uid, code: me.classCode as string } : null;
}
export const deny = () => NextResponse.json({ error: "Lecturers only." }, { status: 403 });
export const normId = (s: unknown) => String(s ?? "").trim().toUpperCase().replace(/\//g, "-");
