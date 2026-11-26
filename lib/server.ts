import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "./admin";

export { normId } from "./id";
export const normCode = (s: unknown) => String(s ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
export const courseList = (me: { courses?: string[]; classCode?: string }): string[] => me.courses ?? (me.classCode ? [me.classCode] : []);

export async function authed(req: NextRequest) {
  const t = req.headers.get("authorization")?.replace("Bearer ", "");
  return t ? await getAdminAuth().verifyIdToken(t).catch(() => null) : null;
}

// The signed-in lecturer with their courses, or null.
export async function lecturer(req: NextRequest) {
  const u = await authed(req);
  if (!u) return null;
  const me = (await getAdminDb().doc(`users/${u.uid}`).get()).data();
  if (!me || me.role !== "lecturer") return null;
  return { uid: u.uid, courses: courseList(me), me };
}
export const deny = () => NextResponse.json({ error: "Lecturers only." }, { status: 403 });
export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Wraps a route so a crash returns readable JSON instead of an empty 500.
export const safe = (fn: (req: NextRequest) => Promise<NextResponse>) => async (req: NextRequest) => {
  try { return await fn(req); }
  catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server problem: " + (e instanceof Error ? e.message : "unknown error") }, { status: 500 });
  }
};
