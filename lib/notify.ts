import { getAdminDb, getAdminMessaging } from "./admin";

type Payload = { title: string; body: string; url?: string; tag?: string; skipUid?: string; extra?: Record<string, string> };

// Sends a push alert to every registered device of the given users. Dead tokens are cleaned up.
export async function notifyUsers(allUids: string[], p: Payload) {
  const db = getAdminDb();
  const uids = Array.from(new Set(allUids)).filter((u) => u !== p.skipUid);
  const docs: { id: string; ref: FirebaseFirestore.DocumentReference }[] = [];
  for (let i = 0; i < uids.length; i += 30) {
    const s = await db.collection("tokens").where("uid", "in", uids.slice(i, i + 30)).get();
    s.docs.forEach((d) => docs.push({ id: d.id, ref: d.ref }));
  }
  if (!docs.length) return 0;
  const res = await getAdminMessaging().sendEachForMulticast({
    tokens: docs.map((d) => d.id),
    data: { title: p.title, body: p.body, url: p.url || "/", tag: p.tag || "genmeet", ...(p.extra || {}) },
    android: { priority: "high" },
    webpush: { headers: { Urgency: "high", TTL: "900" } },
  });
  await Promise.all(res.responses.map((r, i) =>
    !r.success && /not-registered|invalid-registration|invalid-argument/.test(r.error?.code || "") ? docs[i].ref.delete() : null));
  return docs.length;
}

// Everyone in a course.
export async function notifyClass(code: string, p: Payload) {
  const db = getAdminDb();
  const [a, b] = await Promise.all([
    db.collection("users").where("courses", "array-contains", code).get(),
    db.collection("users").where("classCode", "==", code).get(),
  ]);
  return notifyUsers([...a.docs, ...b.docs].map((d) => d.id), p);
}
