import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { notifyClass, notifyUsers } from "@/lib/notify";
import { bad, safe } from "@/lib/server";

export const maxDuration = 30;
const MIN = 60000;

// Marks a flag on the class once, so two overlapping ticks never send the same alert twice.
async function claim(ref: FirebaseFirestore.DocumentReference, field: string) {
  return getAdminDb().runTransaction(async (t) => {
    const s = await t.get(ref);
    if (s.get(field)) return false;
    t.update(ref, { [field]: Date.now() });
    return true;
  });
}

// Called every minute by a free pinger (cron-job.org). Sends the 15-minute reminder and the class-start alert,
// and delivers queued test alerts. It reads the class time when it runs, so rescheduling and cancelling just work.
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return bad("CRON_SECRET is not set on the server.", 503);
  const given = req.headers.get("authorization")?.replace("Bearer ", "") || new URL(req.url).searchParams.get("key");
  if (given !== secret) return bad("Not allowed.", 401);

  const db = getAdminDb();
  const now = Date.now();
  let reminders = 0, starts = 0, tests = 0;

  const snap = await db.collection("meetings").where("start", ">=", now - 10 * MIN).where("start", "<=", now + 16 * MIN).get();
  for (const d of snap.docs) {
    const m = d.data();
    if (m.status === "cancelled") continue;
    const start = Number(m.start);
    const course = String(m.classCode);

    if (!m.remindedAt && start - 15 * MIN <= now + 30000 && start > now) {
      if (await claim(d.ref, "remindedAt")) {
        // A class made less than 15 minutes ahead already got the "new class" alert, so skip the reminder.
        if (Number(m.createdAt || 0) < start - 15 * MIN) {
          await notifyClass(course, { title: "Class in 15 minutes", body: String(m.title), tag: `reminder-${d.id}`, extra: { kind: "info" } });
          reminders++;
        }
      }
    }
    if (!m.startedPush && start <= now + 30000) {
      if (await claim(d.ref, "startedPush")) {
        await notifyClass(course, { title: "Class is starting", body: String(m.title), tag: `start-${d.id}`, extra: { kind: "class-start", link: String(m.link), course } });
        starts++;
      }
    }
  }

  const due = await db.collection("tests").where("at", "<=", now).get();
  for (const t of due.docs) {
    await t.ref.delete();
    await notifyUsers([String(t.get("uid"))], { title: "Class is starting", body: "Test class", extra: { kind: "class-start", link: "https://meet.google.com/landing", course: "TEST" } });
    tests++;
  }
  return NextResponse.json({ ok: true, checked: snap.size, reminders, starts, tests });
}

export const GET = safe(run);
export const POST = safe(run);
