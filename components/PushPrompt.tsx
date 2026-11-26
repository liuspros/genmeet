"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/useUser";
import { enablePush, pushSupported } from "@/lib/push";

export default function PushPrompt() {
  const { user } = useUser();
  const [state, setState] = useState<"hidden" | "ask" | "busy">("hidden");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) return;
    pushSupported().then((ok) => {
      if (!ok) return;
      if (Notification.permission === "granted") enablePush(user).catch(() => {}); // keep the device token fresh
      else if (Notification.permission === "default") setState("ask");
    });
  }, [user]);

  if (state === "hidden" || !user) return null;
  async function turnOn() {
    setState("busy"); setErr("");
    try { await enablePush(user!); setState("hidden"); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not turn on alerts."); setState("ask"); }
  }
  return (
    <div className="card">
      <h2>Turn on class alerts</h2>
      <p>Get a notification when a class is scheduled.</p>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn sm" disabled={state === "busy"} onClick={turnOn}>Turn on</button>
    </div>
  );
}
