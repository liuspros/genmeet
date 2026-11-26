import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { bad, deny, lecturer, normCode, safe } from "@/lib/server";

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
