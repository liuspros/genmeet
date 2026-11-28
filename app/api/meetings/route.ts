import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { bad, deny, lecturer, normCode, safe } from "@/lib/server";
import { notifyClass } from "@/lib/notify";

// Lecturer creates a Google Meet space with their own Google access token and saves the class.
export const POST = safe(async (req) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const db = getAdminDb();
  const b = await req.json();
  const course = normCode(b.course);
  if (!l.courses.includes(course)) return bad("Choose one of your courses.");
  const title = String(b.title || "").trim();
  const start = Number(b.start);
  const minutes = Number(b.minutes);
  const access = b.access === "TRUSTED" ? "TRUSTED" : "OPEN";
  if (!title || title.length > 120) return bad("The title must be 1 to 120 characters.");
  if (!Number.isFinite(start) || start < Date.now() - 5 * 60000) return bad("Pick a start time in the future.");
  if (start > Date.now() + 365 * 86400000) return bad("That start time is too far ahead.");
  if (![30, 45, 60, 90, 120].includes(minutes)) return bad("Choose a valid duration.");
  if (!b.googleToken) return bad("Google sign-in is required.");

  // The Google token must belong to the Gmail linked to this lecturer's profile.
  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(b.googleToken)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!info?.email || String(info.email).toLowerCase() !== String(l.me.googleEmail || "").toLowerCase())
    return bad("Sign in with the Google account linked to your profile.", 403);

  const dup = await db.collection("meetings").where("classCode", "==", course).where("start", "==", start).where("title", "==", title).limit(1).get();
  if (!dup.empty) return NextResponse.json({ ok: true, duplicate: true });

  const r = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: { Authorization: `Bearer ${b.googleToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ config: { accessType: access } }),
  });
  if (!r.ok) {
    await db.collection("audit").add({ type: "meeting.create.failed", uid: l.uid, course, status: r.status, at: Date.now() });
    return bad("Google would not create the meeting. Check that the Meet API is enabled and you allowed access.", 502);
  }
  const space = await r.json();
  try {
    await db.collection("meetings").add({
      classCode: course, title, start, end: start + minutes * 60000, link: space.meetingUri, access,
      status: "scheduled", hostUid: l.uid, host: String(info.email), lecturerName: l.me.name, createdAt: Date.now(),
    });
  } catch (e) {
    await db.collection("audit").add({ type: "meeting.save.failed", uid: l.uid, course, link: space.meetingUri, at: Date.now() });
    throw e;
  }
  await db.collection("audit").add({ type: "meeting.create", uid: l.uid, course, at: Date.now() });
  await notifyClass(course, { title: "New class scheduled", body: title, url: "/", tag: "meeting", skipUid: l.uid }).catch((e) => console.error(e));
  return NextResponse.json({ ok: true });
});

// Cancel a class and tell the course.
export const PATCH = safe(async (req) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const { id } = await req.json();
  if (!/^[A-Za-z0-9]{10,40}$/.test(String(id))) return bad("Bad class id.");
  const ref = getAdminDb().doc(`meetings/${id}`);
  const snap = await ref.get();
  if (!snap.exists || !l.courses.includes(snap.get("classCode"))) return bad("Class not found.", 404);
  await ref.update({ status: "cancelled" });
  await getAdminDb().collection("audit").add({ type: "meeting.cancel", uid: l.uid, id, at: Date.now() });
  await notifyClass(snap.get("classCode"), { title: "Class cancelled", body: snap.get("title"), url: "/", tag: "meeting", skipUid: l.uid }).catch((e) => console.error(e));
  return NextResponse.json({ ok: true });
});
