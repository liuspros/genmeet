"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { collection, documentId, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useUser } from "./useUser";

type Last = { text: string; name: string; t: number };
type Meta = {
  titles: Record<string, string>; last: Record<string, Last | undefined>; unread: Record<string, number>;
  total: number; freshClasses: boolean; markChatSeen: (code: string) => void; markClassesSeen: () => void;
};
const Ctx = createContext<Meta>({ titles: {}, last: {}, unread: {}, total: 0, freshClasses: false, markChatSeen: () => {}, markClassesSeen: () => {} });
export const useMeta = () => useContext(Ctx);

const key = (n: string, c = "") => `seen-${n}:${c}`;
function getSeen(n: string, c = "") {
  try { const v = localStorage.getItem(key(n, c)); if (v) return Number(v); localStorage.setItem(key(n, c), String(Date.now())); } catch {}
  return Date.now();
}
const put = (n: string, c: string, t: number) => { try { localStorage.setItem(key(n, c), String(t)); } catch {} };

// One set of listeners for the whole app: course titles, latest messages, unread counts and new classes.
export function MetaProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useUser();
  const ck = (profile?.courses ?? []).join(",");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [msgs, setMsgs] = useState<Record<string, { uid: string; name: string; text: string; t: number }[]>>({});
  const [meets, setMeets] = useState<{ by: string; at: number }[]>([]);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [seenCls, setSeenCls] = useState(0);

  useEffect(() => {
    if (!user || !ck) { setTitles({}); setMsgs({}); setMeets([]); return; }
    const codes = ck.split(",");
    setSeen(Object.fromEntries(codes.map((c) => [c, getSeen("chat", c)])));
    setSeenCls(getSeen("classes"));
    const offs = codes.map((c) => onSnapshot(query(collection(db, "groups", c, "messages"), orderBy("t", "desc"), limit(20)),
      (s) => setMsgs((m) => ({ ...m, [c]: s.docs.map((d) => ({ uid: d.get("uid"), name: d.get("name"), text: d.get("text"), t: d.get("t")?.toMillis?.() ?? Date.now() })) })), () => {}));
    offs.push(onSnapshot(query(collection(db, "meetings"), where("classCode", "in", codes.slice(0, 30))),
      (s) => setMeets(s.docs.map((d) => ({ by: d.get("hostUid") || "", at: d.get("createdAt") || 0 }))), () => {}));
    offs.push(onSnapshot(query(collection(db, "groups"), where(documentId(), "in", codes.slice(0, 30))),
      (s) => setTitles(Object.fromEntries(s.docs.map((d) => [d.id, (d.get("name") as string) || d.id]))), () => {}));
    return () => offs.forEach((f) => f());
  }, [user, ck]);

  const markChatSeen = useCallback((c: string) => { const t = Date.now(); put("chat", c, t); setSeen((s) => ({ ...s, [c]: t })); }, []);
  const markClassesSeen = useCallback(() => { const t = Date.now(); put("classes", "", t); setSeenCls(t); }, []);

  const value = useMemo<Meta>(() => {
    const last = Object.fromEntries(Object.entries(msgs).map(([c, l]) => [c, l[0] ? { text: l[0].text, name: l[0].name, t: l[0].t } : undefined]));
    const unread = Object.fromEntries(Object.entries(msgs).map(([c, l]) => [c, l.filter((m) => m.uid !== user?.uid && m.t > (seen[c] ?? Infinity)).length]));
    const total = Object.values(unread).reduce((a, b) => a + b, 0);
    const freshClasses = meets.some((m) => m.by !== user?.uid && m.at > seenCls);
    return { titles, last, unread, total, freshClasses, markChatSeen, markClassesSeen };
  }, [titles, msgs, meets, seen, seenCls, user, markChatSeen, markClassesSeen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
