import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/admin";

// Lecturer creates a Google Meet space with their own Google access token and saves the class.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const u = token ? await adminAuth.verifyIdToken(token).catch(() => null) : null;
  if (!u) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const me = (await adminDb.doc(`users/${u.uid}`).get()).data();
  if (!me || me.role !== "lecturer") return NextResponse.json({ error: "Only lecturers can schedule classes." }, { status: 403 });

  const { title, start, minutes, googleToken } = await req.json();
  const startMs = Number(start);
  if (!String(title || "").trim() || !startMs || !googleToken) return NextResponse.json({ error: "Fill in the title and start time." }, { status: 400 });

  const r = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ config: { accessType: "OPEN" } }),
  });
  if (!r.ok) return NextResponse.json({ error: "Google would not create the meeting. Check that the Meet API is enabled and you allowed access." }, { status: 502 });
  const space = await r.json();

  await adminDb.collection("meetings").add({
    classCode: me.classCode, title: String(title).trim(), start: startMs,
    end: startMs + Number(minutes || 60) * 60000, link: space.meetingUri, host: u.email || "", createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true });
}
