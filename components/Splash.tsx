"use client";
import { useEffect, useState } from "react";

export default function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("splash")) { setShow(false); return; }
      sessionStorage.setItem("splash", "1");
    } catch {}
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="splash" role="status" aria-label="GenMeet is loading">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <rect x="16" y="30" width="64" height="48" rx="16" fill="#fff" />
        <path d="M30 76L28 95L50 78Z" fill="#fff" />
        <path d="M82 48L102 36Q106 34 106 39V69Q106 74 102 72L82 60Z" fill="#fff" />
        <path d="M48 44C42 40 34 40 30 41V66C34 65 42 65 48 69C54 65 62 65 66 66V41C62 40 54 40 48 44Z" fill="#111113" />
        <path d="M48 45V68" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <div className="splash-name">GenMeet</div>
      <div className="splash-tag">Your class, one tap away.</div>
    </div>
  );
}
