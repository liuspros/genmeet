import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/admin";
import { authed, bad, safe } from "@/lib/server";

// Records the linked Gmail. Google-first lecturers get their profile here.
export const POST = safe(async (req) => {
  const u = await authed(req);
  if (!u) return bad("Please sign in again.", 401);
  const ref = getAdminDb().doc(`users/${u.uid}`);
  const rec = await getAdminAuth().getUser(u.uid);
  const g = rec.providerData.find((p) => p.providerId === "google.com");
  if (!g) return bad("Link your Google account first.");
  const email = (g.email || "").toLowerCase();

  if ((await ref.get()).exists) { await ref.update({ googleEmail: email }); return NextResponse.json({ ok: true }); }

  const lecturers = (process.env.LECTURER_EMAILS || "").toLowerCase().split(",").map((s) => s.trim());
  if (lecturers.includes(email)) {
    await ref.set({ role: "lecturer", name: g.displayName || email, googleEmail: email, courses: [] });
    return NextResponse.json({ role: "lecturer" });
  }
  const sid = (rec.customClaims as { studentId?: string } | undefined)?.studentId;
  if (!sid) return bad("This Gmail is not linked to an account. Sign up with your student ID first.", 403);
  await ref.set({ role: "student", name: g.displayName || sid, studentId: sid, googleEmail: email, courses: [] });
  return NextResponse.json({ role: "student" });
});
