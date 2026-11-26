import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { authed, bad, courseList, normCode, safe } from "@/lib/server";

// A student registers for a course, only if a lecturer has added their ID to that course.
export const POST = safe(async (req) => {
  const u = await authed(req);
  if (!u) return bad("Please sign in again.", 401);
  const db = getAdminDb();
  const meRef = db.doc(`users/${u.uid}`);
  const me = (await meRef.get()).data();
  if (!me || me.role !== "student") return bad("Only students register for courses here.");
  const code = normCode((await req.json()).code);
  if (!code) return bad("Choose a course.");
  if (!(await db.doc(`groups/${code}`).get()).exists) return bad("That course does not exist.", 404);

  const ref = db.doc(`rosters/${code}/students/${me.studentId}`);
  const snap = await ref.get();
  if (!snap.exists) return bad("Your matric number has not been added to this course yet. Ask your lecturer to add it, then try again.", 403);
  const r = snap.data()!;
  if (r.uid && r.uid !== u.uid) return bad("This ID is already linked to another account. Ask your lecturer to reset it.", 409);

  await ref.update({ uid: u.uid, email: me.googleEmail || null });
  const courses = Array.from(new Set([...courseList(me), code]));
  await meRef.update({ courses, ...(r.name && me.name === me.studentId ? { name: r.name } : {}) });
  return NextResponse.json({ ok: true });
});
