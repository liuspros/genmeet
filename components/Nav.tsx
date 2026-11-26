"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/useUser";
import { useMeta } from "@/lib/meta";

const ICON = {
  Classes: "M4 5c3-1.5 5-1.5 8 0 3-1.5 5-1.5 8 0v13c-3-1.5-5-1.5-8 0-3-1.5-5-1.5-8 0zM12 5v13",
  Chats: "M4 6a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3H10l-5 4v-4a3 3 0 01-1-2z",
  Roster: "M16 11a3 3 0 100-6 3 3 0 000 6zM8 12a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5",
  Me: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6",
};

export default function Nav() {
  const path = usePathname();
  const { user, profile } = useUser();
  const { total, freshClasses } = useMeta();
  if (["/login", "/signup"].includes(path) || !profile || !user) return null;
  const tabs: [string, keyof typeof ICON][] = [["/", "Classes"], ["/chat", "Chats"]];
  if (profile.role === "lecturer") tabs.push(["/admin", "Roster"]);
  tabs.push(["/me", "Me"]);
  return (
    <nav className="nav" aria-label="Main">
      {tabs.map(([href, label]) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[label]} /></svg>
            <span>{label}</span>
            {label === "Chats" && total > 0 && <b className="badge" aria-label={`${total} unread`}>{total > 9 ? "9+" : total}</b>}
            {label === "Classes" && freshClasses && !on && <i className="dot" aria-label="New class" />}
          </Link>
        );
      })}
    </nav>
  );
}
