import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "./admin";

// Returns the signed-in lecturer and their class code, or null.
export async function lecturer(req: NextRequest) {
  const t = req.headers.get("authorization")?.replace("Bearer ", "");
  const u = t ? await getAdminAuth().verifyIdToken(t).catch(() => null) : null;
  if (!u) return null;
  const me = (await getAdminDb().doc(`users/${u.uid}`).get()).data();
  return me && me.role === "lecturer" ? { uid: u.uid, code: me.classCode as string } : null;
}
export const deny = () => NextResponse.json({ error: "Lecturers only." }, { status: 403 });
export { normId } from "./id";

// Wraps a route so a crash returns readable JSON instead of an empty 500.
export const safe = (fn: (req: NextRequest) => Promise<NextResponse>) => async (req: NextRequest) => {
  try { return await fn(req); }
  catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server problem: " + (e instanceof Error ? e.message : "unknown error") }, { status: 500 });
  }
};

export async function authed(req: NextRequest) {
  const t = req.headers.get("authorization")?.replace("Bearer ", "");
  return t ? await getAdminAuth().verifyIdToken(t).catch(() => null) : null;
}
