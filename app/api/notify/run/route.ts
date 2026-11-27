import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { getAdminDb } from "@/lib/admin";
import { notifyClass } from "@/lib/notify";
import { bad, safe } from "@/lib/server";

// Called by QStash at the scheduled time. Cancelled classes are skipped.
export const POST = safe(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("upstash-signature") || "";
  const valid = await new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
  }).verify({ signature, body }).catch(() => false);
  if (!valid) return bad("Bad signature.", 401);

  const { meetingId, kind } = JSON.parse(body);
  if (!/^[A-Za-z0-9]{10,40}$/.test(String(meetingId))) return bad("Bad meeting id.");
  const snap = await getAdminDb().doc(`meetings/${meetingId}`).get();
  if (!snap.exists || snap.get("status") === "cancelled") return NextResponse.json({ ok: true, skipped: true });
  const title = snap.get("title") as string;
  const course = snap.get("classCode") as string;

  if (kind === "reminder") {
    await notifyClass(course, { title: "Class in 15 minutes", body: title, tag: `reminder-${meetingId}`, extra: { kind: "info" } });
  } else if (kind === "start") {
    await notifyClass(course, { title: "Class is starting", body: title, tag: `start-${meetingId}`, extra: { kind: "class-start", link: String(snap.get("link")), course } });
  }
  return NextResponse.json({ ok: true });
});
