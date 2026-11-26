import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/admin";
import { idEmail, normId } from "@/lib/id";
import { safe } from "@/lib/server";

// Creates the ID + password account. The Gmail is linked afterwards, in the app.
export const POST = safe(async (req) => {
  const { id, password } = await req.json();
  const sid = normId(id);
  if (!sid || sid.length > 40) return NextResponse.json({ error: "Enter your student ID." }, { status: 400 });
  if (String(password || "").length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  try {
    const u = await getAdminAuth().createUser({ email: idEmail(sid), password: String(password) });
    await getAdminAuth().setCustomUserClaims(u.uid, { studentId: sid });
  } catch (e) {
    if ((e as { code?: string }).code === "auth/email-already-exists") return NextResponse.json({ error: "This ID already has an account. Sign in instead." }, { status: 409 });
    throw e;
  }
  return NextResponse.json({ ok: true });
});
