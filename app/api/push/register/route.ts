import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { authed, safe } from "@/lib/server";

// Remembers a device token for the signed-in user's course.
export const POST = safe(async (req) => {
  const u = await authed(req);
  if (!u) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { token } = await req.json();
  if (typeof token !== "string" || token.length < 20) return NextResponse.json({ error: "Bad token." }, { status: 400 });
  const me = (await getAdminDb().doc(`users/${u.uid}`).get()).data();
  if (!me?.classCode) return NextResponse.json({ ok: true, skipped: true });
  await getAdminDb().doc(`tokens/${token}`).set({ uid: u.uid, classCode: me.classCode, at: Date.now() });
  return NextResponse.json({ ok: true });
});
