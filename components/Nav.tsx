"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/useUser";

const BOOK = "M4 5c3-1.5 5-1.5 8 0 3-1.5 5-1.5 8 0v13c-3-1.5-5-1.5-8 0-3-1.5-5-1.5-8 0zM12 5v13";
const CHAT = "M4 6a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3H10l-5 4v-4a3 3 0 01-1-2z";
const PLUS = "M12 5v14M5 12h14";

export default function Nav() {
  const path = usePathname();
  const { profile } = useUser();
  if (path === "/login" || !profile) return null;
  const items: [string, string, string][] = [["/", "Classes", BOOK], ["/chat", "Chats", CHAT]];
  if (profile.role === "lecturer") items.push(["/schedule/new", "Schedule class", PLUS]);
  return (
    <nav className="nav" aria-label="Main">
      {items.map(([href, label, d]) => (
        <Link key={href} href={href} aria-label={label} className={path === href ? "on" : ""}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
        </Link>
      ))}
    </nav>
  );
}
