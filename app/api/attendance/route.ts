import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/admin";
import { bad, deny, lecturer, normId, safe } from "@/lib/server";
import { gget, tokenEmail } from "@/lib/google";
import { Interval, judge, normName } from "@/lib/attendance";

export const maxDuration = 60;

type L = NonNullable<Awaited<ReturnType<typeof lecturer>>>;
const STATUSES = ["present", "late", "partial", "absent"];

async function meetingOf(l: L, id: unknown) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(String(id))) return null;
  const snap = await getAdminDb().doc(`meetings/${id}`).get();
  if (!snap.exists || !l.courses.includes(snap.get("classCode"))) return null;
  return snap.data()!;
}

// Stored attendance for one class.
export const GET = safe(async (req: NextRequest) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const id = new URL(req.url).searchParams.get("meetingId");
  if (!(await meetingOf(l, id))) return bad("Class not found.", 404);
  const db = getAdminDb();
  const [sum, rows] = await Promise.all([db.doc(`attendance/${id}`).get(), db.collection("attendanceRows").where("meetingId", "==", id).get()]);
  const list = rows.docs.map((d) => d.data()).sort((a, b) => String(a.name || a.studentId).localeCompare(String(b.name || b.studentId)));
  return NextResponse.json({ synced: sum.exists, summary: sum.data() || null, rows: list });
});

// Pull who joined from Google Meet and work out each student's status. Manual corrections are kept.
export const POST = safe(async (req: NextRequest) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const b = await req.json();
  const m = await meetingOf(l, b.meetingId);
  if (!m) return bad("Class not found.", 404);
  const token = String(b.googleToken || "");
  if (!token) return bad("Google sign-in is required.");
  if ((await tokenEmail(token)) !== String(l.me.googleEmail || "").toLowerCase()) return bad("Sign in with the Google account linked to your profile.", 403);

  const db = getAdminDb();
  const start = Number(m.start), end = Number(m.end), course = String(m.classCode);
  const code = String(m.link).split("?")[0].split("/").pop() || "";
  const recs: { name: string; startTime: string }[] = (await gget(`https://meet.googleapis.com/v2/conferenceRecords?filter=${encodeURIComponent(`space.meeting_code="${code}"`)}`, token)).conferenceRecords || [];
  const rel = recs.filter((r) => { const t = Date.parse(r.startTime); return t >= start - 3600000 && t <= end + 7200000; });
  if (!rel.length) return bad("Meet has no record of this class yet. Try again a few minutes after it ends, and make sure the class was held.", 404);
  const refStart = Math.min(...rel.map((r) => Date.parse(r.startTime)));

  // Everyone who joined, with the time ranges they were in the room.
  type P = { key: string; gid: string; name: string; iv: Interval[] };
  const people = new Map<string, P>();
  for (const r of rel) {
    let pt = "";
    do {
      const d = await gget(`https://meet.googleapis.com/v2/${r.name}/participants?pageSize=250${pt ? `&pageToken=${pt}` : ""}`, token);
      pt = d.nextPageToken || "";
      const parts: { name: string; signedinUser?: { user: string; displayName: string }; anonymousUser?: { displayName: string }; phoneUser?: { displayName: string } }[] = d.participants || [];
      for (let i = 0; i < parts.length; i += 10) {
        await Promise.all(parts.slice(i, i + 10).map(async (p) => {
          const gid = p.signedinUser?.user?.replace("users/", "") || "";
          const name = p.signedinUser?.displayName || p.anonymousUser?.displayName || p.phoneUser?.displayName || "Guest";
          const key = gid || `anon:${name}`;
          const ss = await gget(`https://meet.googleapis.com/v2/${p.name}/participantSessions?pageSize=250`, token);
          const iv: Interval[] = (ss.participantSessions || []).map((s: { startTime: string; endTime?: string }) => [Date.parse(s.startTime), s.endTime ? Date.parse(s.endTime) : end] as Interval);
          const cur = people.get(key) || { key, gid, name, iv: [] };
          cur.iv.push(...iv);
          people.set(key, cur);
        }));
      }
    } while (pt);
  }

  // Match to the roster: Google account id first, then an exact (unique) name match.
  const roster = (await db.collection(`rosters/${course}/students`).get()).docs.map((d) => ({ id: d.id, name: (d.get("name") as string) || "", uid: (d.get("uid") as string) || "" }));
  const gidToStudent = new Map<string, string>();
  const withUid = roster.filter((r) => r.uid);
  for (let i = 0; i < withUid.length; i += 100) {
    const res = await getAdminAuth().getUsers(withUid.slice(i, i + 100).map((r) => ({ uid: r.uid })));
    for (const u of res.users) {
      const g = u.providerData.find((p) => p.providerId === "google.com");
      const sid = withUid.find((r) => r.uid === u.uid)?.id;
      if (g && sid) gidToStudent.set(g.uid, sid);
    }
  }
  const byName = new Map<string, string[]>();
  for (const r of roster) { const k = normName(r.name); if (k) byName.set(k, [...(byName.get(k) || []), r.id]); }

  const ivByStudent = new Map<string, { iv: Interval[]; by: string }>();
  const unmatched: { name: string; minutes: number }[] = [];
  for (const p of people.values()) {
    let sid = p.gid ? gidToStudent.get(p.gid) : undefined;
    let by = "google";
    if (!sid) { const c = byName.get(normName(p.name)); if (c && c.length === 1) { sid = c[0]; by = "name"; } }
    if (!sid) { unmatched.push({ name: p.name, minutes: Math.round(p.iv.reduce((a, [s, e]) => a + (e - s), 0) / 60000) }); continue; }
    const cur = ivByStudent.get(sid) || { iv: [], by };
    cur.iv.push(...p.iv);
    ivByStudent.set(sid, cur);
  }

  const existing = new Map((await db.collection("attendanceRows").where("meetingId", "==", b.meetingId).get()).docs.map((d) => [d.id, d.data()] as [string, FirebaseFirestore.DocumentData]));
  const batch = db.batch();
  for (const r of roster) {
    const j = judge(ivByStudent.get(r.id)?.iv || [], start, end, refStart);
    const id = `${b.meetingId}__${r.id}`;
    const old = existing.get(id);
    batch.set(db.doc(`attendanceRows/${id}`), {
      meetingId: b.meetingId, course, studentId: r.id, name: r.name,
      computedStatus: j.status, status: old?.override ? old.status : j.status, override: !!old?.override, note: old?.note || "",
      minutes: j.minutes, firstJoin: j.first || null, lastLeave: j.last || null, matchedBy: ivByStudent.get(r.id)?.by || "", updatedAt: Date.now(),
    });
  }
  batch.set(db.doc(`attendance/${b.meetingId}`), { course, syncedAt: Date.now(), syncedBy: l.uid, conferences: rel.length, unmatched });
  await batch.commit();
  return NextResponse.json({ ok: true, conferences: rel.length, students: roster.length, unmatched: unmatched.length });
});

// Manual correction. status "auto" goes back to the computed value.
export const PATCH = safe(async (req: NextRequest) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const b = await req.json();
  if (!(await meetingOf(l, b.meetingId))) return bad("Class not found.", 404);
  const ref = getAdminDb().doc(`attendanceRows/${b.meetingId}__${normId(b.studentId)}`);
  const snap = await ref.get();
  if (!snap.exists) return bad("Pull attendance from Meet first.", 404);
  if (b.status === "auto") await ref.update({ status: snap.get("computedStatus"), override: false, note: "" });
  else if (STATUSES.includes(b.status)) await ref.update({ status: b.status, override: true, note: String(b.note || "").slice(0, 200), correctedBy: l.uid, correctedAt: Date.now() });
  else return bad("Choose present, late, partial or absent.");
  return NextResponse.json({ ok: true });
});
