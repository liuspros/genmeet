import { getAdminDb, getAdminMessaging } from "./admin";

// Sends a push alert to every registered device in a class. Dead tokens are cleaned up.
export async function notifyClass(code: string, p: { title: string; body: string; url?: string; tag?: string; skipUid?: string }) {
  const snap = await getAdminDb().collection("tokens").where("classCode", "==", code).get();
  const docs = snap.docs.filter((d) => d.get("uid") !== p.skipUid);
  if (!docs.length) return;
  const res = await getAdminMessaging().sendEachForMulticast({
    tokens: docs.map((d) => d.id),
    data: { title: p.title, body: p.body, url: p.url || "/", tag: p.tag || "genmeet" },
    webpush: { headers: { Urgency: "high", TTL: "900" } },
  });
  await Promise.all(res.responses.map((r, i) =>
    !r.success && /not-registered|invalid-registration|invalid-argument/.test(r.error?.code || "") ? docs[i].ref.delete() : null));
}
