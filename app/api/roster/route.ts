import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin";
import { bad, deny, lecturer, normCode, normId, safe } from "@/lib/server";

type L = NonNullable<Awaited<ReturnType<typeof lecturer>>>;
const own = (l: L, c: unknown) => { const code = normCode(c); return l.courses.includes(code) ? code : ""; };

export const GET = safe(async (req: NextRequest) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const course = own(l, new URL(req.url).searchParams.get("course"));
  if (!course) return bad("Choose one of your courses.");
  const s = await getAdminDb().collection(`rosters/${course}/students`).get();
  const students = s.docs
    .map((d) => ({ id: d.id, name: (d.get("name") as string) || "", linked: !!d.get("uid"), email: (d.get("email") as string) || "" }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return NextResponse.json({ code: course, students });
});

// Add students to a course. Existing IDs keep their link.
export const POST = safe(async (req: NextRequest) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const b = await req.json();
  const course = own(l, b.course);
  if (!course) return bad("Choose one of your courses.");
  const db = getAdminDb();
  const batch = db.batch();
  let n = 0;
  for (const s of (b.students || []).slice(0, 400)) {
    const id = normId(s.id);
    if (!id) continue;
    batch.set(db.doc(`rosters/${course}/students/${id}`), { name: String(s.name || "").trim() }, { merge: true });
    n++;
  }
  await batch.commit();
  return NextResponse.json({ added: n });
});

// Reset a student's Google link, or remove them from this course.
export const PATCH = safe(async (req: NextRequest) => {
  const l = await lecturer(req);
  if (!l) return deny();
  const b = await req.json();
  const course = own(l, b.course);
  if (!course) return bad("Choose one of your courses.");
  const db = getAdminDb();
  const ref = db.doc(`rosters/${course}/students/${normId(b.id)}`);
  const snap = await ref.get();
  if (!snap.exists) return bad("Student not found.", 404);
  const uid = snap.get("uid") as string | undefined;
  if (uid) {
    const uref = db.doc(`users/${uid}`);
    const u = (await uref.get()).data();
    if (u) {
      const left = (u.courses ?? (u.classCode ? [u.classCode] : [])).filter((c: string) => c !== course);
      await uref.update({ courses: left });
    }
  }
  if (b.remove) await ref.delete();
  else await ref.update({ uid: null, email: null });
  return NextResponse.json({ ok: true });
});
