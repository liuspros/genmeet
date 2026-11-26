import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { authed, bad, safe } from "@/lib/server";

// Remembers a device token for the signed-in user.
export const POST = safe(async (req) => {
  const u = await authed(req);
  if (!u) return bad("Please sign in again.", 401);
  const { token } = await req.json();
  if (typeof token !== "string" || token.length < 20) return bad("Bad token.");
  await getAdminDb().doc(`tokens/${token}`).set({ uid: u.uid, at: Date.now() });
  return NextResponse.json({ ok: true });
});
