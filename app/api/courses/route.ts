import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { authed, bad, deny, lecturer, normCode, safe } from "@/lib/server";

// A lecturer creates a course (or reopens one they own).
export const POST = safe(async (req) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const b = await req.json();
  const code = normCode(b.code);
  const title = String(b.title || "").trim().slice(0, 80);
  if (!/^[A-Z0-9-]{2,20}$/.test(code)) return bad("Use 2 to 20 letters, numbers or dashes for the course code.");
  const db = getAdminDb();
  const g = db.doc(`groups/${code}`);
  const cur = (await g.get()).data();
  if (cur?.ownerUid && cur.ownerUid !== l.uid) return bad("That course code is already taken.", 409);
  await g.set({ name: title || code, ownerUid: l.uid, ownerName: l.me.name }, { merge: true });
  await db.doc(`users/${l.uid}`).update({ courses: Array.from(new Set([...l.courses, code])) });
  return NextResponse.json({ ok: true });
});

// Every course on the platform, for the registration dropdown. Served by the server so it does not depend on Firestore rules.
export const GET = safe(async (req) => {
  const u = await authed(req);
  if (!u) return bad("Please sign in again.", 401);
  const s = await getAdminDb().collection("groups").get();
  const courses = s.docs.map((d) => ({ id: d.id, name: (d.get("name") as string) || d.id })).sort((a, b) => a.id.localeCompare(b.id));
  return NextResponse.json({ courses });
});
