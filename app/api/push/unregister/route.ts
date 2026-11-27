import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { authed, bad, safe } from "@/lib/server";

// Stops alerts for a device that signed out.
export const POST = safe(async (req) => {
  const u = await authed(req);
  if (!u) return bad("Please sign in again.", 401);
  const { token } = await req.json();
  if (typeof token !== "string" || token.includes("/")) return bad("Bad token.");
  const ref = getAdminDb().doc(`tokens/${token}`);
  const s = await ref.get();
  if (s.exists && s.get("uid") === u.uid) await ref.delete();
  return NextResponse.json({ ok: true });
});
