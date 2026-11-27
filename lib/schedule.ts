// Queues the reminder (15 minutes before) and the class-start alert with Upstash QStash.
export async function scheduleMeetingPushes(meetingId: string, start: number) {
  const token = process.env.QSTASH_TOKEN;
  const base = process.env.APP_URL;
  if (!token || !base) { console.warn("QStash is not configured, so reminders were skipped."); return; }
  const jobs: [string, number][] = [["reminder", start - 15 * 60000], ["start", start]];
  for (const [kind, at] of jobs) {
    if (at < Date.now() + 5000) continue;
    if (at - Date.now() > 7 * 86400000 - 60000) continue; // free plan delay limit
    const r = await fetch(`https://qstash.upstash.io/v2/publish/${base}/api/notify/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Upstash-Not-Before": String(Math.floor(at / 1000)) },
      body: JSON.stringify({ meetingId, kind }),
    });
    if (!r.ok) console.error("QStash publish failed", r.status, await r.text());
  }
}
