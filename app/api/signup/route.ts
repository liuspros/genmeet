import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/admin";
import { idEmail, normId } from "@/lib/id";
import { bad, safe } from "@/lib/server";

// Creates the ID + password account and an empty student profile. Courses and Google come later, inside the app.
export const POST = safe(async (req) => {
  const { id, password } = await req.json();
  const sid = normId(id);
  if (!sid || sid.length > 40) return bad("Enter your student ID.");
  if (String(password || "").length < 6) return bad("Password must be at least 6 characters.");
  try {
    const u = await getAdminAuth().createUser({ email: idEmail(sid), password: String(password) });
    await getAdminAuth().setCustomUserClaims(u.uid, { studentId: sid });
    await getAdminDb().doc(`users/${u.uid}`).set({ role: "student", name: sid, studentId: sid, courses: [], createdAt: Date.now() });
  } catch (e) {
    if ((e as { code?: string }).code === "auth/email-already-exists") return bad("This ID already has an account. Sign in instead.", 409);
    throw e;
  }
  return NextResponse.json({ ok: true });
});
