"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import { useMeta } from "@/lib/meta";
import { hm } from "@/lib/time";

export default function Chats() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const { titles, last, unread } = useMeta();
  useEffect(() => { if (!loading && (!user || !profile)) router.replace("/login"); }, [loading, user, profile, router]);
  if (!profile) return null;
  return (
    <main className="screen">
      <header className="hero"><span className="eyebrow">Messages</span><h1>Chats</h1></header>
      {profile.courses.length === 0 && <div className="card"><h2>No chats yet</h2><p>Register a course and its chat appears here.</p><Link className="btn blue" href="/courses">Register courses</Link></div>}
      {profile.courses.map((c) => {
        const l = last[c];
        return (
          <Link key={c} href={`/chat/${c}`} className="card chatrow">
            <div className="avatar" aria-hidden="true">{c.slice(0, 3)}</div>
            <div className="meta"><b>{c}{titles[c] && titles[c] !== c ? ` · ${titles[c]}` : ""}</b><span className="prev">{l ? `${l.name}: ${l.text}` : "No messages yet"}</span></div>
            <div className="side">{l && <span>{hm(l.t)}</span>}{(unread[c] ?? 0) > 0 && <span className="unread" aria-label={`${unread[c]} unread`}>{unread[c]}</span>}</div>
          </Link>
        );
      })}
    </main>
  );
}
