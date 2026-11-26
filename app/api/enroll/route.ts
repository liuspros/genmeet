import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { authed, safe } from "@/lib/server";

// Student: join a course, only if a lecturer has added their ID to it.
// Lecturer: create or reopen a course with this code.
export const POST = safe(async (req) => {
  const u = await authed(req);
  if (!u) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const db = getAdminDb();
  const meRef = db.doc(`users/${u.uid}`);
  const me = (await meRef.get()).data();
  if (!me) return NextResponse.json({ error: "Finish verifying with Google first." }, { status: 400 });
  const code = String((await req.json()).code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!code) return NextResponse.json({ error: "Enter the course code." }, { status: 400 });

  if (me.role === "lecturer") {
    const g = db.doc(`groups/${code}`);
    const cur = (await g.get()).data();
    if (cur?.ownerUid && cur.ownerUid !== u.uid) return NextResponse.json({ error: "That course code is already taken." }, { status: 409 });
    await g.set({ name: code, ownerUid: u.uid }, { merge: true });
    await meRef.update({ classCode: code });
    return NextResponse.json({ ok: true });
  }

  const ref = db.doc(`rosters/${code}/students/${me.studentId}`);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Your ID has not been added to this course yet. Ask your lecturer to add it, then try again." }, { status: 403 });
  const r = snap.data()!;
  if (r.uid && r.uid !== u.uid) return NextResponse.json({ error: "This ID is already linked to another account. Ask your lecturer to reset it." }, { status: 409 });
  await ref.update({ uid: u.uid, email: me.googleEmail || null });
  await meRef.update({ classCode: code, ...(r.name ? { name: r.name } : {}) });
  return NextResponse.json({ ok: true });
});
