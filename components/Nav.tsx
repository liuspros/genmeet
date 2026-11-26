"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/lib/useUser";

const ICON = {
  Classes: "M4 5c3-1.5 5-1.5 8 0 3-1.5 5-1.5 8 0v13c-3-1.5-5-1.5-8 0-3-1.5-5-1.5-8 0zM12 5v13",
  Chats: "M4 6a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3H10l-5 4v-4a3 3 0 01-1-2z",
  Roster: "M16 11a3 3 0 100-6 3 3 0 000 6zM8 12a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5",
  Me: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6",
};
type Seen = { chat: number; classes: number };

export default function Nav() {
  const path = usePathname();
  const { user, profile } = useUser();
  const code = profile?.classCode;
  const [msgs, setMsgs] = useState<{ uid: string; t: number }[]>([]);
  const [meets, setMeets] = useState<{ by: string; at: number }[]>([]);
  const [seen, setSeen] = useState<Seen>({ chat: Date.now(), classes: Date.now() });

  // Visiting a tab marks it as seen. First ever visit starts from now.
  useEffect(() => {
    if (!code) return;
    const k = (n: string) => `seen-${n}:${code}`;
    const read = (n: string) => { const v = localStorage.getItem(k(n)); if (v) return Number(v); localStorage.setItem(k(n), String(Date.now())); return Date.now(); };
    const next: Seen = { chat: read("chat"), classes: read("classes") };
    if (path === "/chat") { next.chat = Date.now(); localStorage.setItem(k("chat"), String(next.chat)); }
    if (path === "/") { next.classes = Date.now(); localStorage.setItem(k("classes"), String(next.classes)); }
    setSeen(next);
  }, [path, code, msgs.length, meets.length]);

  useEffect(() => {
    if (!user || !code) return;
    const a = onSnapshot(query(collection(db, "groups", code, "messages"), orderBy("t", "desc"), limit(50)),
      (s) => setMsgs(s.docs.map((d) => ({ uid: d.get("uid"), t: d.get("t")?.toMillis?.() ?? Date.now() }))), () => {});
    const b = onSnapshot(query(collection(db, "meetings"), where("classCode", "==", code)),
      (s) => setMeets(s.docs.map((d) => ({ by: d.get("hostUid") || "", at: d.get("createdAt") || 0 }))), () => {});
    return () => { a(); b(); };
  }, [user, code]);

  if (["/login", "/signup", "/link", "/join"].includes(path) || !profile || !user) return null;
  const unread = msgs.filter((m) => m.uid !== user.uid && m.t > seen.chat).length;
  const fresh = meets.some((m) => m.by !== user.uid && m.at > seen.classes);
  const tabs: [string, keyof typeof ICON][] = [["/", "Classes"], ["/chat", "Chats"]];
  if (profile.role === "lecturer") tabs.push(["/admin", "Roster"]);
  tabs.push(["/me", "Me"]);

  return (
    <nav className="nav" aria-label="Main">
      {tabs.map(([href, label]) => (
        <Link key={href} href={href} className={path === href ? "on" : ""} aria-current={path === href ? "page" : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[label]} /></svg>
          <span>{label}</span>
          {label === "Chats" && unread > 0 && <b className="badge" aria-label={`${unread} unread`}>{unread > 9 ? "9+" : unread}</b>}
          {label === "Classes" && fresh && path !== "/" && <i className="dot" aria-label="New class" />}
        </Link>
      ))}
    </nav>
  );
}
