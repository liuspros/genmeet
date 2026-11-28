import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { notifyUsers } from "@/lib/notify";
import { authed, bad, safe } from "@/lib/server";

const extra = { kind: "class-start", link: "https://meet.google.com/landing", course: "TEST" };

// Test alert for the caller's own devices.
// { now: true } sends immediately. Otherwise it is queued for the next scheduler tick (about a minute),
// which gives time to lock the phone and also proves the scheduler is running.
export const POST = safe(async (req) => {
  const u = await authed(req);
  if (!u) return bad("Please sign in again.", 401);
  const body = await req.json().catch(() => ({}));
  if (body.now) {
    const devices = await notifyUsers([u.uid], { title: "Class is starting", body: "Test class", extra });
    return NextResponse.json({ scheduled: false, devices });
  }
  await getAdminDb().doc(`tests/${u.uid}`).set({ uid: u.uid, at: Date.now() + 10000 });
  return NextResponse.json({ scheduled: true });
});
