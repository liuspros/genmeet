import { NextRequest, NextResponse } from "next/server";
import { safe } from "@/lib/server";
import { getAdminAuth, getAdminDb } from "@/lib/admin";

// Links a Google account to a roster student ID (or registers an approved lecturer).
export const POST = safe(async (req: NextRequest) => {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const u = token ? await getAdminAuth().verifyIdToken(token).catch(() => null) : null;
  if (!u) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await req.json();
  const code = String(body.classCode || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Enter your class code." }, { status: 400 });

  const lecturers = (process.env.LECTURER_EMAILS || "").toLowerCase().split(",").map((s) => s.trim());
  if (u.email && lecturers.includes(u.email.toLowerCase())) {
    await getAdminDb().doc(`groups/${code}`).set({ name: code }, { merge: true });
    await getAdminDb().doc(`users/${u.uid}`).set({ role: "lecturer", classCode: code, name: u.name || u.email });
    return NextResponse.json({ role: "lecturer" });
  }

  const id = String(body.studentId || "").trim().toUpperCase().replace(/\//g, "-");
  if (!id) return NextResponse.json({ error: "Enter your student ID." }, { status: 400 });
  const ref = getAdminDb().doc(`rosters/${code}/students/${id}`);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "That ID is not on this class roster." }, { status: 403 });
  const r = snap.data()!;
  if (r.uid && r.uid !== u.uid) return NextResponse.json({ error: "This ID is already linked to another Google account. Ask your lecturer to reset it." }, { status: 409 });

  await ref.update({ uid: u.uid, email: u.email || null });
  await getAdminDb().doc(`users/${u.uid}`).set({ role: "student", classCode: code, studentId: id, name: r.name || u.name || "Student" });
  return NextResponse.json({ role: "student" });
});
