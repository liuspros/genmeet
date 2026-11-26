import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { deny, lecturer, normId } from "@/lib/server";

export async function GET(req: NextRequest) {
  const l = await lecturer(req);
  if (!l) return deny();
  const s = await adminDb.collection(`rosters/${l.code}/students`).get();
  const students = s.docs
    .map((d) => ({ id: d.id, name: (d.get("name") as string) || "", linked: !!d.get("uid") }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return NextResponse.json({ code: l.code, students });
}

// Add students. Existing IDs keep their Google link.
export async function POST(req: NextRequest) {
  const l = await lecturer(req);
  if (!l) return deny();
  const { students } = await req.json();
  const batch = adminDb.batch();
  let n = 0;
  for (const s of (students || []).slice(0, 400)) {
    const id = normId(s.id);
    if (!id) continue;
    batch.set(adminDb.doc(`rosters/${l.code}/students/${id}`), { name: String(s.name || "").trim() }, { merge: true });
    n++;
  }
  await batch.commit();
  return NextResponse.json({ added: n });
}

// Reset a student's Google link, or remove the student. Either way the old account loses access.
export async function PATCH(req: NextRequest) {
  const l = await lecturer(req);
  if (!l) return deny();
  const { id, remove } = await req.json();
  const ref = adminDb.doc(`rosters/${l.code}/students/${normId(id)}`);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  const uid = snap.get("uid") as string | undefined;
  if (uid) {
    const u = adminDb.doc(`users/${uid}`);
    if ((await u.get()).get("classCode") === l.code) await u.delete();
  }
  if (remove) await ref.delete();
  else await ref.update({ uid: null, email: null });
  return NextResponse.json({ ok: true });
}
