import { getAdminDb, getAdminMessaging } from "./admin";

// Sends a push alert to every registered device of everyone in a course. Dead tokens are cleaned up.
export async function notifyClass(code: string, p: { title: string; body: string; url?: string; tag?: string; skipUid?: string; extra?: Record<string, string> }) {
  const db = getAdminDb();
  const [a, b] = await Promise.all([
    db.collection("users").where("courses", "array-contains", code).get(),
    db.collection("users").where("classCode", "==", code).get(),
  ]);
  const uids = Array.from(new Set([...a.docs, ...b.docs].map((d) => d.id))).filter((u) => u !== p.skipUid);
  const docs: { id: string; ref: FirebaseFirestore.DocumentReference }[] = [];
  for (let i = 0; i < uids.length; i += 30) {
    const s = await db.collection("tokens").where("uid", "in", uids.slice(i, i + 30)).get();
    s.docs.forEach((d) => docs.push({ id: d.id, ref: d.ref }));
  }
  if (!docs.length) return;
  const res = await getAdminMessaging().sendEachForMulticast({
    tokens: docs.map((d) => d.id),
    data: { title: p.title, body: p.body, url: p.url || "/", tag: p.tag || "genmeet", ...(p.extra || {}) },
    android: { priority: "high" },
    webpush: { headers: { Urgency: "high", TTL: "900" } },
  });
  await Promise.all(res.responses.map((r, i) =>
    !r.success && /not-registered|invalid-registration|invalid-argument/.test(r.error?.code || "") ? docs[i].ref.delete() : null));
}
