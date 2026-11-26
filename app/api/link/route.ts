import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/admin";
import { authed, safe } from "@/lib/server";

// Creates the profile once a Google account is linked. Lecturers are recognised by their Gmail.
export const POST = safe(async (req) => {
  const u = await authed(req);
  if (!u) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const ref = getAdminDb().doc(`users/${u.uid}`);
  if ((await ref.get()).exists) return NextResponse.json({ ok: true });

  const rec = await getAdminAuth().getUser(u.uid);
  const g = rec.providerData.find((p) => p.providerId === "google.com");
  if (!g) return NextResponse.json({ error: "Verify with Google first." }, { status: 400 });
  const email = (g.email || "").toLowerCase();

  const lecturers = (process.env.LECTURER_EMAILS || "").toLowerCase().split(",").map((s) => s.trim());
  if (lecturers.includes(email)) {
    await ref.set({ role: "lecturer", name: g.displayName || email, googleEmail: email, classCode: "" });
    return NextResponse.json({ role: "lecturer" });
  }
  const sid = (rec.customClaims as { studentId?: string } | undefined)?.studentId;
  if (!sid) return NextResponse.json({ error: "This Gmail is not linked to a student ID. Sign up first." }, { status: 403 });
  await ref.set({ role: "student", name: g.displayName || sid, studentId: sid, googleEmail: email, classCode: "" });
  return NextResponse.json({ role: "student" });
});
